'use client';
import {useId} from 'react';
import {FileText,Headphones} from 'lucide-react';
import {useI18n} from '@/lib/i18n';
export type MediaChoice={text:boolean;audio:boolean};
export function MediaChoiceInput({value,onChange,disabled}:{value:MediaChoice;onChange:(value:MediaChoice)=>void;disabled?:boolean}){
 const {t}=useI18n();const id=useId();
 return <fieldset className="media-choice"><legend>{t('Wie möchtest du den Ausdruck teilen?')}</legend><p className="form-note">{t('Wähle Text, Audio oder beides. Die Auswahl bestimmt auch die Vorgabe in den Spielrunden.')}</p><div className="media-choice-options">
  <label className={value.text?'selected':''}><input type="checkbox" aria-label={t('Text')} aria-describedby={id+'-text'} checked={value.text} disabled={disabled} onChange={e=>onChange({...value,text:e.target.checked})}/><FileText size={21}/><span><strong>{t('Text')}</strong><small id={id+'-text'}>{t('Originalausdruck zum Lesen')}</small></span></label>
  <label className={value.audio?'selected':''}><input type="checkbox" aria-label={t('Audio')} aria-describedby={id+'-audio'} checked={value.audio} disabled={disabled} onChange={e=>onChange({...value,audio:e.target.checked})}/><Headphones size={21}/><span><strong>{t('Audio')}</strong><small id={id+'-audio'}>{t('Aufnahme oder Audiodatei zum Anhören')}</small></span></label>
 </div>{!value.text&&!value.audio?<p className="error" role="status">{t('Bitte mindestens Text oder Audio auswählen.')}</p>:<p className="form-note">{t('Sprache, Lösungen und optionale Hinweise ergänzt du weiterhin unten.')}</p>}</fieldset>;
}
