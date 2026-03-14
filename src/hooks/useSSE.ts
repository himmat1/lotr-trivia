"use client";

// ─── useSSE — Server-Sent Events Hook ────────────────────────────────────────
// Subscribes to the game SSE stream and calls onMessage with each parsed update.
// Automatically reconnects on connection drop (exponential backoff).

import { useEffect, useRef } from "react";

interface UseSSEOptions<T> {
  url: string;
  onMessage: (data: T) => void;
  onError?: (err: Event) => void;
  enabled?: boolean; // set to false to skip connecting (e.g. before session is ready)
}

export function useSSE<T>({ url, onMessage, onError, enabled = true }: UseSSEOptions<T>) {
  const reconnectDelay = useRef(1000); // milliseconds, doubles on each failure
  const esRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    function connect() {
      if (!mountedRef.current) return;

      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data: T = JSON.parse(event.data);
          onMessage(data);
          // Reset reconnect delay on successful message
          reconnectDelay.current = 1000;
        } catch (err) {
          console.warn("[SSE] Failed to parse message:", err);
        }
      };

      es.onerror = (err) => {
        onError?.(err);
        es.close();

        // Reconnect with exponential backoff (max 30s)
        if (mountedRef.current) {
          const delay = Math.min(reconnectDelay.current, 30000);
          reconnectDelay.current = delay * 2;
          console.log(`[SSE] Reconnecting in ${delay}ms...`);
          setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      esRef.current?.close();
      esRef.current = null;
    };
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
