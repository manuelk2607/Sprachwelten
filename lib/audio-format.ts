export const audioSampleRate=16000;
export const maxAudioSeconds=20;
export const maxAudioBytes=44+audioSampleRate*2*maxAudioSeconds;
export function audioSelection(duration:number,start:number,end:number){
  if(![duration,start,end].every(Number.isFinite)||start<0||end>duration+0.001||end-start<0.05)throw new Error('Bitte einen gültigen Ausschnitt mit Anfang vor Ende wählen.');
  if(end-start>maxAudioSeconds+0.001)throw new Error('Der Ausschnitt darf höchstens 20 Sekunden lang sein.');
  return {start,duration:end-start,samples:Math.min(audioSampleRate*maxAudioSeconds,Math.round((end-start)*audioSampleRate))};
}
const text=(view:DataView,offset:number,length:number)=>Array.from({length},(_,index)=>String.fromCharCode(view.getUint8(offset+index))).join('');
export function validateAudioWave(bytes:Uint8Array){
  if(bytes.byteLength<46||bytes.byteLength>maxAudioBytes)throw new Error('Die Aufnahme muss zwischen einem kurzen Laut und 20 Sekunden lang sein.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(text(view,0,4)!=='RIFF'||text(view,8,4)!=='WAVE'||text(view,12,4)!=='fmt '||text(view,36,4)!=='data'||view.getUint32(4,true)!==bytes.byteLength-8||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==audioSampleRate||view.getUint32(28,true)!==audioSampleRate*2||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.byteLength-44||(bytes.byteLength-44)%2)throw new Error('Die Audiodatei ist ungültig. Bitte die Aufnahme erneut auswählen.');
  return {durationMs:Math.ceil((bytes.byteLength-44)/(audioSampleRate*2)*1000),byteSize:bytes.byteLength};
}
export function encodeAudioWave(samples:Float32Array){
  if(samples.length>audioSampleRate*maxAudioSeconds)throw new Error('Die Aufnahme darf höchstens 20 Sekunden lang sein.');
  const buffer=new ArrayBuffer(44+samples.length*2);const view=new DataView(buffer);
  const write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  write(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,audioSampleRate,true);view.setUint32(28,audioSampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,samples.length*2,true);
  samples.forEach((sample,index)=>{const value=Math.max(-1,Math.min(1,sample));view.setInt16(44+index*2,value<0?value*32768:value*32767,true);});
  return buffer;
}
