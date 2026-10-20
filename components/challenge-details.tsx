'use client';
import type {Challenge} from '@/lib/challenges';
import {challengeHasFallback,challengeText,missionTiles} from '@/lib/challenges';
import {useI18n} from '@/lib/i18n';
import {languageLabel} from '@/lib/language-label';
export function ChallengeDetails({challenge:c}:{challenge?:Challenge}){const {t,locale}=useI18n();if(!c)return null;return <div className="challenge-details">
 {challengeHasFallback(c,locale)&&<p className="form-note">{t('Ein Teil dieser Aufgabe wird im Original angezeigt, weil die Übersetzung fehlt.')}</p>}
 {c.type==='sound'&&<div className="sound-words">{c.words.map(w=><div key={w.word}><strong>{w.word}</strong><span>{w.pronunciation}</span><p>{challengeText(w.meaning,locale)}</p></div>)}</div>}
 {c.type==='attribution'&&<p><strong>{t(c.category==='person'?'Gesuchte Person':'Gesuchter Liedtitel')}:</strong> {c.answer}{c.artist&&' — '+c.artist}</p>}
 {c.type==='attribution'&&c.category==='song'&&c.album&&<p><strong>{t('Album')}:</strong> {c.album}</p>}
 {c.type==='friends'&&<><p><strong>{c.otherWord}</strong> · {languageLabel(c.otherLanguage,locale)}</p><p>{challengeText(c.context,locale)}</p><p><strong>{t(c.sameMeaning?'Gleiche Bedeutung':'False Friend')}</strong></p><dl><dt>{t('Bedeutung des ersten Wortes')}</dt><dd>{challengeText(c.firstMeaning,locale)}</dd><dt>{t('Bedeutung des zweiten Wortes')}</dt><dd>{challengeText(c.secondMeaning,locale)}</dd></dl></>}
 {c.type==='order'&&<><p>{c.source[locale]} → {languageLabel(c.targetLanguage,locale)}</p><ul>{c.accepted.map((a,i)=><li key={i}>{a.map(id=>c.tiles.find(t=>t.id===id)?.text).join(' ')}</li>)}</ul></>}
 {c.type==='mission'&&<p>{t('Ziele')}: {c.checkpoints.map(n=>missionTiles[n][locale]).join(' → ')}</p>}
 {(c.type==='relay'||c.type==='academic'||c.type==='joke'||c.type==='meaning'||c.type==='outsider')&&<p><strong>{t('Richtige Antwort')}:</strong> {challengeText(c.choices[c.correctIndex],locale)}</p>}
 {c.type==='outsider'&&<><p>{challengeText(c.rule,locale)}</p><p>{challengeText(c.explanation,locale)}</p></>}
 {c.type==='loan'&&<p><strong>{t('Unmittelbare Gebersprache')}:</strong> {languageLabel(c.originLanguage,locale)}</p>}
 </div>;}
