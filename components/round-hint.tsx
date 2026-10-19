'use client';
import {useId,useState} from 'react';
import {Lightbulb} from 'lucide-react';
import type {GameView} from '@/lib/game';
import {useI18n} from '@/lib/i18n';
import {TranslationNotice} from './translation-notice';

export function RoundHint({hint}:{hint:NonNullable<GameView['hint']>}){
  const {t}=useI18n(),id=useId();const [open,setOpen]=useState(false);
  return <section className="round-hint">
    <button type="button" className="button small outline" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}><Lightbulb size={17}/>{t(open?'Tipp ausblenden':'Tipp anzeigen')}</button>
    <div id={id} hidden={!open}>{open&&<><p>{hint.text}</p><TranslationNotice status={hint.status} sourceLocale={hint.sourceLocale}/></>}</div>
  </section>;
}
