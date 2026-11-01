import type { Entry } from "./content";
import type { LearningQuestion } from "./learning-content";

const gap = (
  id: string,
  language: string,
  sentence: string,
  answers: string[],
  de: string,
  en: string,
): LearningQuestion => ({
  id,
  answerLanguage: language,
  exercise: "gap",
  prompt: { de: `Ergänze: ${sentence}`, en: `Complete: ${sentence}` },
  answers,
  choices: [],
  explanation: { de, en },
});
const grammarModule = (
  id: string,
  language: string,
  title: string,
  de: string,
  en: string,
  example: string,
  sourceUrl: string,
  questions: LearningQuestion[],
): Entry => ({
  id,
  kind: "grammar",
  language,
  phrase: title,
  meaning: de,
  example,
  literal: "",
  sense: "",
  hint: "",
  region: "",
  context: "",
  culturalNote: "",
  presentation: "text",
  authorName: "Redaktion",
  creditName: "",
  status: "curated",
  createdAt: "2026-10-27T00:00:00Z",
  revision: 0,
  sourceLocale: "de",
  sourceUrl,
  translations: { en: { meaning: en, origin: "contributor" } },
  challenge: {
    type: "learning",
    domain: "grammar",
    level: "A1",
    topic: {
      de: title,
      en:
        language === "en"
          ? "Grammar · be: am, is, are"
          : "Grammar · sein and haben",
    },
    questions,
  },
});

// Authored examples, checked against the linked reference tables on 2026-10-27.
// These A1 practice labels are not game-difficulty/editorial specialist approvals.
export const additionalGrammarSeeds: Entry[] = [
  grammarModule(
    "c4270000-0000-4000-8000-000000000001",
    "en",
    "Grammatik · be: am, is, are",
    "Im Präsens heißt be bei I am, bei he/she/it is und bei you/we/they are. Für eine Frage steht die Form vor dem Subjekt.",
    "In the present tense, be becomes am with I, is with he/she/it, and are with you/we/they. In questions it precedes the subject.",
    "I am ready. Are you ready?",
    "https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference/questions-negatives",
    [
      gap(
        "i-am",
        "en",
        "I ___ at the library.",
        ["am"],
        "I verlangt am.",
        "Use am with I.",
      ),
      gap(
        "you-are",
        "en",
        "___ you tired?",
        ["are"],
        "Auch in Fragen steht bei you die Form are.",
        "Use are with you, including in questions.",
      ),
      {
        id: "he-is",
        answerLanguage: "en",
        exercise: "comprehension",
        prompt: {
          de: "Welcher Satz ist richtig?",
          en: "Which sentence is correct?",
        },
        answers: ["He is hungry."],
        choices: ["He is hungry.", "He are hungry.", "He am hungry."],
        explanation: { de: "Bei he steht is.", en: "Use is with he." },
      },
      {
        id: "we-ready",
        answerLanguage: "en",
        exercise: "writing",
        prompt: {
          de: "Übersetze: Wir sind bereit.",
          en: "Translate into English: Wir sind bereit.",
        },
        answers: [
          "We are ready.",
          "We are ready",
          "We're ready.",
          "We're ready",
          "We’re ready.",
          "We’re ready",
        ],
        choices: [],
        explanation: {
          de: "Bei we steht are. Die Kurzform lautet we’re.",
          en: "Use are with we. The contracted form is we’re.",
        },
      },
    ],
  ),
  grammarModule(
    "c4270000-0000-4000-8000-000000000002",
    "de",
    "Grammatik · sein und haben",
    "Die Präsensformen von sein und haben sind unregelmäßig: ich bin/habe, du bist/hast, er/sie/es ist/hat, wir sind/haben. Hier werden die Verben als Vollverben geübt.",
    "Sein and haben have irregular present forms: ich bin/habe, du bist/hast, er/sie/es ist/hat, wir sind/haben. These tasks practise them as main verbs.",
    "Ich bin müde. Du hast Zeit.",
    "https://deutsch.lingolia.com/de/grammatik/verben/sein-haben",
    [
      gap(
        "ich-bin",
        "de",
        "Ich ___ heute zu Hause. (sein)",
        ["bin"],
        "Bei ich lautet sein: bin.",
        "With ich, sein becomes bin.",
      ),
      gap(
        "du-hast",
        "de",
        "Du ___ ein Buch. (haben)",
        ["hast"],
        "Bei du lautet haben: hast.",
        "With du, haben becomes hast.",
      ),
      {
        id: "wir-sind",
        answerLanguage: "de",
        exercise: "comprehension",
        prompt: {
          de: "Welcher Satz ist richtig?",
          en: "Which sentence is correct?",
        },
        answers: ["Wir sind hier."],
        choices: ["Wir sind hier.", "Wir seid hier.", "Wir ist hier."],
        explanation: {
          de: "Wir verlangt die Form sind.",
          en: "Use sind with wir.",
        },
      },
      {
        id: "wir-haben",
        answerLanguage: "de",
        exercise: "writing",
        prompt: {
          de: "Ergänze den ganzen Satz mit haben: Wir ___ Zeit.",
          en: "Complete the whole sentence with haben: Wir ___ Zeit.",
        },
        answers: ["Wir haben Zeit.", "Wir haben Zeit"],
        choices: [],
        explanation: {
          de: "Bei wir lautet die Form haben.",
          en: "With wir, use haben.",
        },
      },
    ],
  ),
];
