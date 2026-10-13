'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Dialog } from './dialog';
export function AuthDialog({close, initial = 'signin', email = '', resetToken = ''}: {close:()=>void; initial?:'signin'|'verify'|'reset';email?:string;resetToken?:string}) {
  const [mode,setMode]=useState<'signin'|'signup'|'forgot'|'verify'|'reset'>(initial);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const change=(next:typeof mode)=>{setMode(next);setError('');setMessage('');};
  const title={signin:'Willkommen zurück.',signup:'Deine Worte zählen.',forgot:'Passwort vergessen?',verify:'E-Mail bestätigen',reset:'Neues Passwort'}[mode];
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setMessage('');const data=new FormData(event.currentTarget);
    const mail=String(data.get('email')??email).trim(), password=String(data.get('password')??'');
    try {
      if(mode==='forgot') {
        const {error}=await authClient.requestPasswordReset({email:mail,redirectTo:window.location.origin+'/?reset=1'}); if(error)throw new Error(error.message);
        setMessage('Falls ein Konto mit dieser E-Mail existiert, erhältst du einen Link zum Zurücksetzen.');
      } else if(mode==='reset') {
        const {error}=await authClient.resetPassword({newPassword:password,token:resetToken});if(error)throw new Error(error.message);
        change('signin');setMessage('Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.');
      } else if(mode==='verify') {
        const {error}=await authClient.emailOtp.verifyEmail({email:mail,otp:String(data.get('otp'))});if(error)throw new Error(error.message);close();window.location.reload();
      } else {
        const result=mode==='signup'?await authClient.signUp.email({email:mail,password,name:String(data.get('name')).trim()}):await authClient.signIn.email({email:mail,password});
        if(result.error)throw new Error(result.error.message);
        if(mode==='signup') { const session=await authClient.getSession(); if(!session.data?.user) {change('signin');setMessage('Konto erstellt. Bitte prüfe deine E-Mails und melde dich an.');return;} }
        close();
      }
    } catch(err) {setError(err instanceof Error?err.message:'Das hat gerade nicht geklappt.');} finally {setBusy(false);}
  }
  return <Dialog title={title} close={close}>
    <p className="muted">{mode==='signup'?'Entdecke mit anderen neue Sprachwelten und teile deine eigenen Ausdrücke.':mode==='signin'?'Melde dich an, um Redewendungen und Erklärungen beizutragen.':mode==='verify'?'Gib den Bestätigungscode aus deiner E-Mail ein.':'Wir helfen dir, wieder Zugang zu deinem Konto zu bekommen.'}</p>
    <form className="form-stack" onSubmit={submit}>
      {mode==='signup'&&<label>Dein Anzeigename<input name="name" autoComplete="nickname" required minLength={2} maxLength={60} placeholder="Wie sollen wir dich nennen?"/></label>}
      {mode!=='reset'&&<label>E-Mail<input name="email" type="email" autoComplete="email" defaultValue={email} required maxLength={254} placeholder="du@beispiel.de" readOnly={mode==='verify'}/></label>}
      {mode==='verify'?<label>Bestätigungscode<input name="otp" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} pattern="[0-9]{6}" placeholder="123456"/></label>:mode!=='forgot'&&<label>Passwort<input name="password" type="password" autoComplete={mode==='signin'?'current-password':'new-password'} required minLength={mode==='signin'?1:8} maxLength={128} placeholder={mode==='signin'?'Dein Passwort':'Mindestens 8 Zeichen'}/></label>}
      {error&&<p className="error" role="alert">{error}</p>}{message&&<p className="success" role="status">{message}</p>}
      <button className="button primary full" disabled={busy}>{busy?'Einen Moment …':{signin:'Anmelden',signup:'Konto erstellen',forgot:'Link senden',verify:'E-Mail bestätigen',reset:'Passwort speichern'}[mode]}</button>
    </form>
    {mode==='signin'&&<><button className="text-button" onClick={()=>change('forgot')}>Passwort vergessen?</button><p className="auth-switch">Noch kein Konto? <button onClick={()=>change('signup')}>Jetzt registrieren</button></p></>}
    {mode==='signup'&&<p className="auth-switch">Schon dabei? <button onClick={()=>change('signin')}>Anmelden</button></p>}
    {(mode==='forgot'||mode==='reset')&&<button className="text-button" onClick={()=>change('signin')}>Zurück zur Anmeldung</button>}
  </Dialog>;
}
