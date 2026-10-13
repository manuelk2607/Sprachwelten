import { getAuth } from '@/lib/auth/server';
type Handler = (request: Request, context: { params: Promise<{ path: string[] }> }) => Promise<Response>;
const handler = (method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'): Handler => async (request, context) => {
  try { return await getAuth().handler()[method](request, context); }
  catch { return Response.json({ error: { message: 'Die Anmeldung ist gerade nicht erreichbar.' } }, { status: 503 }); }
};
export const GET = handler('GET');
export const POST = handler('POST');
export const PUT = handler('PUT');
export const DELETE = handler('DELETE');
export const PATCH = handler('PATCH');
