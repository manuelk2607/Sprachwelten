"use client";
import { useState } from "react";
import { getAuthClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";
import {
  passwordFormInput,
  emailChangeInput,
  emailConfirmInput,
  accountSettingsError,
} from "@/lib/account-settings";
export function AccountSettings({
  email,
  onEmailChanged,
  onForgotPassword,
}: {
  email: string;
  onEmailChanged: (email: string, loggedOut: boolean) => void;
  onForgotPassword: () => void;
}) {
  const { t } = useI18n(),
    [busy, setBusy] = useState(false),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNew] = useState(""),
    [confirmPassword, setConfirm] = useState(""),
    [passwordError, setPasswordError] = useState(""),
    [passwordNotice, setPasswordNotice] = useState(""),
    [newEmail, setEmail] = useState(""),
    [pending, setPending] = useState(""),
    [otp, setOtp] = useState(""),
    [emailError, setEmailError] = useState(""),
    [emailNotice, setEmailNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const clearPassword = () => {
    setCurrent("");
    setNew("");
    setConfirm("");
    setPasswordError("");
    setPasswordNotice("");
  };
  const clearEmail = () => {
    setEmail("");
    setPending("");
    setOtp("");
    setEmailError("");
    setEmailNotice("");
  };
  async function requestCode() {
    setEmailError("");
    setEmailNotice("");
    const data = emailChangeInput.safeParse({ newEmail: pending || newEmail });
    if (!data.success) {
      setEmailError(data.error.issues[0].message);
      return;
    }
    if (data.data.newEmail.toLowerCase() === email.toLowerCase()) {
      setEmailError("Bitte eine andere E-Mail-Adresse eingeben.");
      return;
    }
    setBusy(true);
    try {
      const result = await (
        await getAuthClient()
      ).emailOtp.requestEmailChange(data.data);
      if (result.error) throw result.error;
      setPending(data.data.newEmail);
      setOtp("");
      setCooldown(Date.now() + 30000);
      setEmailNotice(
        "Bestätigungscode angefordert. Bitte prüfe das Postfach der neuen E-Mail-Adresse.",
      );
    } catch (cause) {
      setEmailError(accountSettingsError(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form
        className="panel form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setPasswordError("");
          setPasswordNotice("");
          const data = passwordFormInput.safeParse({
            currentPassword,
            newPassword,
            confirmPassword,
            revokeOtherSessions: true,
          });
          if (!data.success) {
            setPasswordError(data.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            const result = await (
              await getAuthClient()
            ).changePassword({
              currentPassword: data.data.currentPassword,
              newPassword: data.data.newPassword,
              revokeOtherSessions: true,
            });
            if (result.error) throw result.error;
            clearPassword();
            setPasswordNotice(
              "Passwort geändert. Andere Sitzungen wurden abgemeldet.",
            );
          } catch (cause) {
            setPasswordError(accountSettingsError(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{t("Passwort ändern")}</h2>
        <p className="form-note">
          {t(
            "Deine aktuelle Sitzung bleibt erhalten. Andere Geräte müssen sich danach neu anmelden. Bei Anmeldung ausschließlich über Google nutze zunächst „Passwort vergessen?“.",
          )}
        </p>
        <button
          type="button"
          className="text-link"
          disabled={busy}
          onClick={onForgotPassword}
        >
          {t("Passwort vergessen?")}
        </button>
        <label>
          {t("Aktuelles Passwort")}
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label>
          {t("Neues Passwort")}
          <input
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        <label>
          {t("Neues Passwort wiederholen")}
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(e) => setConfirm(e.target.value)}
            required
            disabled={busy}
          />
        </label>
        {passwordError && (
          <p role="alert" className="error">
            {t(passwordError)}
          </p>
        )}
        {passwordNotice && <p role="status">{t(passwordNotice)}</p>}
        <div className="form-row">
          <button className="button" disabled={busy}>
            {t("Passwort ändern")}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={clearPassword}
          >
            {t("Abbrechen")}
          </button>
        </div>
      </form>
      <form
        className="panel form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!pending) {
            await requestCode();
            return;
          }
          setEmailError("");
          setEmailNotice("");
          const data = emailConfirmInput.safeParse({ newEmail: pending, otp });
          if (!data.success) {
            setEmailError(data.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            const result = await (
              await getAuthClient()
            ).emailOtp.changeEmail(data.data);
            if (result.error) throw result.error;
            clearEmail();
            const client = await getAuthClient();
            let loggedOut = false;
            try {
              const revoked = await client.revokeOtherSessions();
              const out = await client.signOut();
              loggedOut = !revoked.error && !out.error;
            } catch {
              /* Address already changed; report incomplete logout separately. */
            }
            onEmailChanged(data.data.newEmail, loggedOut);
          } catch (cause) {
            setEmailError(accountSettingsError(cause));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{t("E-Mail-Adresse ändern")}</h2>
        <p className="form-note">
          {t(
            "Deine bisherige Adresse bleibt gültig, bis du die neue Adresse mit dem Bestätigungscode bestätigt hast. Dein Konto, Beiträge und Lernstände bleiben erhalten.",
          )}
        </p>
        <label>
          {t("Neue E-Mail-Adresse")}
          <input
            type="email"
            name="newEmail"
            autoComplete="email"
            value={pending || newEmail}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={254}
            disabled={busy || !!pending}
          />
        </label>
        {pending && (
          <label>
            {t("Bestätigungscode")}
            <input
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              disabled={busy}
            />
          </label>
        )}
        {emailError && (
          <p role="alert" className="error">
            {t(emailError)}
          </p>
        )}
        {emailNotice && <p role="status">{t(emailNotice)}</p>}
        <div className="form-row">
          <button className="button" disabled={busy}>
            {t(
              pending
                ? "E-Mail-Adresse bestätigen"
                : "Bestätigungscode anfordern",
            )}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy}
            onClick={clearEmail}
          >
            {t("Abbrechen")}
          </button>
        </div>
        {pending && (
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              if (Date.now() < cooldown) {
                setEmailError(
                  "Bitte warte 30 Sekunden, bevor du einen neuen Code anforderst.",
                );
                return;
              }
              void requestCode();
            }}
          >
            {t("Code erneut anfordern")}
          </button>
        )}
      </form>
    </>
  );
}
