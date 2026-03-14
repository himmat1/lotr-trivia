// ─── GET /api/game/[sessionId]/stream ────────────────────────────────────────
// Server-Sent Events (SSE) endpoint — pushes real-time game state to all
// connected player devices whenever the session state changes.
//
// Architecture:
//   - Client opens this SSE connection on page load
//   - When any player triggers a PATCH action, updateSession() fires an EventEmitter event
//   - All listening SSE connections receive the new state immediately
//   - No WebSocket server or external service needed

import { NextRequest } from "next/server";
import { getSession, gameEvents, toClientSession } from "@/lib/session-store";
import type { ClientGameSession } from "@/types/game";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { sessionId } = await ctx.params;

  const session = getSession(sessionId);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  // Helper to encode SSE data frames
  const encode = (data: ClientGameSession) =>
    new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream({
    start(controller) {
      // Send current session state immediately on connect — no polling needed
      controller.enqueue(encode(toClientSession(session)));

      // Subscribe to future updates for this specific session
      const listener = (updatedSession: ClientGameSession) => {
        try {
          controller.enqueue(encode(updatedSession));
        } catch {
          // Client has disconnected — listener will be cleaned up by abort below
        }
      };

      gameEvents.on(`session:${sessionId}`, listener);

      // Clean up listener when client disconnects (tab closed, navigation, etc.)
      req.signal.addEventListener("abort", () => {
        gameEvents.off(`session:${sessionId}`, listener);

        // Optionally mark player as disconnected — but we need the playerId
        // The client sends a disconnect ping via PATCH before navigating away
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable buffering in nginx/proxies — crucial for SSE to work
      "X-Accel-Buffering": "no",
    },
  });
}
