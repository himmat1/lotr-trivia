// ─── GET /api/game/[sessionId] & PATCH /api/game/[sessionId] ─────────────────
// GET:   Returns current session state (client-safe, Daily Doubles hidden)
// PATCH: Applies a game action and returns the updated session state

import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  toClientSession,
} from "@/lib/session-store";
import { applyAction, selectClue } from "@/lib/game-engine";
import type { GameAction } from "@/types/game";
import { runQuestionGeneration } from "@/app/api/game/create/route";

type RouteContext = { params: Promise<{ sessionId: string }> };

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { sessionId } = await ctx.params;
  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(toClientSession(session));
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { sessionId } = await ctx.params;

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const action: GameAction = await req.json();

  // Special case: start_game triggers async question generation
  if (action.type === "start_game") {
    const updated = updateSession(sessionId, { phase: "generating" });
    // Fire and forget — question generation updates the session asynchronously
    runQuestionGeneration(sessionId);
    return NextResponse.json(toClientSession(updated!));
  }

  // Special case: select_clue — we need to know if it's a Daily Double
  // so we can include that info in the response to the selector's client
  if (action.type === "select_clue") {
    const { session: updated, isDailyDouble } = selectClue(session, action.clueId);
    const saved = updateSession(sessionId, updated);
    if (!saved) return NextResponse.json({ error: "Update failed" }, { status: 500 });

    // Return the client session WITH isDailyDouble revealed for this specific clue
    return NextResponse.json({
      ...toClientSession(saved, isDailyDouble ? action.clueId : undefined),
      revealedIsDailyDouble: isDailyDouble,
    });
  }

  // All other actions go through the pure game engine
  const updated = applyAction(session, action);
  const saved = updateSession(sessionId, updated);

  if (!saved) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json(toClientSession(saved));
}
