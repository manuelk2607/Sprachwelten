"use client";
import { useEffect, useState } from "react";

export function useApiResource<T>(
  url: string | null,
  identity: string | number = "",
) {
  const key = JSON.stringify([url, identity]);
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as T & { error?: string };
        if (!response.ok)
          throw new Error(
            data.error ??
              "Gerade nicht erreichbar. Bitte versuche es gleich noch einmal.",
          );
        if (!controller.signal.aborted) setResult({ key, data, error: "" });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setResult({ key, data: null, error: (cause as Error).message });
      });
    return () => controller.abort();
  }, [url, key]);
  // A different identity/filter immediately hides the previous result, without
  // an intermediate render that exposes the old account's data or page.
  const current = url && result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: !!url && !current,
  };
}
