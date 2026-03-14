"use client";

// ─── Game Over Screen ─────────────────────────────────────────────────────────
// Shown when all 30 clues are answered and Final Jeopardy is complete.
// Displays final scores, announces the winner, and offers a "Play Again" button.

import { useRouter } from "next/navigation";
import { useGame } from "@/lib/contexts/game-context";
import { Crown, RefreshCw } from "lucide-react";

export default function GameOverScreen() {
  const { session } = useGame();
  const router = useRouter();

  if (!session) return null;

  // Sort players by score descending
  const ranked = [...session.players].sort((a, b) => b.score - a.score);
  const winner = ranked[0];

  const handlePlayAgain = () => {
    // Return to lobby — players can create a fresh game
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-10">
      {/* Trophy + title */}
      <div className="text-center space-y-4">
        <div className="text-7xl select-none animate-bounce">🏆</div>
        <h1
          className="text-4xl md:text-6xl font-black tracking-elvish text-gold-gradient"
          style={{ fontFamily: "var(--font-cinzel-deco)" }}
        >
          Quest Complete!
        </h1>
        {winner && (
          <p
            className="text-xl text-[var(--color-parchment)]"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            <span style={{ color: winner.color }}>{winner.name}</span>
            {" "}has mastered the lore of Middle-earth!
          </p>
        )}
      </div>

      {/* Final Scoreboard */}
      <div className="w-full max-w-md ring-border bg-[var(--color-navy-light)] p-6 space-y-3">
        <h2
          className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] text-center mb-4"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          Final Scores
        </h2>

        {ranked.map((player, rank) => (
          <div
            key={player.id}
            className="flex items-center justify-between px-4 py-3 rounded"
            style={{ backgroundColor: rank === 0 ? `${player.color}22` : "var(--color-navy)" }}
          >
            <div className="flex items-center gap-3">
              {rank === 0 ? (
                <Crown className="w-5 h-5" style={{ color: player.color }} />
              ) : (
                <span
                  className="w-5 h-5 text-center text-sm font-bold text-[var(--color-mithril)]"
                  style={{ fontFamily: "var(--font-cinzel)" }}
                >
                  {rank + 1}
                </span>
              )}
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span
                className="font-semibold text-[var(--color-parchment)]"
                style={{ fontFamily: "var(--font-cinzel)" }}
              >
                {player.name}
              </span>
            </div>

            <span
              className="text-lg font-black tabular-nums"
              style={{
                fontFamily: "var(--font-cinzel-deco)",
                color: player.score >= 0 ? "var(--color-gold)" : "var(--color-ember-light)",
              }}
            >
              {player.score < 0 ? `-$${Math.abs(player.score)}` : `$${player.score}`}
            </span>
          </div>
        ))}
      </div>

      {/* Flavor quote */}
      <p className="text-sm italic text-[var(--color-mithril)] text-center max-w-sm">
        &ldquo;The greatest adventure is what lies ahead.&rdquo;
        <br />
        <span className="text-xs not-italic">— J.R.R. Tolkien</span>
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button
          onClick={handlePlayAgain}
          className="flex items-center justify-center gap-2 w-full py-4 rounded
                     bg-[var(--color-gold)] text-[var(--color-navy)] font-bold
                     hover:bg-[var(--color-gold-light)] transition-colors
                     text-sm tracking-widest uppercase tile-glow"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          <RefreshCw className="w-4 h-4" />
          Play Again
        </button>
      </div>
    </div>
  );
}
