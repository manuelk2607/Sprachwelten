import {createHash} from 'node:crypto';
import {z} from 'zod';
import {database} from './repository';
import {regions} from '@/lib/quiz-categories';
import {GameError} from '@/lib/game';
import type {EntryInput} from '@/lib/content';
export const regionInput=z.object({de:z.string().trim().min(2).max(80).regex(/^[\p{L}\p{M}\d .,'’()/-]+$/u,'Bitte einen ausgeschriebenen Regionsnamen angeben.'),en:z.string().trim().max(80).default('')});
export async function listRegions(){return {...regions,...Object.fromEntries((await database()`SELECT id,de,en FROM content_regions ORDER BY de`).map(r=>[r.id,{de:r.de as string,en:r.en as string}]))};}
export async function addRegion(input:z.infer<typeof regionInput>,userId:string){const name=input.de.normalize('NFKC').replace(/\s+/g,' ').trim(),key=name.toLocaleLowerCase();const predefined=Object.entries(regions).find(([,v])=>[v.de.toLocaleLowerCase(),v.en.toLocaleLowerCase()].includes(key));if(predefined)return predefined[0];const id='custom-'+createHash('sha256').update(key).digest('hex').slice(0,16);const [row]=await database()`INSERT INTO content_regions(id,de,en,name_key,submitted_by) VALUES (${id},${name},${input.en||name},${key},${userId}) ON CONFLICT(name_key) DO UPDATE SET name_key=excluded.name_key RETURNING id`;return row.id as string;}
export async function validateRegion(input:EntryInput){if(input.regionId?.startsWith('custom-')){const [region]=await database()`SELECT de FROM content_regions WHERE id=${input.regionId}`;if(!region)throw new GameError('Bitte eine Region aus der Liste wählen.',422);input.region=region.de as string;}}
