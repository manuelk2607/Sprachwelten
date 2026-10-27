"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Globe2, LogOut, Moon, Plus, Sun, UserRound } from "lucide-react";
import { getAuthClient } from "@/lib/auth/client";
import { useAuthSession } from "@/lib/auth/provider";
import { useTheme } from "@/lib/theme";
import { site } from "@/lib/site";
export function Header({
  active = "",
  onDiscover,
  onPlay,
  onContribute,
  onLogin,
}: {
  active?: string;
  onDiscover?: () => void;
  onPlay?: () => void;
  onContribute?: () => void;
  onLogin?: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () =>
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);
  const session = useAuthSession(),
    userId = session?.user?.id;
  const [access, setAccess] = useState<{
    userId: string;
    isAdmin: boolean;
    unreadCount: number;
  } | null>(null);
  const admin = access?.userId === userId && access?.isAdmin === true,
    unread = admin ? (access?.unreadCount ?? 0) : 0;
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const refresh = () => {
      fetch("/api/admin/access", { signal: controller.signal })
        .then(
          (r) =>
            r.json() as Promise<{ isAdmin?: boolean; unreadCount?: number }>,
        )
        .then((data) => {
          setAccess({
            userId,
            isAdmin: data.isAdmin === true,
            unreadCount: data.unreadCount ?? 0,
          });
        })
        .catch(() => {});
    };
    refresh();
    window.addEventListener("sprachwelten-inbox", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("sprachwelten-inbox", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId]);
  const { theme, toggleTheme } = useTheme();
  return (
    <header ref={headerRef} className="header">
      <a className="brand" href="/">
        <span className="brand-mark">
          <Globe2 size={24} />
        </span>
        {site.name}
        <span className="brand-dot">.</span>
      </a>
      <nav aria-label={t("Hauptnavigation")}>
        <a
          className={active === "play" ? "active" : ""}
          aria-current={active === "play" ? "location" : undefined}
          href="/#spiel-starten"
          onClick={(e) => {
            if (onPlay) {
              e.preventDefault();
              onPlay();
            }
          }}
        >
          {t("Spielen")}
        </a>
        <a
          className={active === "discover" ? "active" : ""}
          aria-current={active === "discover" ? "location" : undefined}
          href={locale==='de'?'/lernen':'/en/learn'}
          onClick={(e) => {
            if (onDiscover) {
              e.preventDefault();
              onDiscover();
            }
          }}
        >
          {t("Lernen")}
        </a>
      </nav>
      <div className="header-actions">
        <button
          type="button"
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-pressed={theme === "dark"}
          aria-label={t(
            theme === "dark"
              ? "Hellen Modus aktivieren"
              : "Dunklen Modus aktivieren",
          )}
          title={t(
            theme === "dark"
              ? "Hellen Modus aktivieren"
              : "Dunklen Modus aktivieren",
          )}
        >
          {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
        </button>
        <div
          className="language-switch"
          role="group"
          aria-label={locale === "de" ? "Sprache wählen" : "Choose language"}
        >
          {(["de", "en"] as const).map((value) => (
            <button
              key={value}
              className={locale === value ? "selected" : ""}
              aria-pressed={locale === value}
              onClick={() => setLocale(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
        {onContribute && (
          <button
            className="button small outline contribute-nav"
            onClick={onContribute}
          >
            <Plus size={16} />
            {t("Beitragen")}
          </button>
        )}
        {session?.user ? (
          <>
            <a href={active==='discover'?'/me?area=learn':"/me"} className="button small outline">
              {t("Meine Beiträge")}
            </a>
            {admin && (
              <a href="/admin" className="button small outline admin-link">
                <ShieldCheck size={16} />
                {t("Admin")}
                {unread > 0 && (
                  <span
                    className="notification-count"
                    aria-label={t("Offene Benachrichtigungen")}
                  >
                    {unread}
                  </span>
                )}
              </a>
            )}
            <span className="account-name">
              <UserRound size={16} />
              {session.user.name}
            </span>
            <button
              className="icon-button"
              aria-label={t("Abmelden")}
              onClick={async () => {
                await (await getAuthClient()).signOut();
              }}
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button className="button small dark login-button" onClick={onLogin}>
            <UserRound size={16} />
            {t("Anmelden")}
          </button>
        )}
      </div>
    </header>
  );
}
