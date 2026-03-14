"use client";

// ─── useTimer — Countdown Timer Hook ─────────────────────────────────────────
// Drift-free countdown using performance.now() rather than setInterval alone.
// Supports pause/resume/reset for buzz-in and Daily Double flows.

import { useState, useEffect, useRef, useCallback } from "react";

interface UseTimerOptions {
  duration: number;      // total seconds for the countdown
  onExpire?: () => void; // called when timer reaches 0
  autoStart?: boolean;   // start immediately (default: false)
}

interface UseTimerReturn {
  timeLeft: number;       // seconds remaining (integer)
  isRunning: boolean;
  isExpired: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (newDuration?: number) => void;
}

export function useTimer({
  duration,
  onExpire,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isExpired, setIsExpired] = useState(false);

  // Track the absolute end time for drift-free countdown
  const endTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);

  // Keep onExpire ref current without re-subscribing
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;

    const remaining = Math.max(0, endTimeRef.current - performance.now());
    const secondsLeft = Math.ceil(remaining / 1000);

    setTimeLeft(secondsLeft);

    if (remaining <= 0) {
      setIsRunning(false);
      setIsExpired(true);
      onExpireRef.current?.();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Start / resume the timer
  const start = useCallback(() => {
    setIsExpired(false);
    setIsRunning(true);
    endTimeRef.current = performance.now() + timeLeft * 1000;
    rafRef.current = requestAnimationFrame(tick);
  }, [timeLeft, tick]);

  const pause = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsRunning(false);
    // Store remaining time so resume knows where to pick up
    if (endTimeRef.current) {
      const remaining = Math.max(0, endTimeRef.current - performance.now());
      setTimeLeft(Math.ceil(remaining / 1000));
    }
  }, []);

  const resume = useCallback(() => {
    if (isExpired) return;
    setIsRunning(true);
    endTimeRef.current = performance.now() + timeLeft * 1000;
    rafRef.current = requestAnimationFrame(tick);
  }, [isExpired, timeLeft, tick]);

  const reset = useCallback(
    (newDuration?: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const d = newDuration ?? duration;
      setTimeLeft(d);
      setIsRunning(false);
      setIsExpired(false);
      endTimeRef.current = null;
    },
    [duration]
  );

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) start();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { timeLeft, isRunning, isExpired, start, pause, resume, reset };
}
