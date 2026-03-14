"use client";

// ─── Game Board (Client Orchestrator) ────────────────────────────────────────
// The root client component for the game page. It:
//   1. Reads the playerId from sessionStorage (set during lobby)
//   2. Wraps everything in GameProvider (SSE + action dispatchers)
//   3. Routes to the correct UI based on session.phase

import { useEffect, useState } from "react";
import { GameProvider, useGame } from "@/lib/contexts/game-context";
import type { ClientGameSession } from "@/types/game";
import WaitingRoom from "@/components/lobby/WaitingRoom";
import QuestionGenerationLoader from "@/components/special/QuestionGenerationLoader";
import JeopardyBoard from "@/components/board/JeopardyBoard";
import GameOverScreen from "@/components/special/GameOverScreen";
import FinalJeopardyModal from "@/components/special/FinalJeopardyModal";

interface GameBoardProps {
  sessionId: string;
  initialSession: ClientGameSession;
}

export default function GameBoard({ sessionId, initialSession }: GameBoardProps) {
  // Read the player's ID from sessionStorage — stored when they joined/created
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem(`lotr_player_${sessionId}`);
    setPlayerId(id);
  }, [sessionId]);

  return (
    <GameProvider
      sessionId={sessionId}
      playerId={playerId}
      initialSession={initialSession}
    >
      <PhaseRouter />
    </GameProvider>
  );
}

// Renders the correct UI based on the current game phase
// Must be rendered inside <GameProvider>
function PhaseRouter() {
  const { session } = useGame();

  if (!session) return null;

  switch (session.phase) {
    case "waiting":
      return <WaitingRoom />;

    case "generating":
      return <QuestionGenerationLoader />;

    case "board":
    case "clue_open":
    case "buzzed_in":
    case "answer_reveal":
    case "daily_double":
      // JeopardyBoard handles all active gameplay phases internally
      return <JeopardyBoard />;

    case "final_jeopardy":
      return <FinalJeopardyModal />;

    case "game_over":
      return <GameOverScreen />;

    default:
      return <WaitingRoom />;
  }
}
