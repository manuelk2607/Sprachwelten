import type { Entry } from './content';
import type { Locale } from './translations';
const meanings = [
  'The real cause or the crucial point of a problem.',
  'To understand absolutely nothing about what is being discussed.',
  'To overlook or fail to notice something obvious.',
  'To stay reasonable and avoid exaggerating.',
  'To tell someone an invented story and make them believe it.',
  'Something is not your concern or responsibility.',
  'To reveal a secret or information that was being kept back.',
  'To ease the initial awkwardness when people meet.',
  'To feel slightly ill or unwell.',
  'It is now your turn to make a decision or take action.',
  'To face an unpleasant but necessary task with determination.',
  'To give up guessing and ask for the answer.',
  'To fail to turn up for an appointment and leave someone waiting.',
  'To feel sad, down or melancholic.',
  'To be distracted or have your thoughts somewhere else.',
  'To make a mistake or embarrass yourself with an awkward remark.',
  'To wish someone good luck with an upcoming task.',
  'There is no reason to worry; the situation is not dangerous.',
  'To suspect that something is wrong or not entirely honest.',
  'To get straight to the point without an introduction.',
];
const literals = ['', '', '', '', '', '', 'Spill the beans', 'Break the ice', 'Under the weather', 'The ball is on your side of the court', 'Bite the bullet', 'Give your tongue to the cat', 'Put down a rabbit', 'Have the cockroach', 'Be in the clouds', 'Put your paw in it', 'Into the wolf’s mouth!', 'No cow on the ice', 'Suspect owls in the marsh', 'Fall into the house with the door'];
const culturalNotes = [
  'It describes an underlying cause, not an actual dog.',
  'Informal; useful for explanations you cannot follow.',
  'Often playful, although the tone can also be accusatory.',
  'Often used to calm an exaggerated reaction.',
  'Describes deception, often a playful tall tale.',
  'Very informal and sometimes dismissive, depending on tone.',
  'Informal; often used about secrets and surprises.',
  'A similar metaphor is also used in German.',
  'Usually refers to minor discomfort, rather than a precise medical condition.',
  'A metaphor from sports such as tennis, often used about decisions.',
  'Emphasises overcoming reluctance or fear.',
  'Often used during riddles, meaning “I give up.”',
  'Informal; can refer to a date or another appointment.',
  'An informal expression for a low mood or melancholy.',
  'Often describes daydreaming or mental distraction.',
  'Informal; similar to putting your foot in it.',
  'A good-luck wish before exams or performances. Possible replies include “Crepi!” or “Grazie!”.',
  'A relaxed way of saying there is no immediate problem.',
  'Expresses mistrust of a suspicious situation.',
  'A similar image is also used in German.',
];
export function localizeEntry(entry: Entry, locale: Locale): Entry {
  if (locale !== 'en' || entry.status !== 'curated' || !entry.id.startsWith('10000000-0000-4000-8000-')) return entry;
  const index=Number(entry.id.slice(-12))-1;
  if(!meanings[index])return entry;
  return {...entry, meaning:meanings[index],literal:literals[index],culturalNote:culturalNotes[index]};
}
