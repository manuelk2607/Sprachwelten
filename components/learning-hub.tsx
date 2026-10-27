"use client";
import { useEffect, useState } from "react";
import { languagePairInput } from "@/lib/vocabulary";
import { useI18n } from "@/lib/i18n";
import { LanguagePicker } from "./language-picker";
import { VocabularyWorkspace } from "./vocabulary-workspace";
import { LearningDashboard } from "./learning-dashboard";
export function LearningHub({
  ready,
  version,
  login,
  contribute,
  onPairChange,
  openEntry,
}: {
  ready: boolean;
  version: number;
  login: () => void;
  onPairChange:(source:string,target:string)=>void;
  openEntry:(id:string)=>Promise<void>;
  contribute: (
    kind: "vocabulary" | "grammar",
    target: string,
    source: string,
  ) => void;
}) {
  const { t } = useI18n(),
    [source, setSource] = useState("de"),
    [target, setTarget] = useState("en"),
    [tab, setTab] = useState<"vocabulary" | "grammar">("vocabulary");
  useEffect(() => {
    try {
      const parsed = languagePairInput.safeParse(
        JSON.parse(
          localStorage.getItem("sprachwelten-learning-pair:v1") ?? "null",
        ),
      );
      if (parsed.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore independent language preferences, never account data.
        setSource(parsed.data.sourceLanguage);
        setTarget(parsed.data.targetLanguage);
        onPairChange(parsed.data.sourceLanguage,parsed.data.targetLanguage);
      }
    } catch {}
  }, [onPairChange]);
  function pair(nextSource: string, nextTarget: string) {
    setSource(nextSource);
    setTarget(nextTarget);
    onPairChange(nextSource,nextTarget);
    if (nextSource !== nextTarget)
      try {
        localStorage.setItem(
          "sprachwelten-learning-pair:v1",
          JSON.stringify({
            sourceLanguage: nextSource,
            targetLanguage: nextTarget,
          }),
        );
      } catch {}
  }
  return (
    <section className="learning-hub" aria-labelledby="learning-title">
      <div className="section-top">
        <div>
          <div className="eyebrow">{t("DEINE SPRACHE. DEIN TEMPO.")}</div>
          <h1 id="learning-title">{t("Lernen")}</h1>
          <p>
            {t(
              "Wähle dein Sprachpaar, sammle Wörter in eigenen Heften und wiederhole gezielt. Die Menü-Sprache bleibt davon unabhängig.",
            )}
          </p>
        </div>
        <a className="text-link" href="#entdecken">
          {t("Zur Spielesammlung")}
        </a>
      </div>
      <div className="learning-pair">
        <LanguagePicker
          label="Ausgangssprache"
          disabled={!ready}
          value={source}
          onChange={(value) => pair(value, target)}
        />
        <button
          className="button outline"
          disabled={!ready}
          onClick={() => pair(target, source)}
          aria-label={t("Sprachrichtung tauschen")}
        >
          ⇄
        </button>
        <LanguagePicker
          label="Zielsprache"
          disabled={!ready}
          value={target}
          onChange={(value) => pair(source, value)}
        />
      </div>
      <div
        className="learning-actions"
        role="group"
        aria-label={t("Lernbereiche")}
      >
        <button
          className={"button " + (tab === "vocabulary" ? "dark" : "outline")}
          aria-pressed={tab === "vocabulary"}
          disabled={!ready}
          onClick={() => setTab("vocabulary")}
        >
          {t("Vokabeln & Hefte")}
        </button>
        <button
          className={"button " + (tab === "grammar" ? "dark" : "outline")}
          aria-pressed={tab === "grammar"}
          disabled={!ready}
          onClick={() => setTab("grammar")}
        >
          {t("Grammatik & Übungen")}
        </button>
      </div>
      {tab === "vocabulary" ? (
        <VocabularyWorkspace
          openEntry={openEntry}
          ready={ready}
          sourceLanguage={source}
          targetLanguage={target}
          onPairChange={pair}
          login={login}
          contribute={() => contribute("vocabulary", target, source)}
          version={version}
        />
      ) : (
        <LearningDashboard
          ready={ready}
          version={version}
          login={login}
          contribute={(kind) => contribute(kind, target, source)}
          targetLanguage={target}
          onlyGrammar
          embedded
        />
      )}
    </section>
  );
}
