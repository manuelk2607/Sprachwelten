/** Editorial readiness gate, deliberately not connected to a premature UI filter.
 * A level needs two full ten-round games per category/language before exposure.
 * No automatic classification by length, popularity or guessed familiarity.
 */
export const difficultyLevels=['introductory','intermediate','advanced'] as const;
export type DifficultyLevel=typeof difficultyLevels[number];
export type EditorialDifficulty={entryId:string;category:string;language:string;level:DifficultyLevel;reviewed:boolean;reviewedAt:string;sources:string[];rationale:string};
export const minimumReviewedPerLevel=20;
export function readyDifficultyLevels(records:EditorialDifficulty[],category:string,language:string):DifficultyLevel[]{
 return difficultyLevels.filter(level=>{
  const eligible=records.filter(record=>record.category===category&&record.language===language&&record.level===level&&record.reviewed&&
   /^\d{4}-\d{2}-\d{2}$/.test(record.reviewedAt)&&Number.isFinite(Date.parse(record.reviewedAt))&&record.reviewedAt<=new Date().toISOString().slice(0,10)&&
   record.rationale.trim().length>=20&&record.sources.length>0&&record.sources.every(source=>{try{return new URL(source).protocol==='https:';}catch{return false;}}));
  return new Set(eligible.map(record=>record.entryId).filter(Boolean)).size>=minimumReviewedPerLevel;
 });
}
