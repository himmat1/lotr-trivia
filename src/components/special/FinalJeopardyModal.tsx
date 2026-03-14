"use client";

// ─── Final Jeopardy Modal ─────────────────────────────────────────────────────
// Three sub-phases:
//   1. "betting"  — all players enter their wager (hidden from others)
//   2. "answering" — clue revealed, players type answers (90s timer)
//   3. "reveal"  — host judges each player's answer one-by-one, scores update

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useGame } from "@/lib/contexts/game-context";
import { useTimer } from "@/hooks/useTimer";
import TimerBar from "@/components/clue/TimerBar";
import { cn } from "@/lib/utils";

const ANSWER_DURATION = 90;

export default function FinalJeopardyModal() {
  const {
    session,
    playerId,
    placeFinalJeopardyBet,
    submitFinalJeopardyAnswer,
    revealFinalJeopardy,
    scoreCorrect,
    scoreWrong,
    markGameOver,
  } = useGame();

  const [bet, setBet] = useState("");
  const [answer, setAnswer] = useState("");
  const [betLocked, setBetLocked] = useState(false);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track which players have been scored during reveal
  const [scoredPlayers, setScoredPlayers] = useState<Set<string>>(new Set());

  const { timeLeft, start: startTimer, isExpired } = useTimer({
    duration: ANSWER_DURATION,
    onExpire: () => {
      // Auto-submit empty answer if timer expires and not yet locked
      if (!answerLocked) handleSubmitAnswer();
    },
  });

  if (!session?.finalJeopardy) return null;

  const fj = session.finalJeopardy;
  const currentPlayer = session.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const maxBet = Math.max(currentPlayer?.score ?? 0, 0);

  // ── Betting Phase ──────────────────────────────────────────────────────────

  const handleSubmitBet = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(bet, 10);
    if (isNaN(amount) || amount < 0 || amount > maxBet) {
      setError(`Bet must be between $0 and $${maxBet}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await placeFinalJeopardyBet(amount);
      setBetLocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setLoading(false);
    }
  };

  // ── Answering Phase ────────────────────────────────────────────────────────

  const handleSubmitAnswer = async () => {
    if (answerLocked) return;
    setAnswerLocked(true);
    try {
      await submitFinalJeopardyAnswer(answer);
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  };

  // Start answering timer when phase changes to "answering"
  // (useEffect not used here to avoid dependency management — the timer starts
  //  when the component re-renders with phase="answering")

  // ── Reveal Phase ───────────────────────────────────────────────────────────

  const handleRevealStart = async () => {
    setLoading(true);
    try {
      await revealFinalJeopardy();
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async (targetPlayerId: string, correct: boolean) => {
    try {
      if (correct) await scoreCorrect(targetPlayerId);
      else await scoreWrong(targetPlayerId);
      setScoredPlayers((s) => new Set([...s, targetPlayerId]));
    } catch (err) {
      console.error("Score failed:", err);
    }
  };

  const handleEndGame = () => markGameOver();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-navy)]/95 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl ring-border bg-[var(--color-navy-light)] p-8 space-y-6 rounded-lg my-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <p
            className="text-5xl font-black text-gold-gradient tracking-elvish"
            style={{ fontFamily: "var(--font-cinzel-deco)" }}
          >
            Final Jeopardy
          </p>
          <p
            className="text-sm text-[var(--color-mithril)] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            {fj.clue.category}
          </p>
        </div>

        {/* ── Betting Phase ── */}
        {fj.phase === "betting" && (
          <BettingPhase
            bet={bet}
            setBet={setBet}
            betLocked={betLocked}
            maxBet={maxBet}
            loading={loading}
            error={error}
            onSubmit={handleSubmitBet}
            lockedCount={fj.lockedBets.length}
            totalPlayers={session.players.length}
            isHost={isHost}
          />
        )}

        {/* ── Answering Phase ── */}
        {fj.phase === "answering" && (
          <AnsweringPhase
            clue={fj.clue.clue}
            answer={answer}
            setAnswer={setAnswer}
            answerLocked={answerLocked}
            onSubmit={handleSubmitAnswer}
            timeLeft={timeLeft}
            startTimer={startTimer}
            lockedCount={fj.lockedAnswers.length}
            totalPlayers={session.players.length}
            isHost={isHost}
            onReveal={handleRevealStart}
            loading={loading}
          />
        )}

        {/* ── Reveal Phase ── */}
        {fj.phase === "reveal" && (
          <RevealPhase
            session={session}
            fj={fj}
            isHost={isHost}
            scoredPlayers={scoredPlayers}
            onScore={handleScore}
            onEndGame={handleEndGame}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BettingPhase({
  bet, setBet, betLocked, maxBet, loading, error, onSubmit, lockedCount, totalPlayers, isHost,
}: {
  bet: string; setBet: (v: string) => void; betLocked: boolean;
  maxBet: number; loading: boolean; error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  lockedCount: number; totalPlayers: number; isHost: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-[var(--color-mithril)]" style={{ fontFamily: "var(--font-cinzel)" }}>
        Place your secret wager. The clue will be revealed once all players have bet.
      </p>

      {!betLocked ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1 text-center">
            <p className="text-xs text-[var(--color-gold)]" style={{ fontFamily: "var(--font-cinzel)" }}>
              Your wager (max ${maxBet})
            </p>
            <input
              type="number" value={bet} onChange={(e) => setBet(e.target.value)}
              placeholder={`$0 – $${maxBet}`} min={0} max={maxBet} autoFocus
              className="w-full px-4 py-3 text-center text-xl font-bold rounded
                         bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                         text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                         focus:outline-none focus:border-[var(--color-gold)]"
              style={{ fontFamily: "var(--font-cinzel)" }}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-ember-light)] text-center">{error}</p>}
          <button type="submit" disabled={loading || !bet}
            className="w-full py-3 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-bold
                       hover:bg-[var(--color-gold-light)] transition-colors disabled:opacity-50 text-sm uppercase tracking-widest"
            style={{ fontFamily: "var(--font-cinzel)" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Lock In Wager"}
          </button>
        </form>
      ) : (
        <div className="text-center py-4 space-y-2">
          <p className="text-lg text-[var(--color-forest)]" style={{ fontFamily: "var(--font-cinzel)" }}>✓ Wager locked!</p>
          <p className="text-xs text-[var(--color-mithril)]">Waiting for other players…</p>
        </div>
      )}

      <p className="text-xs text-center text-[var(--color-mithril)]">
        {lockedCount} / {totalPlayers} players have locked in their wagers
      </p>
    </div>
  );
}

function AnsweringPhase({
  clue, answer, setAnswer, answerLocked, onSubmit, timeLeft, startTimer,
  lockedCount, totalPlayers, isHost, onReveal, loading,
}: {
  clue: string; answer: string; setAnswer: (v: string) => void;
  answerLocked: boolean; onSubmit: () => void;
  timeLeft: number; startTimer: () => void;
  lockedCount: number; totalPlayers: number;
  isHost: boolean; onReveal: () => void; loading: boolean;
}) {
  // Start timer on first render of answering phase
  useState(() => { startTimer(); });

  return (
    <div className="space-y-6">
      {/* Clue */}
      <div className="bg-[var(--color-royal)] rounded-lg p-6 text-center">
        <p className="text-xl text-[var(--color-parchment)] leading-relaxed" style={{ fontFamily: "var(--font-cinzel)" }}>
          {clue}
        </p>
      </div>

      <TimerBar timeLeft={timeLeft} total={90} />

      {!answerLocked ? (
        <div className="space-y-3">
          <textarea
            value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus
            placeholder="Type your answer here…" rows={3}
            className="w-full px-4 py-3 rounded bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                       text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                       focus:outline-none focus:border-[var(--color-gold)] resize-none text-sm"
            style={{ fontFamily: "var(--font-cinzel)" }}
          />
          <button onClick={onSubmit}
            className="w-full py-3 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-bold
                       hover:bg-[var(--color-gold-light)] transition-colors text-sm uppercase tracking-widest"
            style={{ fontFamily: "var(--font-cinzel)" }}>
            Lock In Answer
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-[var(--color-forest)] font-semibold" style={{ fontFamily: "var(--font-cinzel)" }}>✓ Answer locked!</p>
        </div>
      )}

      <p className="text-xs text-center text-[var(--color-mithril)]">
        {lockedCount} / {totalPlayers} players have locked in answers
      </p>

      {isHost && (
        <button onClick={onReveal} disabled={loading}
          className="w-full py-3 rounded border border-[var(--color-gold-dim)] text-[var(--color-gold)]
                     hover:bg-[var(--color-royal)] transition-colors text-sm uppercase tracking-widest"
          style={{ fontFamily: "var(--font-cinzel)" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Reveal Answers (Host)"}
        </button>
      )}
    </div>
  );
}

function RevealPhase({
  session, fj, isHost, scoredPlayers, onScore, onEndGame,
}: {
  session: ReturnType<typeof useGame>["session"];
  fj: NonNullable<NonNullable<ReturnType<typeof useGame>["session"]>["finalJeopardy"]>;
  isHost: boolean; scoredPlayers: Set<string>;
  onScore: (id: string, correct: boolean) => void;
  onEndGame: () => void;
}) {
  if (!session) return null;
  const allScored = session.players.every((p) => scoredPlayers.has(p.id));

  return (
    <div className="space-y-6">
      {/* Correct answer */}
      <div className="text-center space-y-2">
        <p className="text-xs text-[var(--color-mithril)] tracking-widest uppercase" style={{ fontFamily: "var(--font-cinzel)" }}>The Correct Answer</p>
        <p className="text-2xl font-black text-[var(--color-gold-light)]" style={{ fontFamily: "var(--font-cinzel-deco)" }}>
          {fj.clue.correct_answer}
        </p>
      </div>

      {/* Each player's answer + host judge buttons */}
      <div className="space-y-3">
        {session.players.map((player) => {
          const playerAnswer = fj.answers[player.id] ?? "(no answer)";
          const playerBet = fj.bets[player.id] ?? 0;
          const isScored = scoredPlayers.has(player.id);

          return (
            <div key={player.id} className={cn(
              "p-4 rounded border",
              isScored ? "border-[var(--color-gold-dim)] opacity-60" : "border-[var(--color-gold-dim)]",
              "bg-[var(--color-royal)]"
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.color }} />
                    <span className="text-sm font-semibold text-[var(--color-parchment)]" style={{ fontFamily: "var(--font-cinzel)" }}>
                      {player.name}
                    </span>
                    <span className="text-xs text-[var(--color-mithril)]">wagered ${playerBet}</span>
                  </div>
                  <p className="text-sm text-[var(--color-gold-light)] italic ml-4">"{playerAnswer}"</p>
                </div>

                {isHost && !isScored && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => onScore(player.id, true)}
                      className="px-3 py-1 rounded bg-[var(--color-forest)] text-white text-xs font-bold hover:opacity-90">✓</button>
                    <button onClick={() => onScore(player.id, false)}
                      className="px-3 py-1 rounded bg-[var(--color-ember)] text-white text-xs font-bold hover:opacity-90">✗</button>
                  </div>
                )}
                {isScored && <span className="text-xs text-[var(--color-mithril)]">Judged</span>}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && allScored && (
        <button onClick={onEndGame}
          className="w-full py-4 rounded bg-[var(--color-gold)] text-[var(--color-navy)] font-black
                     hover:bg-[var(--color-gold-light)] transition-colors text-sm uppercase tracking-widest tile-glow"
          style={{ fontFamily: "var(--font-cinzel)" }}>
          ⚔️ End the Quest
        </button>
      )}
    </div>
  );
}
