'use client';
import { useI18n } from '@/lib/i18n';
import { useState } from 'react';
import { getAuthClient } from '@/lib/auth/client';
import { Dialog } from './dialog';
export function AuthDialog({close, initial = 'signin', email = '', resetToken = ''}: {close:()=>void; initial?:'signin'|'verify'|'reset';email?:string;resetToken?:string}) {
  const { t, locale } = useI18n();
  const [mode,setMode]=useState<'signin'|'signup'|'forgot'|'verify'|'reset'>(initial);
  const [cooldown,setCooldown]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const change=(next:typeof mode)=>{setMode(next);setError('');setMessage('');};
  const title={signin:t("Willkommen zurück."),signup:t("Deine Worte zählen."),forgot:t("Passwort vergessen?"),verify:t("E-Mail bestätigen"),reset:t("Neues Passwort")}[mode];
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setMessage('');const data=new FormData(event.currentTarget);
    const mail=String(data.get('email')??email).trim(), password=String(data.get('password')??'');
    try {
      const authClient = await getAuthClient();
      if(mode==='forgot') {
        const {error}=await authClient.requestPasswordReset({email:mail,redirectTo:window.location.origin+'/?reset=1'}); if(error)throw new Error(error.message);
        setMessage(t("Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen."));
      } else if(mode==='reset') {
        const {error}=await authClient.resetPassword({newPassword:password,token:resetToken});if(error)throw new Error(error.message);
        change('signin');setMessage(t("Dein Passwort wurde geändert. Du kannst dich jetzt anmelden."));
      } else if(mode==='verify') {
        const {error}=await authClient.emailOtp.verifyEmail({email:mail,otp:String(data.get('otp'))});if(error)throw new Error(error.message);close();window.location.reload();
      } else {
        const result=mode==='signup'?await authClient.signUp.email({email:mail,password,name:String(data.get('name')).trim()}):await authClient.signIn.email({email:mail,password});
        if(result.error)throw new Error(result.error.message);
        if(mode==='signup') { const session=await authClient.getSession(); if(!session.data?.user) {change('signin');setMessage(t("Konto erstellt. Bitte prüfe deine E-Mails und melde dich an."));return;} }
        close();
      }
    } catch(err) {setError(err instanceof Error?t(err.message):t("Das hat gerade nicht geklappt."));} finally {setBusy(false);}
  }
  async function sendCode(){setBusy(true);setError('');try{const {error}=await (await getAuthClient()).emailOtp.sendVerificationOtp({email,type:'email-verification'});if(error)throw new Error(error.message);setMessage(t('Bestätigungscode gesendet. Bitte prüfe auch deinen Spam-Ordner.'));setCooldown(true);setTimeout(()=>setCooldown(false),60000);}catch(e){setError(t((e as Error).message));}finally{setBusy(false);}}
  return <Dialog title={title} close={close}>
    <p className="muted">{mode==='signup'||mode==='signin'?t('Mit einem Konto verwaltest du deine Beiträge auf allen Geräten: bearbeiten, löschen und Verbesserungsvorschläge verfolgen. Spielen und neue Beiträge einreichen geht auch ohne Konto.'):mode==='verify'?t("Gib den Bestätigungscode aus deiner E-Mail ein."):t("Wir helfen dir, wieder Zugang zu deinem Konto zu bekommen.")}</p>
    {mode==='verify'&&<button className="button outline" disabled={busy||cooldown} onClick={()=>void sendCode()}>{t('Bestätigungscode anfordern')}</button>}
    <form className="form-stack" onSubmit={submit}>
      {mode==='signup'&&<label>{t("Dein Anzeigename")}<input name="name" autoComplete="nickname" required minLength={2} maxLength={60} placeholder={t("Wie sollen wir dich nennen?")}/></label>}
      {mode!=='reset'&&<label>{t("E-Mail")}<input name="email" type="email" autoComplete="email" defaultValue={email} required maxLength={254} placeholder="du@beispiel.de" readOnly={mode==='verify'}/></label>}
      {mode==='verify'?<label>{t("Bestätigungscode")}<input name="otp" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" placeholder="123456"/></label>:mode!=='forgot'&&<label>{t("Passwort")}<input name="password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={mode==='signin'?1:8} maxLength={128} placeholder={mode==='signin'?t("Dein Passwort"):t("Mindestens 8 Zeichen")}/></label>}
      {error&&<p className="error" role="alert">{t(error)}</p>}{message&&<p className="success" role="status">{message}</p>}
      <button className="button primary full" disabled={busy}>{busy?t("Einen Moment …"):{signin:t("Anmelden"),signup:t("Konto erstellen"),forgot:t("Link senden"),verify:t("E-Mail bestätigen"),reset:t("Passwort speichern")}[mode]}</button>
    </form>
    {mode==='signin'&&<><button className="text-button" onClick={()=>change('forgot')}>{t("Passwort vergessen?")}</button><p className="auth-switch">{t("Noch kein Konto?")} <button onClick={()=>change('signup')}>{t("Jetzt registrieren")}</button></p></>}
    {mode==='signup'&&<p className="auth-switch">{t("Schon dabei?")} <button onClick={()=>change('signin')}>{t("Anmelden")}</button></p>}
    {(mode==='forgot'||mode==='reset')&&<button className="text-button" onClick={()=>change('signin')}>{t("Zurück zur Anmeldung")}</button>}
  </Dialog>;
}
