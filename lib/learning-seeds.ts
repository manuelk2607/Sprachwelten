import type { Entry } from "./content";
import type { LearningQuestion } from "./learning-content";
const base = {
  sense: "",
  hint: "",
  presentation: "text" as const,
  meaning: "",
  example: "",
  region: "",
  context: "",
  literal: "",
  culturalNote: "",
  authorName: "Redaktion",
  creditName: "",
  sourceLocale: "de" as const,
  status: "curated" as const,
  createdAt: "2026-10-26T00:00:00Z",
  revision: 1,
};
const vocabulary = [
  ["apple", "der Apfel", "I eat an apple.", "Ich esse einen Apfel."],
  ["water", "das Wasser", "The water is cold.", "Das Wasser ist kalt."],
  ["bread", "das Brot", "We buy bread.", "Wir kaufen Brot."],
  ["house", "das Haus", "The house is small.", "Das Haus ist klein."],
  ["book", "das Buch", "I read a book.", "Ich lese ein Buch."],
  ["table", "der Tisch", "The table is round.", "Der Tisch ist rund."],
  ["train", "der Zug", "The train is here.", "Der Zug ist hier."],
  ["friend", "der Freund", "My friend is here.", "Mein Freund ist hier."],
  ["morning", "der Morgen", "The morning is quiet.", "Der Morgen ist ruhig."],
  ["thank you", "danke", "Thank you for your help.", "Danke für deine Hilfe."],
];
export const learningSeeds: Entry[] = vocabulary.flatMap(
  ([en, de, enExample, deExample], index) =>
    (["en", "de"] as const).map((language, i) => {
      const phrase = language === "en" ? en : de,
        target = language === "en" ? "Englische" : "Deutsche",
        source = language === "en" ? de : en;
      return {
        ...base,
        id: `c4260000-0000-4000-8000-${String(index * 2 + i + 1).padStart(12, "0")}`,
        kind: "vocabulary" as const,
        phrase,
        language,
        literal: source,
        example: language === "en" ? enExample : deExample,
        sourceUrl:
          language === "en"
            ? "https://dictionary.cambridge.org/dictionary/english/" +
              en.replace(/ /g, "-")
            : "https://www.dwds.de/wb/" +
              encodeURIComponent(de.replace(/^(der|die|das) /, "")),
        challenge: {
          type: "learning" as const,
          domain: "vocabulary" as const,
          topic: {
            de: "Alltag · Übersetzen",
            en: "Everyday life · translation",
          },
          level: "A1" as const,
          questions: [
            {
              id: "recall",
              exercise: "recall" as const,
              prompt: {
                de: `Übersetze ins ${target}: „${source}“.${language==='de'&&en==='friend'?' Gemeint ist eine männliche Person.':''}${language === "de" && /^(der|die|das) /.test(de) ? " Gib bei Nomen den bestimmten Artikel an." : ""}`,
                en: `Translate into ${language === "en" ? "English" : "German"}: “${source}”.${language==='de'&&en==='friend'?' This refers to a male person.':''}${language === "de" && /^(der|die|das) /.test(de) ? " Include the definite article for nouns." : ""}`,
              },
              answers: en==='thank you'?(language==='de'?['danke','vielen Dank','danke schön']:['thank you','thanks']):[phrase],
              choices: [],
              explanation: {
                de: `${phrase} = ${source}. Beispiel: ${language === "en" ? enExample : deExample}`,
                en: `${phrase} = ${source}. Example: ${language === "en" ? enExample : deExample}`,
              },
            },
          ],
        },
      };
    }),
);
function grammar(
  id: number,
  language: string,
  title: string,
  rule: { de: string; en: string },
  example: string,
  questions: LearningQuestion[],
  sourceUrl: string,
): Entry {
  return {
    ...base,
    id: `c4260000-0000-4000-8000-${String(100 + id).padStart(12, "0")}`,
    kind: "grammar",
    language,
    phrase: title,
    meaning: rule.de,
    example,
    sourceUrl,
    translations: { en: { origin: "contributor", meaning: rule.en } },
    challenge: {
      type: "learning",
      domain: "grammar",
      topic: { de: "Grammatik · Präsens", en: "Grammar · present tense" },
      level: "A1",
      questions,
    },
  };
}
learningSeeds.push(
  grammar(
    1,
    "en",
    "Present simple: he, she, it",
    {
      de: "Bei regelmäßigen Verben steht im Present simple bei he, she und it ein -s. In Fragen mit does folgt dagegen die Grundform.",
      en: "In the present simple, regular verbs take -s with he, she and it. Questions with does use the base form.",
    },
    "She walks to school. Does she walk to school?",
    [
      {
        id: "gap",
        exercise: "gap",
        prompt: {
          de: "Ergänze walk: She ___ to the station every day.",
          en: "Complete with walk: She ___ to the station every day.",
        },
        answers: ["walks"],
        choices: [],
        explanation: {
          de: "She ist die dritte Person Singular: walk + s = walks.",
          en: "She is third person singular: walk + s = walks.",
        },
      },
      {
        id: "completion",
        exercise: "completion",
        prompt: {
          de: "Ergänze das fehlende Verb: Does she ___ to school? (walk)",
          en: "Complete the missing verb: Does she ___ to school? (walk)",
        },
        answers: ["walk"],
        choices: [],
        explanation: {
          de: "Nach does wird die Grundform walk verwendet.",
          en: "Use the base form walk after does.",
        },
      },
      {
        id: "understand",
        exercise: "comprehension",
        prompt: {
          de: "Welcher Satz beschreibt eine Gewohnheit korrekt?",
          en: "Which sentence correctly describes a habit?",
        },
        answers: ["He reads every evening."],
        choices: [
          "He reads every evening.",
          "He read every evening.",
          "He reading every evening.",
        ],
        explanation: {
          de: "He erfordert im Present simple die Form reads.",
          en: "He requires reads in the present simple.",
        },
      },
    ],
    "https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple",
  ),
  grammar(
    2,
    "de",
    "Präsens: regelmäßige Verben",
    {
      de: "Bei vielen regelmäßigen Verben steht bei ich die Endung -e und bei wir die Endung -en. Die Verbform richtet sich nach dem Subjekt.",
      en: "Many regular German verbs end in -e with ich and -en with wir in the present tense. The subject determines the verb form.",
    },
    "Ich lerne Deutsch. Wir lernen Deutsch.",
    [
      {
        id: "gap",
        exercise: "gap",
        prompt: {
          de: "Ergänze lernen: Ich ___ Deutsch.",
          en: "Complete with lernen: Ich ___ Deutsch.",
        },
        answers: ["lerne"],
        choices: [],
        explanation: {
          de: "Ich benötigt beim regelmäßigen Verb lernen die Form lerne.",
          en: "With ich, the regular verb lernen becomes lerne.",
        },
      },
      {
        id: "completion",
        exercise: "completion",
        prompt: {
          de: "Ergänze das Verb: Wir ___ zusammen. (lernen)",
          en: "Complete the verb: Wir ___ zusammen. (lernen)",
        },
        answers: ["lernen"],
        choices: [],
        explanation: {
          de: "Bei wir lautet die Form lernen.",
          en: "With wir, the form is lernen.",
        },
      },
      {
        id: "understand",
        exercise: "comprehension",
        prompt: {
          de: "Welcher Satz ist im Präsens richtig?",
          en: "Which sentence is correct in the present tense?",
        },
        answers: ["Ich spiele gern."],
        choices: ["Ich spiele gern.", "Ich spielen gern.", "Ich spielst gern."],
        explanation: {
          de: "Das regelmäßige Verb spielen erhält bei ich die Endung -e.",
          en: "The regular verb spielen takes the ending -e with ich.",
        },
      },
    ],
    "https://www.deutschakademie.de/online-deutschkurs/deutsche-grammatik/wortarten/verben/deutsche-zeitformen/praesens/",
  ),
);
// Fresh installations store each confirmed pair once. The historical export
// above remains available for compatibility and migration regression fixtures.
export const canonicalLearningSeeds:Entry[]=learningSeeds.filter(entry=>entry.kind==='grammar'||entry.language==='en').map(entry=>{
 if(entry.kind!=='vocabulary'||entry.challenge?.type!=='learning')return entry;
 const mirror=learningSeeds.find(e=>e.kind==='vocabulary'&&e.language==='de'&&e.phrase===entry.literal&&e.literal===entry.phrase);
 const other=mirror?.challenge;
 return {...entry,challenge:{...entry.challenge,questions:[],vocabulary:{translationLanguage:'de',translationExample:mirror?.example??'',reversible:true,termAlternatives:entry.challenge.questions[0]?.answers.filter(a=>a!==entry.phrase)??[],translationAlternatives:other?.type==='learning'?other.questions[0]?.answers.filter(a=>a!==entry.literal)??[]:[],context:entry.phrase==='friend'?{de:'Gemeint ist eine männliche Person.',en:'This refers to a male person.'}:{de:'',en:''}}}};
});
