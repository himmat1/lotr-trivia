"use client";

// ─── Create Game Form ─────────────────────────────────────────────────────────
// Host enters their name → POST /api/game/create → redirected to /game/[sessionId]
// Their playerId is stored in sessionStorage to persist across page refreshes.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sword } from "lucide-react";

export default function CreateGameForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create game");
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
    <form onSubmit={handleCreate} className="space-y-5">
      <div>
        <label
          htmlFor="host-name"
          className="block text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)] mb-2"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          Your Name
        </label>
        <input
          id="host-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gandalf the Grey"
          maxLength={24}
          disabled={loading}
          autoFocus
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
        disabled={loading || !name.trim()}
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
            Forging the Fellowship…
          </>
        ) : (
          <>
            <Sword className="w-4 h-4" />
            Create Game
          </>
        )}
      </button>

      <p className="text-xs text-center text-[var(--color-mithril)]">
        You&apos;ll receive a room code to share with other players.
      </p>
    </form>
  );
}
