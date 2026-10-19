export const roomStorageKey = (code: string) => `sprachwelten-room:${code}`;
export const savedRoomToken = (code: string) => {
  try {
    return /^[A-Z0-9]{6}$/.test(code)
      ? localStorage.getItem(roomStorageKey(code))
      : null;
  } catch {
    return null;
  }
};
export function forgetRoom(code: string) {
  localStorage.removeItem(roomStorageKey(code));
  window.dispatchEvent(new Event("sprachwelten-room-session"));
}
export const subscribeToRoomStorage = (listener: () => void) => {
  window.addEventListener("storage", listener);
  window.addEventListener("sprachwelten-room-session", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("sprachwelten-room-session", listener);
  };
};
export async function resumeRoom(
  code: string,
  token: string | null,
  fetcher: typeof fetch = fetch,
) {
  if (!token) return false;
  const response = await fetcher(`/api/rooms/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) return false;
  const data = (await response.json()) as { error?: string };
  throw new Error(data.error ?? "Der Raum ist gerade nicht erreichbar.");
}
