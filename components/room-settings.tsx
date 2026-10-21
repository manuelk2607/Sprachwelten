'use client';
import {LanguageSetPicker} from './language-set-picker';
import {useI18n} from '@/lib/i18n';
import type {GameView} from '@/lib/game';
import type {RoomAction} from '@/lib/content';
import {familyFor,gameFamilies} from '@/lib/game-families';
import {meaningCategories,type MeaningCategory} from '@/lib/meaning-categories';
import {modeInfo} from '@/lib/modes';
import {Select} from './select';
import {LanguagePicker} from './language-picker';

type Configuration=Extract<RoomAction,{action:'configure'}>;
export function RoomSettings({room,disabled,configure}:{room:GameView;disabled:boolean;configure:(action:Configuration)=>void}) {
  const {t}=useI18n(),family=familyFor(room.mode);
  return <div className="form-stack room-settings">
    <label>{t('Spielmodus')}<Select disabled={disabled} value={family.id} onValueChange={mode=>configure({action:'configure',mode:mode as Configuration['mode']})}>{gameFamilies.map(item=><option key={item.id} value={item.id}>{t(item.title)}</option>)}</Select></label>
    {room.mode==='tongue-twisters'&&<><LanguagePicker label="Sprache der Zungenbrecher" value={room.pronunciationLanguage} onChange={pronunciationLanguage=>configure({action:'configure',pronunciationLanguage})} disabled={disabled} allowAll preserveSelectionWhileSearching/><p className="form-note">{t('Gilt für Texte und Aufnahmen in beiden Kategorien. Mit „Alle Sprachen“ werden die Sprachen gemischt.')}</p></>}
    {room.mode==='taboo'&&<LanguageSetPicker value={room.tabooLanguages} onChange={tabooLanguages=>configure({action:'configure',tabooLanguages})} disabled={disabled}/>}
    <div className="room-settings-row">
    {family.modes.length>1&&<label>{t('Kategorie')}<Select disabled={disabled} value={room.mode} onValueChange={mode=>configure({action:'configure',mode:mode as Configuration['mode']})}>{family.modes.map(mode=><option key={mode} value={mode}>{t(modeInfo(mode).title)}</option>)}</Select></label>}
    {room.mode==='meaning-quiz'&&<label>{t('Kategorie')}<Select disabled={disabled} value={room.meaningCategory} onValueChange={meaningCategory=>configure({action:'configure',meaningCategory:meaningCategory as MeaningCategory})}>{Object.entries(meaningCategories).map(([id,label])=><option key={id} value={id}>{t(label)}</option>)}</Select></label>}
    {room.mode==='tongue-twisters'&&<label>{t('Kategorie')}<Select disabled={disabled} value={room.pronunciationCategory} onValueChange={value=>configure({action:'configure',pronunciationCategory:value as 'both'|'twister'|'sound'})}><option value="both">{t('Beide Kategorien')}</option><option value="twister">{t('Zungenknoten')}</option><option value="sound">{t('Klangfallen')}</option></Select></label>}
    {room.mode==='who-said-it'&&<label>{t('Kategorie')}<Select disabled={disabled} value={room.attributionCategory} onValueChange={value=>configure({action:'configure',attributionCategory:value as 'both'|'person'|'song'})}><option value="both">{t('Beide Kategorien')}</option><option value="person">{t('Personenzitat')}</option><option value="song">{t('Liedstelle')}</option></Select></label>}
    <label className="room-round-count">{t('Rundenzahl')}<Select disabled={disabled||!room.maxRounds} value={Math.min(room.totalRounds,room.maxRounds)} onValueChange={value=>configure({action:'configure',rounds:Number(value)})}>{room.maxRounds?Array.from({length:room.maxRounds},(_,index)=>index+1).map(value=><option key={value} value={value}>{value}</option>):<option value={0}>0</option>}</Select></label>
    </div>
    <p className="form-note">{t('Wählt 1 bis 10 Runden. Es werden nur ungespielte Aufgaben aus diesem Raum verwendet.')}</p>
    {!room.maxRounds&&<p className="notice">{t(room.mode==='tongue-twisters'?'Für diese Sprache und Kategorie gibt es keine ungespielten Aufgaben. Wähle eine andere Sprache oder Kategorie.':'Keine ungespielten Aufgaben in dieser Kategorie. Wählt ein anderes Spiel oder eine andere Kategorie.')}</p>}
    {room.maxRounds>0&&room.maxRounds<10&&<p className="form-note">{t('Noch verfügbare Runden in dieser Kategorie')}: {room.maxRounds}</p>}
  </div>;
}
