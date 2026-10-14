'use client';
export type AuthClient = ReturnType<typeof import('@neondatabase/auth/next').createAuthClient>;

let clientPromise: Promise<AuthClient> | undefined;

// The SDK generates a random ID when imported. Cloudflare forbids that during
// global Worker initialization, so only import it after the browser mounts.
export function getAuthClient(): Promise<AuthClient> {
  if (typeof window === 'undefined') throw new Error('Auth client requires a browser.');
  return clientPromise ??= import('@neondatabase/auth/next')
    .then(({ createAuthClient }) => createAuthClient())
    .catch(error => { clientPromise = undefined; throw error; });
}
