export const meaningCategories={all:'Alle Kategorien',expression:'Redewendungen & Dialekte',gaming:'Ping! Verstanden?',youth:'Generationenchat',academic:'Akademisch & alltäglich'} as const;
export type MeaningCategory=keyof typeof meaningCategories;
