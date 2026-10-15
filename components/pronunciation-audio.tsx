'use client';
import { useI18n } from '@/lib/i18n';
export function PronunciationAudio({id}:{id?:string|null}){
  const {t}=useI18n();if(!id)return null;
  return <div className="pronunciation-audio"><span>{t('Originalaussprache anhören')}</span><audio controls preload="none" src={'/api/audio/'+encodeURIComponent(id)} aria-label={t('Originalaussprache anhören')}/></div>;
}
