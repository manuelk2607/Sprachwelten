// Cloudflare compression may turn a strong ETag into a weak ETag. Both identify
// the same visible room version; authorization is checked separately in SQL.
export function roomVersion(etag:string|null){
  const match=/^(?:W\/)?"room-v(\d+)"$/.exec(etag??'');
  const version=match?Number(match[1]):-1;
  return Number.isSafeInteger(version)?version:-1;
}
