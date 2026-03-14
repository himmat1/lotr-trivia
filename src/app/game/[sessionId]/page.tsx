// ─── Game Page (Server Component) ────────────────────────────────────────────
// Validates the session exists, then hands off to the client GameBoard component.

import { redirect } from "next/navigation";
import { getSession, toClientSession } from "@/lib/session-store";
import GameBoard from "./game-board";

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function GamePage({ params }: PageProps) {
  const { sessionId } = await params;

  const session = getSession(sessionId);
  if (!session) {
    // Session not found (expired or invalid) — send back to lobby
    redirect("/");
  }

  // Pass the initial session state to the client component.
  // The client will subscribe to SSE for live updates from here on.
  const initialSession = toClientSession(session);

  return <GameBoard sessionId={sessionId} initialSession={initialSession} />;
}
