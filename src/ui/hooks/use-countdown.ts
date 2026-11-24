"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Seconds-remaining countdown, e.g. for "Resend code in 0:42".
 * `start(n)` (re)starts it; `secondsLeft` reaches 0 when done.
 */
export function useCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const start = useCallback((seconds: number) => setSecondsLeft(seconds), []);

  return { secondsLeft, start, isRunning: secondsLeft > 0 };
}

/** 42 → "0:42" */
export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
