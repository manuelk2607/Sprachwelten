'use client';
import {useState} from 'react';
import type {GameView} from '@/lib/game';
import type {RoomAction} from '@/lib/content';
import {useI18n} from '@/lib/i18n';
import {languageLabel} from '@/lib/language-label';
export function WordOrderRound({room,busy,action}:{room:GameView;busy:boolean;action:(a:RoomAction)=>Promise<void>}){
 const {t,locale}=useI18n(),c=room.wordOrder!;const [order,setOrder]=useState<string[]>([]);
 const text=(id:string)=>c.tiles.find(t=>t.id===id)?.text;
 if(c.submitted)return <div className="waiting"><h3>{t('Dein Satz ist abgegeben.')}</h3><p>{c.ownOrder?.map(text).join(' ')}</p><p>{t('Warte auf die anderen Antworten.')}</p></div>;
 return <div className="word-order"><h2>{t('Baue die Übersetzung.')} · {languageLabel(c.targetLanguage,locale)}</h2><p className="muted">{t('Klicke die Bausteine in Reihenfolge. Ein Klick im Satz legt einen Baustein zurück.')}</p><div className="assembled-sentence" aria-label={t('Dein Satz')} aria-live="polite">{order.length?order.map((id,i)=><button className="word-tile selected" key={id} disabled={busy} onClick={()=>setOrder(order.filter(v=>v!==id))} aria-label={`${i+1}: ${text(id)} · ${t('Entfernen')}`}>{text(id)}</button>):<span>{t('Hier entsteht dein Satz …')}</span>}</div><div className="word-bank" aria-label={t('Wortbausteine')}>{c.tiles.map(tile=><button className="word-tile" type="button" key={tile.id} disabled={busy||order.includes(tile.id)} onClick={()=>setOrder([...order,tile.id])}>{tile.text}</button>)}</div><div className="dialog-actions"><button className="button outline" disabled={busy||!order.length} onClick={()=>setOrder([])}>{t('Zurücksetzen')}</button><button className="button primary" disabled={busy||order.length!==c.tiles.length} onClick={()=>void action({action:'order',tiles:order,roundNumber:room.roundNumber,matchId:room.matchId})}>{t('Satz abgeben')}</button></div></div>;
}
