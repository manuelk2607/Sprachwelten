"use client";
import { useState } from "react";
import { useAuthSession } from "@/lib/auth/provider";
import { getAuthClient } from "@/lib/auth/client";
import { useI18n } from "@/lib/i18n";
import { profileInput } from "@/lib/profile";
import { Header } from "./header";
import { AuthDialog } from "./auth-dialog";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
};
function ProfileEditor({ user }: { user: User }) {
  const { t, locale } = useI18n(),
    [saved, setSaved] = useState({ name: user.name, image: user.image ?? "" }),
    [name, setName] = useState(user.name),
    [image, setImage] = useState(user.image ?? ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dirty = name !== saved.name || image !== saved.image;
  return (
    <>
      <form
        className="form-stack panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          setNotice("");
          const data = profileInput.safeParse({ name, image });
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
            setImage(data.data.image ?? "");
            setSaved({ name: data.data.name, image: data.data.image ?? "" });
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
        <label>
          {t("Profilbild-Adresse (HTTPS)")}
          <input
            name="image"
            type="url"
            placeholder="https://…"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            maxLength={1000}
            disabled={busy}
            aria-describedby="image-note"
          />
        </label>
        <p id="image-note" className="form-note">
          {t(
            "Optional. Leere das Feld, um das Profilbild zu entfernen. Externe Bilder werden nur auf dieser Seite als Vorschau geladen; der Bildanbieter erhält dabei deine IP-Adresse.",
          )}
        </p>
        {saved.image && (
          <div>
            {/* External opt-in avatar preview; no server image fetch or referrer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={saved.image}
              width={64}
              height={64}
              referrerPolicy="no-referrer"
              alt={t("Vorschau des Profilbilds")}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
        )}
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
              setName(saved.name);
              setImage(saved.image);
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
    [auth, setAuth] = useState(false);
  return (
    <>
      <Header onLogin={() => setAuth(true)} />
      <main
        className="page-shell"
        style={{ maxWidth: 760, margin: "2rem auto", padding: "0 1rem" }}
      >
        <h1>{t("Profil bearbeiten")}</h1>
        {session?.user ? (
          <ProfileEditor key={session.user.id} user={session.user} />
        ) : (
          <div className="panel">
            <p>{t("Bitte melde dich an, um dein Profil zu bearbeiten.")}</p>
            <button className="button" onClick={() => setAuth(true)}>
              {t("Anmelden")}
            </button>
          </div>
        )}
      </main>
      {auth && <AuthDialog close={() => setAuth(false)} />}
    </>
  );
}
