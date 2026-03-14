"use client";

// ─── Scoreboard ───────────────────────────────────────────────────────────────
// Always-visible sidebar showing all player names, scores, and turn indicator.
// Score changes animate with a pop + colour flash (gold for gain, red for loss).

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/contexts/game-context";
import type { Player } from "@/types/game";
import { Crown, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Scoreboard() {
  const { session, playerId } = useGame();
  if (!session) return null;

  // Sort players by score descending for live leaderboard feel
  const sorted = [...session.players].sort((a, b) => b.score - a.score);

  return (
    <aside className="flex flex-col gap-1 w-full">
      <h2
        className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] mb-2 px-1"
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        Scores
      </h2>
      {sorted.map((player, rank) => (
        <PlayerRow
          key={player.id}
          player={player}
          rank={rank}
          isCurrentTurn={player.id === session.currentPickerId}
          isMe={player.id === playerId}
          isBuzzed={player.id === session.activeBuzzerId}
        />
      ))}
    </aside>
  );
}

interface PlayerRowProps {
  player: Player;
  rank: number;
  isCurrentTurn: boolean;
  isMe: boolean;
  isBuzzed: boolean;
}

function PlayerRow({ player, rank, isCurrentTurn, isMe, isBuzzed }: PlayerRowProps) {
  const prevScore = useRef(player.score);
  const [flash, setFlash] = useState<"gain" | "loss" | null>(null);

  // Detect score changes and trigger the pop animation
  useEffect(() => {
    if (player.score !== prevScore.current) {
      setFlash(player.score > prevScore.current ? "gain" : "loss");
      prevScore.current = player.score;
      const t = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(t);
    }
  }, [player.score]);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded transition-all",
        isCurrentTurn && "ring-1 ring-[var(--color-gold)] bg-[var(--color-royal)]",
        isBuzzed && "ring-2 ring-[var(--color-gold-light)] bg-[var(--color-royal-hover)]",
        !isCurrentTurn && !isBuzzed && "bg-[var(--color-navy-light)]"
      )}
    >
      {/* Rank + name */}
      <div className="flex items-center gap-2 min-w-0">
        {rank === 0 ? (
          <Crown className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-gold)]" />
        ) : (
          <span className="w-3.5 h-3.5 flex-shrink-0 text-center text-xs text-[var(--color-mithril)]">
            {rank + 1}
          </span>
        )}
        {/* Player colour dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: player.color }}
        />
        <span
          className={cn(
            "text-xs truncate",
            isMe ? "text-[var(--color-gold)]" : "text-[var(--color-parchment)]"
          )}
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          {player.name}
          {isMe && <span className="text-[var(--color-mithril)] ml-1">★</span>}
        </span>
      </div>

      {/* Score + connection */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={cn(
            "text-sm font-bold tabular-nums transition-colors",
            flash === "gain" && "text-[var(--color-forest)] score-pop",
            flash === "loss" && "text-[var(--color-ember-light)] score-pop",
            !flash && "text-[var(--color-parchment)]"
          )}
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          {player.score < 0 ? `-$${Math.abs(player.score)}` : `$${player.score}`}
        </span>
        {player.isConnected ? (
          <Wifi className="w-3 h-3 text-[var(--color-forest)]" />
        ) : (
          <WifiOff className="w-3 h-3 text-[var(--color-mithril)]" />
        )}
      </div>
    </div>
  );
}
