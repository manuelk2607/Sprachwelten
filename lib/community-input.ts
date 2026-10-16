import {z} from 'zod';
import {regions,contexts} from './quiz-categories';
import {entryInput} from './content';
export const entryEditInput=z.object({revision:z.number().int().min(0),note:z.string().trim().max(1000).default('')}).passthrough().transform(data=>({revision:data.revision,note:data.note,input:entryInput.parse(data)}));
export const bulkInput=z.object({entries:z.array(z.object({id:z.uuid(),revision:z.number().int().min(0)})).min(1).max(30),kind:z.enum(['idiom','dialect','word','situation','tongue_twister']).optional(),regionId:z.string().refine(v=>v in regions||/^custom-[a-z0-9]{16}$/.test(v),'Bitte eine Region aus der Liste wählen.').optional(),contextId:z.string().refine(v=>v in contexts,'Bitte einen Gesprächskontext aus der Liste wählen.').optional()}).refine(v=>!!(v.kind||v.regionId||v.contextId),'Bitte eine Änderung für die Auswahl angeben.').refine(v=>new Set(v.entries.map(e=>e.id)).size===v.entries.length,'Bitte jeden Beitrag nur einmal auswählen.');
