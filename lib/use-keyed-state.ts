"use client";
import { useCallback, useState, type SetStateAction } from "react";
export function useKeyedState<T>(
  key: string,
  initial: T,
): [T, (next: SetStateAction<T>) => void] {
  const [initialValue] = useState(() => initial);
  const [state, setState] = useState({ key, value: initialValue });
  const update = useCallback(
    (next: SetStateAction<T>) =>
      setState((previous) => {
        const value = previous.key === key ? previous.value : initialValue;
        return {
          key,
          value:
            typeof next === "function"
              ? (next as (value: T) => T)(value)
              : next,
        };
      }),
    [key, initialValue],
  );
  return [state.key === key ? state.value : initialValue, update];
}
