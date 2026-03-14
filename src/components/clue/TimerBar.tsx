"use client";

// ─── Timer Bar ────────────────────────────────────────────────────────────────
// Animated countdown progress bar. Shifts from gold to red when urgent (<10s).

interface TimerBarProps {
  timeLeft: number;
  total: number;
}

export default function TimerBar({ timeLeft, total }: TimerBarProps) {
  const pct = Math.max(0, (timeLeft / total) * 100);
  const isUrgent = timeLeft <= 10;

  return (
    <div className="w-full space-y-1">
      <div className="timer-bar-track h-3 w-full">
        <div
          className="timer-bar-fill h-full"
          data-urgent={String(isUrgent)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p
        className={`text-center text-sm font-bold tabular-nums ${
          isUrgent ? "text-[var(--color-ember-light)]" : "text-[var(--color-gold)]"
        }`}
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        {timeLeft}s
      </p>
    </div>
  );
}
