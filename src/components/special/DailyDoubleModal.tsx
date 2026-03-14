"use client";

// ─── Daily Double Modal ───────────────────────────────────────────────────────
// Shown when the selected tile is a Daily Double.
// The selecting player places a bet before seeing the clue.
// Bet range: min $100, max current score (or $1000 if score ≤ 0).

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useGame } from "@/lib/contexts/game-context";

interface DailyDoubleModalProps {
  onBetPlaced: () => void;
}

export default function DailyDoubleModal({ onBetPlaced }: DailyDoubleModalProps) {
  const { session, playerId, placeDailyDoubleBet } = useGame();
  const [bet, setBet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session?.currentClue) return null;

  const currentPlayer = session.players.find((p) => p.id === playerId);
  const isSelector = session.currentPickerId === playerId;
  const maxBet = Math.max((currentPlayer?.score ?? 0), 1000);
  const minBet = 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(bet, 10);
    if (isNaN(amount) || amount < minBet || amount > maxBet) {
      setError(`Bet must be between $${minBet} and $${maxBet}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await placeDailyDoubleBet(amount);
      onBetPlaced();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-md ring-border bg-[var(--color-navy-light)] p-8 space-y-6 rounded-lg text-center">
        {/* Daily Double Header */}
        <div className="space-y-2">
          <div className="tile-glow-dd rounded-lg py-4 bg-[var(--color-royal)]">
            <p
              className="text-4xl font-black text-gold-gradient tracking-elvish"
              style={{ fontFamily: "var(--font-cinzel-deco)" }}
            >
              Daily Double!
            </p>
          </div>
          <p
            className="text-sm text-[var(--color-mithril)]"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            {session.currentClue.category}
          </p>
        </div>

        {/* Bet Form — only shown to the selecting player */}
        {isSelector ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <p
                className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)]"
                style={{ fontFamily: "var(--font-cinzel)" }}
              >
                Place Your Wager
              </p>
              <p className="text-xs text-[var(--color-mithril)]">
                Current score: <span className="text-[var(--color-parchment)] font-bold">${currentPlayer?.score ?? 0}</span>
                &nbsp;· Range: ${minBet}–${maxBet}
              </p>
            </div>

            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              placeholder={`$100 – $${maxBet}`}
              min={minBet}
              max={maxBet}
              autoFocus
              className="w-full px-4 py-3 text-center text-xl font-bold rounded
                         bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                         text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                         focus:outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]"
              style={{ fontFamily: "var(--font-cinzel)" }}
            />

            {/* Quick bet buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
              {[500, 1000, Math.floor(maxBet / 2), maxBet]
                .filter((v, i, arr) => arr.indexOf(v) === i && v >= minBet && v <= maxBet)
                .map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBet(String(v))}
                    className="px-3 py-1 text-xs rounded border border-[var(--color-gold-dim)]
                               text-[var(--color-gold)] hover:bg-[var(--color-royal)] transition-colors"
                    style={{ fontFamily: "var(--font-cinzel)" }}
                  >
                    ${v}
                  </button>
                ))}
            </div>

            {error && (
              <p className="text-sm text-[var(--color-ember-light)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !bet}
              className="w-full py-3 rounded bg-[var(--color-gold)] text-[var(--color-navy)]
                         font-bold hover:bg-[var(--color-gold-light)] transition-colors
                         disabled:opacity-50 text-sm tracking-widest uppercase"
              style={{ fontFamily: "var(--font-cinzel)" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                "Lock In Wager"
              )}
            </button>
          </form>
        ) : (
          /* Other players wait while the selector places their bet */
          <div className="space-y-3 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-gold)] mx-auto" />
            <p
              className="text-sm text-[var(--color-mithril)]"
              style={{ fontFamily: "var(--font-cinzel)" }}
            >
              {session.players.find((p) => p.id === session.currentPickerId)?.name} is placing their wager…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
