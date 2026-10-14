'use client';
import { useI18n, type Locale } from '@/lib/i18n';
export function TranslationNotice({status,sourceLocale}:{status:'original'|'translated'|'partial'|'missing';sourceLocale:Locale}) {
  const {t}=useI18n();if(status==='original')return null;
  return <p className="translation-notice">{t(status==='translated'?'Übersetzung vom Beitragenden bereitgestellt.':status==='partial'?'Teilweise übersetzt. Fehlende Felder erscheinen im Original.':'Übersetzung fehlt. Dieser Text erscheint im Original.')} {status!=='translated'&&<span>{t('Originalsprache:')} {t(sourceLocale==='en'?'Englisch':'Deutsch')}</span>}</p>;
}
