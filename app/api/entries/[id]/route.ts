import { z } from 'zod';
import { explanationInput } from '@/lib/content';
import { account, body, respond, safe } from '@/lib/http';
import { addExplanation, getEntry, listExplanations, rateLimit } from '@/db/repository';
import { GameError } from '@/lib/game';
type Context = { params: Promise<{id: string}> };
export const GET = (_request: Request, ctx: Context) => safe(async () => {
  const id=z.string().uuid().parse((await ctx.params).id); const entry=await getEntry(id);
  if(!entry) throw new GameError('Dieser Beitrag wurde nicht gefunden.',404);
  return respond({entry, explanations:await listExplanations(id)});
});
export const POST = (request: Request, ctx: Context) => safe(async () => {
  const user=await account(); const id=z.string().uuid().parse((await ctx.params).id); const input=await body(request,explanationInput);
  if(!await getEntry(id)) throw new GameError('Dieser Beitrag wurde nicht gefunden.',404);
  await rateLimit(`explanation:${user.id}`,40); await addExplanation(id,input,user.id,user.name); return respond({ok:true},201);
});
