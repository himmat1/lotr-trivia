"use client";

// ─── Join Game Form ───────────────────────────────────────────────────────────
// Guest enters a 6-char room code + their name → POST /api/game/join
// → redirected to /game/[sessionId] with their playerId stored in sessionStorage

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";

export default function JoinGameForm() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCode.trim().toUpperCase();
    const name = playerName.trim();
    if (!code || !name) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code, playerName: name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to join game");
      }

      const { sessionId, playerId } = await res.json();

      // Store playerId so this device knows which player it controls
      sessionStorage.setItem(`lotr_player_${sessionId}`, playerId);

      router.push(`/game/${sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="space-y-5">
      {/* Room Code Input */}
      <div>
        <label
          htmlFor="room-code"
          className="block text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] mb-2"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          Room Code
        </label>
        <input
          id="room-code"
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="e.g. XK9F2A"
          maxLength={6}
          disabled={loading}
          autoFocus
          className="w-full px-4 py-3 rounded bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                     text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                     focus:outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]
                     transition-colors tracking-widest text-center text-lg font-bold uppercase
                     disabled:opacity-50"
          style={{ fontFamily: "var(--font-cinzel)" }}
        />
      </div>

      {/* Player Name Input */}
      <div>
        <label
          htmlFor="player-name"
          className="block text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] mb-2"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          Your Name
        </label>
        <input
          id="player-name"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="e.g. Legolas Greenleaf"
          maxLength={24}
          disabled={loading}
          className="w-full px-4 py-3 rounded bg-[var(--color-navy)] border border-[var(--color-gold-dim)]
                     text-[var(--color-parchment)] placeholder-[var(--color-mithril)]
                     focus:outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]
                     transition-colors text-sm disabled:opacity-50"
          style={{ fontFamily: "var(--font-cinzel)" }}
        />
      </div>

      {error && (
        <p className="text-sm text-[var(--color-ember-light)] text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !roomCode.trim() || !playerName.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 rounded
                   bg-[var(--color-gold)] text-[var(--color-navy)] font-bold
                   hover:bg-[var(--color-gold-light)] transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-sm tracking-widest uppercase"
        style={{ fontFamily: "var(--font-cinzel)" }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Joining the Quest…
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />
            Join Game
          </>
        )}
      </button>
    </form>
  );
}
