// ─── POST /api/game/create ────────────────────────────────────────────────────
// Creates a new game session for the host player.
// Immediately returns the sessionId and playerId, then kicks off async question generation.

import { NextRequest, NextResponse } from "next/server";
import { createSession, updateSession, buildBoardFromClues } from "@/lib/session-store";
import { generateQuestions } from "@/lib/question-generator";
import { advanceFromReveal } from "@/lib/game-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hostName = typeof body.hostName === "string" ? body.hostName.trim() : "";

    if (!hostName) {
      return NextResponse.json(
        { error: "Host name is required" },
        { status: 400 }
      );
    }

    // Create session in "waiting" phase — questions aren't generated yet
    const { session, playerId } = createSession(hostName);

    // Kick off question generation in the background — don't await it.
    // The session starts in "waiting" → host starts game → "generating" → "board"
    // Question generation is triggered by the start_game action, not at create time.

    return NextResponse.json({
      sessionId: session.id,
      roomCode: session.roomCode,
      playerId,
    });
  } catch (err) {
    console.error("[API /game/create] Error:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

// ─── Exported helper used by the start_game action in the session PATCH route ─

// This runs server-side after the host triggers "start_game".
// It generates questions and updates the session — called without awaiting
// so the client gets an immediate response with phase="generating".
export async function runQuestionGeneration(sessionId: string) {
  try {
    console.log(`[QuestionGen] Starting for session ${sessionId}`);
    const { boardClues, finalJeopardyClue } = await generateQuestions();

    // Build the 6×5 board from flat clue array
    const board = buildBoardFromClues(boardClues);

    // Collect Daily Double IDs from the generated clues
    const dailyDoubleIds = boardClues
      .filter((c) => c.isDailyDouble)
      .map((c) => c.id);

    updateSession(sessionId, {
      board,
      dailyDoubleIds,
      questionsGenerated: true,
      phase: "board",
      // Store Final Jeopardy clue in the session for later use
      finalJeopardy: finalJeopardyClue
        ? {
            clue: finalJeopardyClue,
            bets: {},
            answers: {},
            lockedBets: [],
            lockedAnswers: [],
            phase: "betting",
          }
        : null,
    });

    console.log(`[QuestionGen] Complete for session ${sessionId}`);
  } catch (err) {
    console.error(`[QuestionGen] Failed for session ${sessionId}:`, err);
    // Leave session in "generating" phase — client will show error state
  }
}
