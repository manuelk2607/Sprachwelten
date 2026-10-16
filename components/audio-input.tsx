'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { audioSampleRate, encodeAudioWave, maxAudioSeconds } from '@/lib/audio-format';
type UploadedAudio={id:string;durationMs:number};
export function AudioInput({onChange,onBusy,disabled=false,required=false}:{onChange:(audio:UploadedAudio|null)=>void;onBusy:(busy:boolean)=>void;disabled?:boolean;required?:boolean}){
  const {t}=useI18n();const [available,setAvailable]=useState<boolean|null>(null);const [recording,setRecording]=useState(false);const [seconds,setSeconds]=useState(0);const [busy,setBusy]=useState(false);const [preview,setPreview]=useState('');const [error,setError]=useState('');
  const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const timer=useRef<ReturnType<typeof setInterval>|null>(null);const audioId=useRef<string|null>(null);const previewRef=useRef('');const disposed=useRef(false);const uploadController=useRef<AbortController|null>(null);
  const removeStored=(id:string)=>void fetch('/api/audio/'+id,{method:'DELETE',keepalive:true}).catch(()=>{});
  useEffect(()=>{
    disposed.current=false;const controller=new AbortController();fetch('/api/audio',{signal:controller.signal}).then(r=>r.json() as Promise<{available:boolean}>).then(data=>setAvailable(data.available)).catch(()=>setAvailable(false));
    return()=>{disposed.current=true;controller.abort();uploadController.current?.abort();if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(track=>track.stop());if(previewRef.current)URL.revokeObjectURL(previewRef.current);if(audioId.current)removeStored(audioId.current);};
  },[]);
  const remove=()=>{if(audioId.current)removeStored(audioId.current);audioId.current=null;onChange(null);if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current='';setPreview('');};
  async function prepare(blob:Blob){
    setBusy(true);onBusy(true);setError('');let context:AudioContext|undefined;
    try{
      if(blob.size>20*1024*1024)throw new Error('Die Audiodatei ist zu groß. Bitte einen kurzen Ausschnitt auswählen.');
      context=new AudioContext();const decoded=await context.decodeAudioData(await blob.arrayBuffer());
      if(!Number.isFinite(decoded.duration)||decoded.duration>maxAudioSeconds+0.05||decoded.duration<0.05)throw new Error('Bitte eine Audioaufnahme mit höchstens 20 Sekunden auswählen.');
      const length=Math.min(audioSampleRate*maxAudioSeconds,Math.round(decoded.duration*audioSampleRate));const offline=new OfflineAudioContext(1,length,audioSampleRate);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();
      if(disposed.current)return;
      const wave=new Blob([encodeAudioWave(rendered.getChannelData(0))],{type:'audio/wav'});const controller=new AbortController();uploadController.current=controller;
      const response=await fetch('/api/audio',{method:'POST',headers:{'Content-Type':'audio/wav'},body:wave,signal:controller.signal});const result=await response.json() as {audio:UploadedAudio;error?:string};
      if(!response.ok)throw new Error(result.error);if(disposed.current){removeStored(result.audio.id);return;}
      remove();audioId.current=result.audio.id;onChange(result.audio);const url=URL.createObjectURL(wave);previewRef.current=url;setPreview(url);
    }catch(error){if(!disposed.current&&(error as Error).name!=='AbortError')setError(t(error instanceof Error?error.message:'Die Aufnahme konnte nicht verarbeitet werden.'));}finally{await context?.close();if(!disposed.current){setBusy(false);onBusy(false);}}
  }
  const stop=()=>{if(timer.current)clearInterval(timer.current);if(recorder.current?.state==='recording')recorder.current.stop();stream.current?.getTracks().forEach(track=>track.stop());setRecording(false);};
  async function record(){
    setError('');setBusy(true);onBusy(true);
    try{
      if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new Error('Dein Browser unterstützt keine Aufnahme. Du kannst stattdessen eine Audiodatei hochladen.');
      const media=await navigator.mediaDevices.getUserMedia({audio:true});if(disposed.current){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;
      const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported(type));const instance=new MediaRecorder(media,mime?{mimeType:mime,audioBitsPerSecond:64000}:undefined);recorder.current=instance;const chunks:BlobPart[]=[];
      instance.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};instance.onstop=()=>{if(!disposed.current)void prepare(new Blob(chunks,{type:instance.mimeType}));};instance.start();setBusy(false);setRecording(true);setSeconds(0);const started=Date.now();timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);setSeconds(Math.min(elapsed,maxAudioSeconds));if(elapsed>=maxAudioSeconds)stop();},200);
    }catch(error){setBusy(false);onBusy(false);stream.current?.getTracks().forEach(track=>track.stop());setError(t((error as Error).name==='NotAllowedError'?'Der Mikrofonzugriff wurde nicht erlaubt. Du kannst eine Datei hochladen.':error instanceof Error?error.message:'Die Aufnahme konnte nicht gestartet werden.'));}
  }
  return <section className="audio-input" aria-label={t('Aussprache aufnehmen')}><h3>{t('Aussprache zum Anhören')} <span>{t(required?'(erforderlich)':'(optional)')}</span></h3><p className="form-note">{t('Sprich den Originalausdruck ein oder lade eine Audiodatei hoch. Maximal 20 Sekunden. Die Aufnahme wird mit deinem Beitrag öffentlich abspielbar.')}</p>
    {available===false?<p className="form-note">{t('Audio ist momentan nicht verfügbar.')}</p>:<div className="audio-actions">{recording?<button type="button" className="button primary" onClick={stop}><Square size={16}/>{t('Aufnahme beenden')} · {seconds}s</button>:<button type="button" className="button outline" disabled={disabled||busy||available!==true} onClick={()=>void record()}><Mic size={16}/>{t('Aufnehmen')}</button>}<label className={`button outline audio-upload ${disabled||busy||recording?'disabled':''}`}><Upload size={16}/>{t('Audiodatei auswählen')}<input type="file" accept="audio/*" disabled={disabled||busy||recording||available!==true} onChange={event=>{const file=event.target.files?.[0];if(file)void prepare(file);event.target.value='';}}/></label></div>}
    {busy&&<p role="status" className="form-note">{t('Aufnahme wird vorbereitet und hochgeladen …')}</p>}{preview&&<div className="audio-preview"><audio controls preload="metadata" src={preview} aria-label={t('Deine Ausspracheaufnahme')}/><button type="button" className="icon-button" aria-label={t('Aufnahme entfernen')} disabled={disabled||busy} onClick={remove}><Trash2 size={17}/></button></div>}{error&&<p role="alert" className="error">{error}</p>}
  </section>;
}
