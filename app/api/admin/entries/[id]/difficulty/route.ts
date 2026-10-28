import { z } from "zod";
import { requireAdministrator } from "@/lib/admin";
import { body, respond, safe } from "@/lib/http";
import { editorialReviewInput } from "@/lib/editorial-review-input";
import {
  getEditorialReview,
  saveEditorialReview,
  editorialAvailability,
} from "@/db/editorial-repository";
type Context = { params: Promise<{ id: string }> };
export const GET = (_: Request, ctx: Context) =>
  safe(async () => {
    await requireAdministrator();
    const id = z.uuid().parse((await ctx.params).id),
      state = await getEditorialReview(id);
    return respond({
      ...state,
      availability: await editorialAvailability(state.category, state.language),
    });
  });
export const PUT = (request: Request, ctx: Context) =>
  safe(async () => {
    const admin = await requireAdministrator(),
      id = z.uuid().parse((await ctx.params).id),
      input = await body(request, editorialReviewInput);
    await getEditorialReview(id);
    return respond(await saveEditorialReview(id, input, admin));
  });
