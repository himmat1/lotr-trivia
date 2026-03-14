"use client";

// ─── Waiting Room ─────────────────────────────────────────────────────────────
// Shown to all players while the game is in "waiting" phase.
// Host sees the room code, player list, and the "Begin the Quest" button.
// Guests see "Waiting for host to start..."

import { useState } from "react";
import { Copy, Check, Loader2, Users } from "lucide-react";
import { useGame } from "@/lib/contexts/game-context";

export default function WaitingRoom() {
  const { session, playerId, startGame } = useGame();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;

  const currentPlayer = session.players.find((p) => p.id === playerId);
  const isHost = currentPlayer?.isHost ?? false;

  const copyRoomCode = async () => {
    await navigator.clipboard.writeText(session.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startGame();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      {/* Title */}
      <div className="text-center">
        <h1
          className="text-3xl md:text-5xl font-black tracking-elvish text-gold-gradient mb-2"
          style={{ fontFamily: "var(--font-cinzel-deco)" }}
        >
          The Fellowship Gathers
        </h1>
        <p className="text-[var(--color-mithril)] text-sm tracking-wide">
          {isHost ? "Share the room code with your companions" : "Waiting for the host to begin"}
        </p>
      </div>

      {/* Room Code Card */}
      <div className="ring-border bg-[var(--color-navy-light)] p-6 text-center w-full max-w-sm space-y-3">
        <p
          className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)]"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          Room Code
        </p>
        <div className="flex items-center justify-center gap-3">
          <span
            className="text-5xl font-black tracking-[0.2em] text-[var(--color-parchment)]"
            style={{ fontFamily: "var(--font-cinzel-deco)" }}
          >
            {session.roomCode}
          </span>
          <button
            onClick={copyRoomCode}
            className="p-2 rounded text-[var(--color-gold-dim)] hover:text-[var(--color-gold)] transition-colors"
            title="Copy room code"
          >
            {copied ? (
              <Check className="w-5 h-5 text-[var(--color-forest)]" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-[var(--color-mithril)]">
          Go to this site and enter this code to join
        </p>
      </div>

      {/* Player List */}
      <div className="w-full max-w-sm ring-border bg-[var(--color-navy-light)] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-[var(--color-gold)]" />
          <p
            className="text-xs font-semibold tracking-widest uppercase text-[var(--color-gold)]"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            Players ({session.players.length}/5)
          </p>
        </div>
        <ul className="space-y-2">
          {session.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between py-2 px-3 rounded bg-[var(--color-navy)]"
            >
              <div className="flex items-center gap-3">
                {/* Player color dot */}
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <span
                  className="text-sm text-[var(--color-parchment)]"
                  style={{ fontFamily: "var(--font-cinzel)" }}
                >
                  {player.name}
                  {player.id === playerId && (
                    <span className="ml-2 text-xs text-[var(--color-mithril)]">(You)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {player.isHost && (
                  <span className="text-xs text-[var(--color-gold)] font-semibold tracking-wide">
                    Host
                  </span>
                )}
                {/* Online indicator */}
                <span
                  className={`w-2 h-2 rounded-full ${
                    player.isConnected ? "bg-[var(--color-forest)]" : "bg-[var(--color-mithril)]"
                  }`}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Start Button (host only) */}
      {isHost && (
        <div className="w-full max-w-sm space-y-3">
          {session.players.length < 2 && (
            <p className="text-xs text-center text-[var(--color-mithril)]">
              At least 2 players required to begin
            </p>
          )}
          {error && (
            <p className="text-sm text-center text-[var(--color-ember-light)]">{error}</p>
          )}
          <button
            onClick={handleStart}
            disabled={starting || session.players.length < 1}
            className="w-full flex items-center justify-center gap-2 py-4 rounded
                       bg-[var(--color-gold)] text-[var(--color-navy)] font-bold
                       hover:bg-[var(--color-gold-light)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       text-sm tracking-widest uppercase tile-glow"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Summoning the Questions…
              </>
            ) : (
              "⚔️ Begin the Quest"
            )}
          </button>
        </div>
      )}

      {/* Guest waiting message */}
      {!isHost && (
        <div className="flex items-center gap-3 text-[var(--color-mithril)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--color-gold)]" />
          <span style={{ fontFamily: "var(--font-cinzel)" }}>
            Waiting for the host to begin the quest…
          </span>
        </div>
      )}
    </div>
  );
}
