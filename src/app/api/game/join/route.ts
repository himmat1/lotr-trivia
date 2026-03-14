// ─── POST /api/game/join ──────────────────────────────────────────────────────
// Adds a guest player to an existing game session using a room code.

import { NextRequest, NextResponse } from "next/server";
import { findSessionByRoomCode, joinSession } from "@/lib/session-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roomCode = typeof body.roomCode === "string" ? body.roomCode.trim().toUpperCase() : "";
    const playerName = typeof body.playerName === "string" ? body.playerName.trim() : "";

    if (!roomCode || !playerName) {
      return NextResponse.json(
        { error: "Room code and player name are required" },
        { status: 400 }
      );
    }

    // Find the session by room code
    const session = findSessionByRoomCode(roomCode);
    if (!session) {
      return NextResponse.json(
        { error: "Room not found. Check your room code and try again." },
        { status: 404 }
      );
    }

    if (session.phase !== "waiting") {
      return NextResponse.json(
        { error: "This game has already started. You cannot join now." },
        { status: 409 }
      );
    }

    if (session.players.length >= 5) {
      return NextResponse.json(
        { error: "This game is full (maximum 5 players)." },
        { status: 409 }
      );
    }

    // Add the player to the session
    const result = joinSession(session.id, playerName);
    if (!result) {
      return NextResponse.json(
        { error: "Failed to join session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      roomCode: session.roomCode,
      playerId: result.playerId,
    });
  } catch (err) {
    console.error("[API /game/join] Error:", err);
    return NextResponse.json({ error: "Failed to join session" }, { status: 500 });
  }
}
