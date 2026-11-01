"use client";
import { useState } from "react";
import { useAuthSession } from "@/lib/auth/provider";
import { getAuthClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";
import { profileInput } from "@/lib/profile";
import { Header } from "./header";
import { AuthDialog } from "./auth-dialog";
import { AccountSettings } from "./account-settings";

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};
function ProfileEditor({
  user,
  onEmailChanged,
  onForgotPassword,
}: {
  user: User;
  onEmailChanged: (email: string, loggedOut: boolean) => void;
  onForgotPassword: () => void;
}) {
  const { t, locale } = useI18n(),
    [saved, setSaved] = useState(user.name),
    [name, setName] = useState(user.name),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dirty = name !== saved;
  return (
    <>
      <form
        className="form-stack panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setNotice("");
          const data = profileInput.safeParse({ name });
          if (!data.success) {
            setError(data.error.issues[0].message);
            return;
          }
          setBusy(true);
          try {
            const result = await (await getAuthClient()).updateUser(data.data);
            if (result.error)
              throw new Error(
                result.error.message ??
                  "Das Profil konnte nicht gespeichert werden.",
              );
            setName(data.data.name);
            setSaved(data.data.name);
            setNotice("Profil gespeichert.");
          } catch (cause) {
            setError((cause as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2>{t("Dein Profil")}</h2>
        <p className="form-note">
          {t(
            "Dein Anzeigename wird für neue Spiele verwendet. Bestehende Beiträge, Namensnennungen und Spielstände werden nicht verändert.",
          )}
        </p>
        <label>
          {t("Anzeigename")}
          <input
            name="name"
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            disabled={busy}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {t(error)}
          </p>
        )}
        {notice && <p role="status">{t(notice)}</p>}
        <div className="form-row">
          <button className="button" disabled={busy || !dirty}>
            {t(busy ? "Wird gespeichert …" : "Speichern")}
          </button>
          <button
            type="button"
            className="button outline"
            disabled={busy || !dirty}
            onClick={() => {
              setName(saved);
              setError("");
              setNotice("");
            }}
          >
            {t("Abbrechen")}
          </button>
        </div>
      </form>
      <section className="panel form-stack">
        <h2>{t("Private Kontodaten")}</h2>
        <label>
          {t("E-Mail")}
          <input type="email" value={user.email} readOnly />
        </label>
        <p>
          {t(
            user.emailVerified
              ? "E-Mail bestätigt"
              : "E-Mail noch nicht bestätigt",
          )}
        </p>
        <p className="form-note">
          {t(
            "Deine E-Mail-Adresse ist nur für dich und die Kontoverwaltung sichtbar. Profiländerungen vergeben keine Rechte und ändern keine Beitragszuordnung.",
          )}
        </p>
      </section>
      <AccountSettings
        email={user.email}
        onEmailChanged={onEmailChanged}
        onForgotPassword={onForgotPassword}
      />
      <section className="panel form-stack">
        <h2>{t("Persönliche Einstellungen")}</h2>
        <p>
          {t(
            "Sprache und Darstellung wechselst du in der Menüleiste. Diese Einstellungen gelten für diesen Browser. Deine Lernsprachen wählst du unabhängig davon im Lernbereich.",
          )}
        </p>
        <a
          className="text-link"
          href={locale === "de" ? "/lernen" : "/en/learn"}
        >
          {t("Zum Lernbereich")}
        </a>
      </section>
    </>
  );
}
export function Profile() {
  const session = useAuthSession(),
    { t } = useI18n(),
    [auth, setAuth] = useState(false),
    [changedEmail, setChangedEmail] = useState(""),
    [logoutComplete, setLogoutComplete] = useState(true),
    [resetPassword, setResetPassword] = useState(false);
  return (
    <>
      <Header onLogin={() => setAuth(true)} />
      <main
        className="page-shell"
        style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}
      >
        <h1>{t("Profil bearbeiten")}</h1>
        {changedEmail && (
          <p role="status">
            {t(
              logoutComplete
                ? "E-Mail-Adresse geändert. Bitte melde dich mit der neuen Adresse erneut an."
                : "E-Mail-Adresse geändert. Die automatische Abmeldung war nicht vollständig erfolgreich; bitte melde dich erneut an und prüfe deine Sitzungen.",
            )}
          </p>
        )}
        {session?.user ? (
          <ProfileEditor
            key={session.user.id}
            user={session.user}
            onEmailChanged={(value, complete) => {
              setChangedEmail(value);
              setLogoutComplete(complete);
              setResetPassword(false);
              setAuth(complete);
            }}
            onForgotPassword={() => {
              setResetPassword(true);
              setAuth(true);
            }}
          />
        ) : (
          <div className="panel">
            <p>{t("Bitte melde dich an, um dein Profil zu bearbeiten.")}</p>
            <button className="button" onClick={() => setAuth(true)}>
              {t("Anmelden")}
            </button>
          </div>
        )}
      </main>
      {auth && (
        <AuthDialog
          initial={resetPassword ? "forgot" : "signin"}
          email={resetPassword ? session?.user.email : changedEmail}
          close={() => {
            setAuth(false);
            setResetPassword(false);
          }}
        />
      )}
    </>
  );
}
