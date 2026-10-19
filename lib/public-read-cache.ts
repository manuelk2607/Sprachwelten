export function publicReadCacheKey(request: Request) {
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    !["/api/languages", "/api/regions"].includes(url.pathname) ||
    url.search.length > 500
  )
    return null;
  if (url.pathname === "/api/regions") url.search = "";
  else url.searchParams.sort();
  // These endpoints contain only the public language/region registry.
  return new Request(url, { method: "GET" });
}
