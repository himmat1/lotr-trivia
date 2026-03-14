"use client";

// ─── Question Generation Loader ───────────────────────────────────────────────
// Shown while Claude is generating questions (~15-30 seconds).
// Cycles through LOTR-flavored loading messages to keep players engaged.

import { useEffect, useState } from "react";
import { useGame } from "@/lib/contexts/game-context";

const MESSAGES = [
  "Consulting the White Council…",
  "Reading the Red Book of Westmarch…",
  "Deciphering the Doors of Durin…",
  "Summoning lore from the Prancing Pony…",
  "Scouring the archives of Minas Tirith…",
  "Asking Treebeard to hurry…",
  "Translating the Black Speech…",
  "Seeking counsel from Lady Galadriel…",
  "Rifling through Bilbo's notes…",
  "Lighting the beacons of Gondor…",
];

export default function QuestionGenerationLoader() {
  const { session } = useGame();
  const [msgIdx, setMsgIdx] = useState(0);
  const [dots, setDots] = useState("");

  // Cycle through loading messages every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Animate the trailing dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-6">
      {/* Animated One Ring SVG */}
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-spin" style={{ animationDuration: "8s" }}>
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="8"
            strokeDasharray="200 52"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0c040" />
              <stop offset="50%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#8a6e1a" />
            </linearGradient>
          </defs>
        </svg>
        {/* Inner ring inscription effect */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl select-none">💍</span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-3">
        <h2
          className="text-2xl md:text-3xl font-black tracking-elvish text-gold-gradient"
          style={{ fontFamily: "var(--font-cinzel-deco)" }}
        >
          Forging Your Questions
        </h2>

        {/* Cycling message */}
        <p
          className="text-[var(--color-mithril)] text-sm min-h-[1.5rem] transition-all duration-500"
          style={{ fontFamily: "var(--font-cinzel)" }}
        >
          {MESSAGES[msgIdx]}{dots}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[var(--color-gold-dim)] animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      {/* Player list while waiting */}
      {session && session.players.length > 0 && (
        <div className="text-center space-y-2">
          <p
            className="text-xs tracking-widest uppercase text-[var(--color-gold)] font-semibold"
            style={{ fontFamily: "var(--font-cinzel)" }}
          >
            The Fellowship ({session.players.length} members)
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {session.players.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-xs text-[var(--color-parchment)] border"
                style={{
                  fontFamily: "var(--font-cinzel)",
                  borderColor: p.color,
                  backgroundColor: `${p.color}22`,
                }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--color-gold-dim)] tracking-widest uppercase text-center max-w-xs">
        Claude is crafting unique questions from the full depth of Middle-earth lore
      </p>
    </div>
  );
}
