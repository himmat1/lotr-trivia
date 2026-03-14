"use client";

// ─── Lobby Page ───────────────────────────────────────────────────────────────
// The entry point for all players. Switches between two modes:
//   1. "create" — host enters their name and creates a new game
//   2. "join"   — guest enters a room code + name to join an existing game

import { useState } from "react";
import CreateGameForm from "./CreateGameForm";
import JoinGameForm from "./JoinGameForm";
import { Sword, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type LobbyMode = "create" | "join";

export default function LobbyPage() {
  const [mode, setMode] = useState<LobbyMode>("create");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-10">
      {/* ── Title ── */}
      <div className="text-center space-y-3">
        {/* Decorative ring icon above title */}
        <div className="flex justify-center mb-2">
          <span className="text-5xl select-none" aria-hidden>💍</span>
        </div>
        <h1
          className="text-4xl md:text-6xl font-black tracking-elvish text-gold-gradient"
          style={{ fontFamily: "var(--font-cinzel-deco)" }}
        >
          LOTR Trivia
        </h1>
        <p className="text-lg tracking-elvish text-[var(--color-mithril)]"
           style={{ fontFamily: "var(--font-cinzel)" }}>
          The Fellowship of Knowledge
        </p>
        <p className="text-sm text-[var(--color-mithril)] max-w-md mx-auto mt-2 leading-relaxed">
          Jeopardy-style trivia across the films, the books, and the lore of Middle-earth.
          Up to 5 players. One Ring to rule the scoreboard.
        </p>
      </div>

      {/* ── Mode Toggle ── */}
      <div className="flex rounded-lg overflow-hidden border border-[var(--color-gold-dim)]">
        <button
          onClick={() => setMode("create")}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide transition-colors",
            mode === "create"
              ? "bg-[var(--color-gold)] text-[var(--color-navy)]"
              : "bg-[var(--color-royal)] text-[var(--color-mithril)] hover:text-[var(--color-parchment)]"
          )}
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          <Sword className="w-4 h-4" />
          Create Game
        </button>
        <button
          onClick={() => setMode("join")}
          className={cn(
            "flex items-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide transition-colors",
            mode === "join"
              ? "bg-[var(--color-gold)] text-[var(--color-navy)]"
              : "bg-[var(--color-royal)] text-[var(--color-mithril)] hover:text-[var(--color-parchment)]"
          )}
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          <Users className="w-4 h-4" />
          Join Game
        </button>
      </div>

      {/* ── Form Card ── */}
      <div className="w-full max-w-md ring-border bg-[var(--color-navy-light)] p-8 space-y-6">
        {mode === "create" ? <CreateGameForm /> : <JoinGameForm />}
      </div>

      {/* ── Footer ── */}
      <p className="text-xs text-[var(--color-gold-dim)] tracking-widest uppercase">
        One does not simply skip the trivia
      </p>
    </main>
  );
}
