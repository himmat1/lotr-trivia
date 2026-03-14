"use client";

// ─── Game Context ─────────────────────────────────────────────────────────────
// Provides the full game state to all client components and exposes action
// dispatchers that call the PATCH API then update local state from SSE.
//
// Architecture:
//   - SSE stream is the source of truth for all state updates
//   - PATCH actions trigger server-side state changes → SSE push → context update
//   - Local state is optimistically updated for immediate UI feedback where safe

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useSSE } from "@/hooks/useSSE";
import type { ClientGameSession, GameAction, CategoryName } from "@/types/game";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface GameContextType {
  session: ClientGameSession | null;
  sessionId: string;
  // The current player's identity (stored in sessionStorage by lobby)
  playerId: string | null;
  isConnected: boolean;
  error: string | null;

  // Game actions — each sends a PATCH and returns the updated session
  startGame: () => Promise<void>;
  selectClue: (clueId: string) => Promise<{ isDailyDouble: boolean }>;
  buzzIn: () => Promise<void>;
  scoreCorrect: (playerId: string) => Promise<void>;
  scoreWrong: (playerId: string) => Promise<void>;
  skipClue: () => Promise<void>;
  placeDailyDoubleBet: (amount: number) => Promise<void>;
  placeFinalJeopardyBet: (amount: number) => Promise<void>;
  submitFinalJeopardyAnswer: (answer: string) => Promise<void>;
  revealFinalJeopardy: () => Promise<void>;
  markGameOver: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface GameProviderProps {
  children: ReactNode;
  sessionId: string;
  playerId: string | null;
  initialSession: ClientGameSession;
}

export function GameProvider({
  children,
  sessionId,
  playerId,
  initialSession,
}: GameProviderProps) {
  const [session, setSession] = useState<ClientGameSession>(initialSession);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current session for use inside callbacks without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Subscribe to SSE stream — updates state on every server push
  useSSE<ClientGameSession>({
    url: `/api/game/${sessionId}/stream`,
    onMessage: (data) => {
      setSession(data);
      setIsConnected(true);
    },
    onError: () => {
      setIsConnected(false);
    },
  });

  // ─── API Action Dispatcher ─────────────────────────────────────────────────

  const dispatch = useCallback(
    async (action: GameAction): Promise<ClientGameSession> => {
      const res = await fetch(`/api/game/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Action failed");
      }

      const updated: ClientGameSession = await res.json();
      // SSE will also push this update, but local state update ensures immediacy
      setSession(updated);
      return updated;
    },
    [sessionId]
  );

  // ─── Action Methods ────────────────────────────────────────────────────────

  const startGame = useCallback(async () => {
    await dispatch({ type: "start_game" });
  }, [dispatch]);

  const selectClue = useCallback(
    async (clueId: string) => {
      const updated = await dispatch({ type: "select_clue", clueId });
      return {
        isDailyDouble: (updated as ClientGameSession & { revealedIsDailyDouble?: boolean })
          .revealedIsDailyDouble ?? false,
      };
    },
    [dispatch]
  );

  const buzzIn = useCallback(async () => {
    if (!playerId) return;
    await dispatch({ type: "buzz_in", playerId });
  }, [dispatch, playerId]);

  const scoreCorrect = useCallback(
    async (targetPlayerId: string) => {
      await dispatch({ type: "score_correct", playerId: targetPlayerId });
    },
    [dispatch]
  );

  const scoreWrong = useCallback(
    async (targetPlayerId: string) => {
      await dispatch({ type: "score_wrong", playerId: targetPlayerId });
    },
    [dispatch]
  );

  const skipClue = useCallback(async () => {
    await dispatch({ type: "skip_clue" });
  }, [dispatch]);

  const placeDailyDoubleBet = useCallback(
    async (amount: number) => {
      if (!playerId) return;
      await dispatch({ type: "place_dd_bet", playerId, amount });
    },
    [dispatch, playerId]
  );

  const placeFinalJeopardyBet = useCallback(
    async (amount: number) => {
      if (!playerId) return;
      await dispatch({ type: "place_fj_bet", playerId, amount });
    },
    [dispatch, playerId]
  );

  const submitFinalJeopardyAnswer = useCallback(
    async (answer: string) => {
      if (!playerId) return;
      await dispatch({ type: "submit_fj_answer", playerId, answer });
    },
    [dispatch, playerId]
  );

  const revealFinalJeopardy = useCallback(async () => {
    await dispatch({ type: "reveal_fj" });
  }, [dispatch]);

  const markGameOver = useCallback(() => {
    setSession((s) => ({ ...s, phase: "game_over" }));
  }, []);

  return (
    <GameContext.Provider
      value={{
        session,
        sessionId,
        playerId,
        isConnected,
        error,
        startGame,
        selectClue,
        buzzIn,
        scoreCorrect,
        scoreWrong,
        skipClue,
        placeDailyDoubleBet,
        placeFinalJeopardyBet,
        submitFinalJeopardyAnswer,
        revealFinalJeopardy,
        markGameOver,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside <GameProvider>");
  return ctx;
}
