import { account } from "@/lib/http";
import { updateOwnProfile, accountMutationSchema } from "@/lib/profile-handler";
import { getAuth } from "@/lib/auth/server";
type Handler = (
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) => Promise<Response>;
const handler =
  (method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"): Handler =>
  async (request, context) => {
    const schema = accountMutationSchema((await context.params).path);
    if (schema)
      return updateOwnProfile(
        request,
        account,
        (validated) => getAuth().handler().POST(validated, context),
        schema,
      );
    try {
      return await getAuth().handler()[method](request, context);
    } catch {
      return Response.json(
        { error: { message: "Die Anmeldung ist gerade nicht erreichbar." } },
        { status: 503 },
      );
    }
  };
export const GET = handler("GET");
export const POST = handler("POST");
export const PUT = handler("PUT");
export const DELETE = handler("DELETE");
export const PATCH = handler("PATCH");
