"use client";

// ─── Clue Tile ────────────────────────────────────────────────────────────────
// Individual tile on the 6×5 Jeopardy board.
// States: available → active (being shown) → answered (greyed out)

import { cn } from "@/lib/utils";
import type { ClientTriviaClue } from "@/types/game";

interface ClueTileProps {
  clue: ClientTriviaClue;
  isActive: boolean;    // currently open / being shown
  isMyTurn: boolean;    // this device's player gets to pick
  onClick: () => void;
}

export default function ClueTile({ clue, isActive, isMyTurn, onClick }: ClueTileProps) {
  if (clue.isAnswered) {
    // Answered tiles are fully dimmed — no interaction
    return (
      <div className="tile-answered bg-[var(--color-shadow)] rounded flex items-center justify-center h-full min-h-[70px]" />
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!isMyTurn || isActive}
      className={cn(
        "w-full h-full min-h-[70px] rounded flex items-center justify-center",
        "bg-[var(--color-royal)] border border-[var(--color-gold-dim)]",
        "transition-all duration-150 cursor-pointer select-none",
        // Active state: highlighted border
        isActive && "ring-2 ring-[var(--color-gold-light)] tile-glow",
        // My-turn hover: scale up slightly + gold glow
        isMyTurn && !isActive && "hover:bg-[var(--color-royal-hover)] hover:tile-glow hover:scale-[1.03]",
        // Not my turn: muted appearance
        !isMyTurn && "opacity-80 cursor-not-allowed"
      )}
      title={isMyTurn ? `Select for $${clue.points}` : "Wait for your turn"}
    >
      <span
        className="text-[var(--color-gold)] font-black text-lg md:text-2xl tabular-nums tracking-tight"
        style={{ fontFamily: "var(--font-cinzel-deco)" }}
      >
        ${clue.points}
      </span>
    </button>
  );
}
