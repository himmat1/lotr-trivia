"use client";

// ─── Clue Modal ───────────────────────────────────────────────────────────────
// Full-screen overlay shown when a clue tile is active.
// Manages the 30-second timer, buzz-in flow, answer judging, and reveal.
//
// Phase transitions handled here:
//   clue_open → (player buzzes) → buzzed_in → (host judges) → answer_reveal
//   answer_reveal → (host continues) → board

import { useEffect } from "react";
import { useGame } from "@/lib/contexts/game-context";
import { useTimer } from "@/hooks/useTimer";
import TimerBar from "./TimerBar";
import BuzzInButton from "./BuzzInButton";
import AnswerReveal from "./AnswerReveal";
import AnswerInput from "./AnswerInput";

const CLUE_DURATION = 30; // seconds

interface ClueModalProps {
  onClose: () => void;
}

export default function ClueModal({ onClose }: ClueModalProps) {
  const { session, playerId, skipClue, scoreCorrect, scoreWrong } = useGame();

  const { timeLeft, isExpired, start, pause, reset } = useTimer({
    duration: CLUE_DURATION,
    onExpire: () => {
      // Timer ran out with no buzz-in — skip the clue
      if (session?.phase === "clue_open") {
        skipClue().catch(console.error);
      }
    },
  });

  const phase = session?.phase;
  const clue = session?.currentClue;
  const isHost = session?.players.find((p) => p.id === playerId)?.isHost ?? false;
  const buzzedPlayer = session?.players.find((p) => p.id === session?.activeBuzzerId);

  // Start timer when the clue opens, pause when someone buzzes in
  useEffect(() => {
    if (phase === "clue_open") {
      reset();
      start();
    } else if (phase === "buzzed_in") {
      pause();
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance from answer_reveal back to board (or final jeopardy)
  const handleAdvance = async () => {
    // PATCH with advance action — server decides next phase
    await fetch(`/api/game/${session?.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "advance_reveal" }),
    });
    // SSE will push updated state; no local state update needed here
    onClose();
  };

  if (!clue || !session) return null;

  return (
    // Full-screen overlay with dark navy background
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl ring-border bg-[var(--color-navy-light)] p-8 space-y-6 rounded-lg">
        {/* Category + point value */}
        <div className="text-center space-y-1">
          <p
            className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)]"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            {clue.category}
          </p>
          <p
            className="text-4xl font-black text-[var(--color-gold-light)]"
            style={{ fontFamily: "var(--font-cinzel-deco)" }}
          >
            ${clue.points}
          </p>
        </div>

        {/* Clue text — parchment colour, large */}
        <div className="bg-[var(--color-royal)] rounded-lg p-6 text-center min-h-[100px] flex items-center justify-center">
          <p
            className="text-xl md:text-2xl text-[var(--color-parchment)] leading-relaxed"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            {clue.clue}
          </p>
        </div>

        {/* ── Phase-specific content ── */}

        {/* clue_open: timer + buzz-in button */}
        {phase === "clue_open" && (
          <div className="space-y-4">
            <TimerBar timeLeft={timeLeft} total={CLUE_DURATION} />
            <BuzzInButton />

            {/* Host skip button */}
            {isHost && (
              <button
                onClick={() => skipClue().catch(console.error)}
                className="w-full py-2 text-xs text-[var(--color-mithril)] hover:text-[var(--color-parchment)]
                           border border-[var(--color-gold-dim)] rounded transition-colors"
                style={{ fontFamily: "var(--font-cinzel)" }}
              >
                Skip / Time Out
              </button>
            )}
          </div>
        )}

        {/* buzzed_in: show who buzzed; host sees judge buttons; buzzer sees answer input */}
        {phase === "buzzed_in" && (
          <div className="space-y-4">
            <BuzzInButton />

            {/* Buzzing player's answer input */}
            {session.activeBuzzerId === playerId && (
              <AnswerInput />
            )}

            {/* Host judge controls */}
            {isHost && buzzedPlayer && (
              <div className="flex gap-3">
                <button
                  onClick={() => scoreCorrect(buzzedPlayer.id).catch(console.error)}
                  className="flex-1 py-3 rounded bg-[var(--color-forest)] text-white font-bold
                             hover:opacity-90 transition-opacity text-sm tracking-wide uppercase"
                  style={{ fontFamily: "var(--font-cinzel)" }}
                >
                  ✓ Correct
                </button>
                <button
                  onClick={() => scoreWrong(buzzedPlayer.id).catch(console.error)}
                  className="flex-1 py-3 rounded bg-[var(--color-ember)] text-white font-bold
                             hover:opacity-90 transition-opacity text-sm tracking-wide uppercase"
                  style={{ fontFamily: "var(--font-cinzel)" }}
                >
                  ✗ Wrong
                </button>
              </div>
            )}
          </div>
        )}

        {/* answer_reveal: show correct answer + advance button */}
        {phase === "answer_reveal" && (
          <AnswerReveal onAdvance={handleAdvance} />
        )}
      </div>
    </div>
  );
}
