import { respond, safe } from "@/lib/http";
import { getAuth } from "@/lib/auth/server";
import { learningCatalog, learningLanguages } from "@/db/learning-repository";
import { learningFilter } from "@/lib/learning-content";
export const GET = (request: Request) =>
  safe(async () => {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const { data } = await getAuth().getSession();
    const filter = learningFilter.parse(params);
    return respond({
      ...(await learningCatalog(
        filter,
        data?.user?.id,
        Math.max(0, Math.min(10000, Number(params.offset) || 0)),
      )),
      languages: await learningLanguages(),
    });
  });
