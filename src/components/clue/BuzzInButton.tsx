"use client";

// ─── Buzz-In Button ───────────────────────────────────────────────────────────
// Large, tactile button each player taps to buzz in on their device.
// Disabled once any player has buzzed in (server race-condition safe).

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useGame } from "@/lib/contexts/game-context";

export default function BuzzInButton() {
  const { session, playerId, buzzIn } = useGame();
  const [loading, setLoading] = useState(false);

  if (!session) return null;

  const alreadyBuzzed = session.activeBuzzerId !== null;
  const isBuzzed = session.activeBuzzerId === playerId;
  const buzzedPlayer = session.players.find((p) => p.id === session.activeBuzzerId);

  const handleBuzz = async () => {
    if (alreadyBuzzed || loading) return;
    setLoading(true);
    try {
      await buzzIn();
    } finally {
      setLoading(false);
    }
  };

  // Someone else buzzed in — show who
  if (alreadyBuzzed && !isBuzzed) {
    return (
      <div className="text-center py-4">
        <p
          className="text-xl font-bold text-[var(--color-gold)]"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          🔔 {buzzedPlayer?.name ?? "A player"} buzzed in!
        </p>
      </div>
    );
  }

  // This player buzzed in
  if (isBuzzed) {
    return (
      <div className="text-center py-4">
        <p
          className="text-xl font-bold text-[var(--color-gold-light)] animate-pulse"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          🔔 You buzzed in — answer below!
        </p>
      </div>
    );
  }

  // No one has buzzed — show the button
  return (
    <button
      onClick={handleBuzz}
      disabled={loading}
      className="w-full py-6 rounded-lg text-2xl font-black tracking-wide uppercase
                 bg-[var(--color-gold)] text-[var(--color-navy)]
                 hover:bg-[var(--color-gold-light)] active:scale-95
                 transition-all buzz-button-active disabled:opacity-60"
      style={{ fontFamily: "var(--font-cinzel-deco)" }}
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : (
        "🔔 Buzz In!"
      )}
    </button>
  );
}
