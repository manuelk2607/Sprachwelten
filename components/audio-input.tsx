'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,Scissors,Square,Trash2,Upload} from 'lucide-react';
import {useI18n} from '@/lib/i18n';
import {audioSampleRate,audioSelection,encodeAudioWave,maxAudioSeconds} from '@/lib/audio-format';
type UploadedAudio={id:string;durationMs:number};
type Draft={buffer:AudioBuffer;url:string};
export function AudioInput({onChange,onBusy,disabled=false,required=false,initialId}:{initialId?:string;onChange:(audio:UploadedAudio|null)=>void;onBusy:(busy:boolean)=>void;disabled?:boolean;required?:boolean}){
  const {t}=useI18n();
  const [available,setAvailable]=useState<boolean|null>(null),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[busy,setBusy]=useState(false);
  const [preview,setPreview]=useState(initialId?'/api/audio/'+initialId:''),[error,setError]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[start,setStart]=useState(0),[end,setEnd]=useState(0);
  const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null);
  const audioId=useRef<string|null>(null),previewRef=useRef(''),draftUrl=useRef(''),disposed=useRef(false),uploadController=useRef<AbortController|null>(null),draftPlayer=useRef<HTMLAudioElement>(null);
  const removeStored=(id:string)=>void fetch('/api/audio/'+id,{method:'DELETE',keepalive:true}).catch(()=>{});
  useEffect(()=>{
    disposed.current=false;const controller=new AbortController();
    fetch('/api/audio',{signal:controller.signal}).then(r=>r.json() as Promise<{available:boolean}>).then(data=>{if(!disposed.current)setAvailable(data.available);}).catch(()=>{if(!disposed.current)setAvailable(false);});
    return()=>{disposed.current=true;controller.abort();uploadController.current?.abort();if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(track=>track.stop());if(previewRef.current)URL.revokeObjectURL(previewRef.current);if(draftUrl.current)URL.revokeObjectURL(draftUrl.current);if(audioId.current)removeStored(audioId.current);};
  },[]);
  const clearDraft=()=>{draftPlayer.current?.pause();if(draftUrl.current)URL.revokeObjectURL(draftUrl.current);draftUrl.current='';setDraft(null);};
  const discard=()=>{clearDraft();setError('');onBusy(false);};
  const remove=()=>{if(audioId.current)removeStored(audioId.current);audioId.current=null;onChange(null);if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current='';setPreview('');};
  async function prepare(blob:Blob){
    setBusy(true);onBusy(true);setError('');let context:AudioContext|undefined,prepared=false;
    try{
      if(blob.size>20*1024*1024)throw new Error('Die Audiodatei ist zu groß. Bitte einen kurzen Ausschnitt auswählen.');
      context=new AudioContext();const decoded=await context.decodeAudioData(await blob.arrayBuffer());
      if(!Number.isFinite(decoded.duration)||decoded.duration>300||decoded.duration<0.05)throw new Error('Bitte eine Audiodatei mit maximal 5 Minuten auswählen und auf höchstens 20 Sekunden zuschneiden.');
      if(disposed.current)return;
      clearDraft();const url=URL.createObjectURL(blob);draftUrl.current=url;setDraft({buffer:decoded,url});setStart(0);setEnd(Math.min(maxAudioSeconds,Math.floor(decoded.duration*100)/100));prepared=true;
    }catch(cause){if(!disposed.current)setError(t(cause instanceof Error?cause.message:'Die Aufnahme konnte nicht verarbeitet werden.'));}
    finally{await context?.close();if(!disposed.current){setBusy(false);if(!prepared)onBusy(!!draft);}}
  }
  let selectionError='';if(draft)try{audioSelection(draft.buffer.duration,start,end);}catch(cause){selectionError=(cause as Error).message;}
  async function applyTrim(){
    if(!draft||selectionError)return;
    setBusy(true);onBusy(true);setError('');draftPlayer.current?.pause();
    try{
      const selection=audioSelection(draft.buffer.duration,start,end),offline=new OfflineAudioContext(1,selection.samples,audioSampleRate),source=offline.createBufferSource();
      source.buffer=draft.buffer;source.connect(offline.destination);source.start(0,selection.start,selection.duration);const rendered=await offline.startRendering();
      if(disposed.current)return;
      const wave=new Blob([encodeAudioWave(rendered.getChannelData(0))],{type:'audio/wav'}),controller=new AbortController();uploadController.current=controller;
      const response=await fetch('/api/audio',{method:'POST',headers:{'Content-Type':'audio/wav'},body:wave,signal:controller.signal}),result=await response.json() as {audio:UploadedAudio;error?:string};
      if(!response.ok)throw new Error(result.error);if(disposed.current){removeStored(result.audio.id);return;}
      remove();audioId.current=result.audio.id;onChange(result.audio);const url=URL.createObjectURL(wave);previewRef.current=url;setPreview(url);clearDraft();onBusy(false);
    }catch(cause){if(!disposed.current&&(cause as Error).name!=='AbortError')setError(t(cause instanceof Error?cause.message:'Die Aufnahme konnte nicht verarbeitet werden.'));}
    finally{if(!disposed.current)setBusy(false);}
  }
  async function editExisting(){
    if(!preview)return;setBusy(true);onBusy(true);setError('');
    try{const response=await fetch(preview);if(!response.ok)throw new Error('Die Aufnahme konnte nicht geladen werden.');await prepare(await response.blob());}
    catch(cause){setError(t((cause as Error).message));setBusy(false);onBusy(false);}
  }
  const stop=()=>{if(timer.current)clearInterval(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());setRecording(false);};
  async function record(){
    setError('');setBusy(true);onBusy(true);
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Dein Browser unterstützt keine Aufnahme. Du kannst stattdessen eine Audiodatei hochladen.');
      const media=await navigator.mediaDevices.getUserMedia({audio:true});if(disposed.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type)),instance=new MediaRecorder(media,mime?{mimeType:mime,audioBitsPerSecond:64000}:undefined);recorder.current=instance;const chunks:BlobPart[]=[];
      instance.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};instance.onstop=()=>{if(!disposed.current)void prepare(new Blob(chunks,{type:instance.mimeType}));};instance.start();setBusy(false);setRecording(true);setSeconds(0);const started=Date.now();timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);setSeconds(Math.min(elapsed,maxAudioSeconds));if(elapsed>=maxAudioSeconds)stop();},200);
    }catch(cause){setBusy(false);onBusy(!!draft);stream.current?.getTracks().forEach(track=>track.stop());setError(t((cause as Error).name==='NotAllowedError'?'Der Mikrofonzugriff wurde nicht erlaubt. Du kannst eine Datei hochladen.':cause instanceof Error?cause.message:'Die Aufnahme konnte nicht gestartet werden.'));}
  }
  const updateRange=(field:'start'|'end',value:number)=>{draftPlayer.current?.pause();if(field==='start')setStart(value);else setEnd(value);};
  return <section className="audio-input" aria-label={t('Aussprache aufnehmen')}><h3>{t('Aussprache zum Anhören')} <span>{t(required?'(erforderlich)':'(optional)')}</span></h3><p className="form-note">{t('Nimm bis zu 20 Sekunden auf oder lade eine Datei hoch. Wähle anschließend den gewünschten Ausschnitt. Nur dieser wird hochgeladen und mit deinem Beitrag veröffentlicht.')}</p>
    {available===false?<p className="form-note">{t('Audio ist momentan nicht verfügbar.')}</p>:<div className="audio-actions">{recording?<button type="button" className="button primary" onClick={stop}><Square size={16}/>{t('Aufnahme beenden')} · {seconds}s</button>:<button type="button" className="button outline" disabled={disabled||busy||available!==true} onClick={()=>void record()}><Mic size={16}/>{t('Aufnehmen')}</button>}<label className={`button outline audio-upload ${disabled||busy||recording?'disabled':''}`}><Upload size={16}/>{t('Audiodatei auswählen')}<input type="file" accept="audio/*" disabled={disabled||busy||recording||available!==true} onChange={event=>{const file=event.target.files?.[0];if(file)void prepare(file);event.target.value='';}}/></label></div>}
    {draft&&<div className="audio-trimmer"><h4>{t('Audio zuschneiden')}</h4><p className="form-note">{t('Anfang und Ende wählen, probehören und den Ausschnitt übernehmen. Maximal 20 Sekunden.')}</p>
      <audio ref={draftPlayer} controls preload="metadata" src={draft.url} aria-label={t('Ausschnitt vorhören')} onPlay={e=>{if(e.currentTarget.currentTime<start||e.currentTarget.currentTime>=end)e.currentTarget.currentTime=start;}} onTimeUpdate={e=>{if(e.currentTarget.currentTime>=end)e.currentTarget.pause();}}/>
      <div className="form-row">{(['start','end'] as const).map(field=><div className="audio-trim-field" key={field}><label>{t(field==='start'?'Anfang (Sekunden)':'Ende (Sekunden)')}<input type="number" min={0} max={Math.floor(draft.buffer.duration*100)/100} step={0.01} value={field==='start'?start:end} disabled={disabled||busy||recording} onChange={e=>updateRange(field,Number(e.target.value))}/></label><input type="range" aria-label={t(field==='start'?'Anfang verschieben':'Ende verschieben')} min={0} max={Math.floor(draft.buffer.duration*100)/100} step={0.01} value={field==='start'?start:end} disabled={disabled||busy||recording} onChange={e=>updateRange(field,Number(e.target.value))}/></div>)}</div>
      <p className="form-note" aria-live="polite">{t('Länge des Ausschnitts')}: {Math.max(0,end-start).toFixed(2)} s</p>{selectionError&&<p role="alert" className="error">{t(selectionError)}</p>}
      <div className="dialog-actions"><button type="button" className="button primary" disabled={disabled||busy||recording||!!selectionError||available!==true} onClick={()=>void applyTrim()}><Scissors size={16}/>{t('Ausschnitt übernehmen')}</button><button type="button" className="button outline" disabled={disabled||busy||recording} onClick={discard}>{t('Abbrechen')}</button></div>
    </div>}
    {busy&&<p role="status" className="form-note">{t('Audio wird verarbeitet …')}</p>}{preview&&!draft&&<div className="audio-preview"><audio controls preload="metadata" src={preview} aria-label={t('Deine Ausspracheaufnahme')}/><button type="button" className="icon-button" aria-label={t('Audio zuschneiden')} title={t('Audio zuschneiden')} disabled={disabled||busy||recording||available!==true} onClick={()=>void editExisting()}><Scissors size={17}/></button><button type="button" className="icon-button" aria-label={t('Aufnahme entfernen')} disabled={disabled||busy||recording} onClick={remove}><Trash2 size={17}/></button></div>}{error&&<p role="alert" className="error">{error}</p>}
  </section>;
}
