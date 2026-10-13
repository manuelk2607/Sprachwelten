declare namespace Cloudflare {
  interface Env {
    DATABASE_URL: string;
    NEON_AUTH_BASE_URL: string;
    NEON_AUTH_COOKIE_SECRET: string;
    ASSETS?: Fetcher;
  }
}
