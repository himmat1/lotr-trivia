"use client";

// ─── Jeopardy Board ───────────────────────────────────────────────────────────
// Renders the full 6×5 grid during active gameplay phases.
// Also shows the ClueModal overlay when a tile is selected.

import { useState, useCallback } from "react";
import { useGame } from "@/lib/contexts/game-context";
import { ALL_CATEGORIES, ALL_POINT_VALUES } from "@/types/game";
import CategoryHeader from "./CategoryHeader";
import ClueTile from "./ClueTile";
import Scoreboard from "./Scoreboard";
import ClueModal from "@/components/clue/ClueModal";
import DailyDoubleModal from "@/components/special/DailyDoubleModal";

export default function JeopardyBoard() {
  const { session, playerId, selectClue } = useGame();
  // Track whether the opened tile turned out to be a Daily Double
  const [pendingDD, setPendingDD] = useState(false);

  const handleTileClick = useCallback(
    async (clueId: string) => {
      try {
        const { isDailyDouble } = await selectClue(clueId);
        if (isDailyDouble) setPendingDD(true);
      } catch (err) {
        console.error("Failed to select clue:", err);
      }
    },
    [selectClue]
  );

  if (!session) return null;

  const isMyTurn = session.currentPickerId === playerId;
  const isActivePhase = ["clue_open", "buzzed_in", "answer_reveal"].includes(session.phase);
  const isDDPhase = session.phase === "daily_double";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Main Board Area ── */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Turn indicator banner */}
        <div className="text-center">
          {isMyTurn && session.phase === "board" ? (
            <p
              className="text-sm text-[var(--color-gold)] tracking-widest uppercase animate-pulse"
              style={{ fontFamily: "var(--font-cinzel)" }}
            >
              Your turn — Choose a category
            </p>
          ) : session.phase === "board" ? (
            <p
              className="text-sm text-[var(--color-mithril)] tracking-widest uppercase"
              style={{ fontFamily: "var(--font-cinzel)" }}
            >
              {session.players.find((p) => p.id === session.currentPickerId)?.name ?? ""}
              &apos;s turn to choose
            </p>
          ) : null}
        </div>

        {/* 6-column grid: one column per category */}
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          {/* Category headers */}
          {ALL_CATEGORIES.map((category) => (
            <CategoryHeader key={category} name={category} />
          ))}

          {/* Clue tiles: 5 rows × 6 columns */}
          {ALL_POINT_VALUES.map((points) =>
            ALL_CATEGORIES.map((category) => {
              const clue = session.board[category]?.find((c) => c.points === points);
              if (!clue) return <div key={`${category}-${points}`} className="min-h-[70px]" />;

              return (
                <div key={clue.id} className="min-h-[70px]">
                  <ClueTile
                    clue={clue}
                    isActive={session.openClueId === clue.id}
                    isMyTurn={isMyTurn && session.phase === "board"}
                    onClick={() => handleTileClick(clue.id)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Scoreboard Sidebar ── */}
      <div className="lg:w-52 p-4 border-t lg:border-t-0 lg:border-l border-[var(--color-gold-dim)]">
        <Scoreboard />
      </div>

      {/* ── Clue Modal Overlay (active phases) ── */}
      {isActivePhase && session.currentClue && (
        <ClueModal onClose={() => setPendingDD(false)} />
      )}

      {/* ── Daily Double Modal ── */}
      {isDDPhase && session.currentClue && (
        <DailyDoubleModal onBetPlaced={() => setPendingDD(false)} />
      )}
    </div>
  );
}
