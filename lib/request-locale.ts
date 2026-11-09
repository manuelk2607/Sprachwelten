export function withRequestLocale(request: Request) {
  const url = new URL(request.url),
    headers = new Headers(request.headers);
  const locale =
    url.pathname === "/en" ||
    url.pathname.startsWith("/en/") ||
    (["/", "/worlds-migration"].includes(url.pathname) && url.searchParams.get("lang") === "en")
      ? "en"
      : "de";
  headers.set("x-sprachwelten-locale", locale);
  return new Request(request, { headers });
}
