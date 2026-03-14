"use client";

// ─── Answer Reveal ────────────────────────────────────────────────────────────
// Shown after the clue is judged (answer_reveal phase).
// Displays the correct answer and host controls to advance.

import { useState } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { useGame } from "@/lib/contexts/game-context";

// Flavor text shown after answer reveal — rotated randomly for fun
const LOTR_FLAVOR = [
  "Even the smallest person can change the course of the future.",
  "All we have to decide is what to do with the time that is given to us.",
  "Not all those who wander are lost.",
  "I would rather share one lifetime with you than face all the ages of this world alone.",
  "Faithless is he who says farewell when the road darkens.",
  "Do not meddle in the affairs of wizards, for they are subtle and quick to anger.",
];

interface AnswerRevealProps {
  onAdvance: () => Promise<void>;
}

export default function AnswerReveal({ onAdvance }: AnswerRevealProps) {
  const { session, playerId } = useGame();
  const [loading, setLoading] = useState(false);

  if (!session?.currentClue) return null;

  const isHost = session.players.find((p) => p.id === playerId)?.isHost ?? false;
  // Pick a stable flavor quote based on the clue id
  const flavor = LOTR_FLAVOR[
    Math.abs(
      session.currentClue.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    ) % LOTR_FLAVOR.length
  ];

  const handleAdvance = async () => {
    setLoading(true);
    try {
      await onAdvance();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      {/* Correct answer */}
      <div className="space-y-2">
        <p
          className="text-xs font-semibold tracking-widest uppercase text-[var(--color-mithril)]"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          The Answer Was
        </p>
        <p
          className="text-2xl md:text-3xl font-black text-[var(--color-gold-light)]"
          style={{ fontFamily: "var(--font-cinzel-deco)" }}
        >
          {session.currentClue.correct_answer}
        </p>
      </div>

      {/* Flavor quote */}
      <p className="text-xs italic text-[var(--color-mithril)] max-w-xs mx-auto leading-relaxed">
        &ldquo;{flavor}&rdquo;
      </p>

      {/* Host: advance button */}
      {isHost && (
        <button
          onClick={handleAdvance}
          disabled={loading}
          className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded
                     bg-[var(--color-royal)] border border-[var(--color-gold-dim)]
                     text-[var(--color-parchment)] hover:border-[var(--color-gold)]
                     transition-colors text-sm font-semibold tracking-wide uppercase
                     disabled:opacity-50"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      {!isHost && (
        <p className="text-xs text-[var(--color-mithril)]">
          Waiting for the host to continue…
        </p>
      )}
    </div>
  );
}
