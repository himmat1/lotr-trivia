"use client";

// ─── Answer Input ─────────────────────────────────────────────────────────────
// Shown only on the buzzing player's device after they buzz in.
// They type their answer; host sees and judges it.

import { useState } from "react";

export default function AnswerInput() {
  const [answer, setAnswer] = useState("");

  return (
    <div className="space-y-2">
      <p
        className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] text-center"
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        Your Answer (host will judge)
      </p>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer…"
        autoFocus
        className="w-full px-4 py-3 rounded bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                   text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                   focus:outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]
                   text-sm transition-colors"
        style={{ fontFamily: "var(--font-cinzel)" }}
      />
      <p className="text-xs text-[var(--color-mithril)] text-center">
        Say your answer out loud — host will mark it correct or wrong
      </p>
    </div>
  );
}
