import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import type {
  GameSession,
  GameBoard,
  Player,
  ClientGameSession,
  ClientGameBoard,
  TriviaClue,
} from "@/types/game";
import type { TopicId } from "@/types/game";
import { PLAYER_COLORS } from "@/types/game";
import { getTopicConfig } from "@/lib/topics";

// ─── Singleton Pattern ────────────────────────────────────────────────────────
// Use globalThis to survive Next.js hot-module reloads in development.
// In production, this is a simple in-memory store — game state is intentionally
// ephemeral (no cross-game persistence required).

const g = globalThis as unknown as {
  _lotrSessions: Map<string, GameSession>;
  _lotrEvents: EventEmitter;
};

export const sessionStore: Map<string, GameSession> =
  g._lotrSessions ?? new Map();

export const gameEvents: EventEmitter = g._lotrEvents ?? new EventEmitter();
gameEvents.setMaxListeners(100); // allow many concurrent SSE connections

if (process.env.NODE_ENV !== "production") {
  g._lotrSessions = sessionStore;
  g._lotrEvents = gameEvents;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

// Create a new empty game session for the given host player.
// topic defaults to "lotr" so existing behavior is unchanged.
export function createSession(hostName: string, topic: TopicId = "lotr"): {
  session: GameSession;
  playerId: string;
} {
  const id = uuidv4();
  const playerId = uuidv4();

  const host: Player = {
    id: playerId,
    name: hostName,
    score: 0,
    isHost: true,
    color: PLAYER_COLORS[0],
    isConnected: true,
  };

  // Build an empty board using the topic's category list — filled in after question generation
  const topicConfig = getTopicConfig(topic);
  const emptyBoard = buildEmptyBoard(topicConfig.categories);

  const session: GameSession = {
    id,
    topic,
    roomCode: id.slice(0, 6).toUpperCase(),
    players: [host],
    board: emptyBoard,
    phase: "waiting",
    currentClue: null,
    activeBuzzerId: null,
    dailyDoubleIds: [],
    dailyDoubleBet: null,
    finalJeopardy: null,
    currentPickerId: playerId, // host picks first
    createdAt: Date.now(),
    questionsGenerated: false,
    openClueId: null,
  };

  sessionStore.set(id, session);
  return { session, playerId };
}

// Add a guest player to an existing session
export function joinSession(
  sessionId: string,
  playerName: string
): { session: GameSession; playerId: string } | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;
  // Don't allow joining after game has started
  if (session.phase !== "waiting") return null;
  if (session.players.length >= 5) return null;

  const playerId = uuidv4();
  const player: Player = {
    id: playerId,
    name: playerName,
    score: 0,
    isHost: false,
    color: PLAYER_COLORS[session.players.length] ?? "#ffffff",
    isConnected: true,
  };

  const updated: GameSession = {
    ...session,
    players: [...session.players, player],
  };

  sessionStore.set(sessionId, updated);
  gameEvents.emit(`session:${sessionId}`, toClientSession(updated));

  return { session: updated, playerId };
}

// Get a session by ID — returns null if not found or expired
export function getSession(id: string): GameSession | null {
  pruneExpiredSessions();
  return sessionStore.get(id) ?? null;
}

// Find a session by room code (first 6 chars of UUID, uppercased)
export function findSessionByRoomCode(roomCode: string): GameSession | null {
  const upper = roomCode.toUpperCase();
  for (const session of sessionStore.values()) {
    if (session.roomCode === upper) return session;
  }
  return null;
}

// Update session state and broadcast to all connected SSE clients
export function updateSession(
  id: string,
  patch: Partial<GameSession>
): GameSession | null {
  const existing = sessionStore.get(id);
  if (!existing) return null;

  const updated: GameSession = { ...existing, ...patch };
  sessionStore.set(id, updated);

  // Broadcast sanitized (isDailyDouble hidden) state to all SSE listeners
  gameEvents.emit(`session:${id}`, toClientSession(updated));

  return updated;
}

// ─── Client-Safe Session ──────────────────────────────────────────────────────

// Strip isDailyDouble flags from board before sending to clients.
// Daily Double status is only revealed in the PATCH response when a tile is selected.
export function toClientSession(
  session: GameSession,
  revealClueId?: string // if set, reveal isDailyDouble for this specific clue
): ClientGameSession {
  const clientBoard = {} as ClientGameBoard;

  // Iterate the actual board keys (which vary by topic) instead of the LOTR-only ALL_CATEGORIES
  for (const category of Object.keys(session.board)) {
    clientBoard[category] = (session.board[category] ?? []).map((clue) => ({
      ...clue,
      // Only reveal isDailyDouble for the specific clue just selected; always false in board listing
      // Cast needed: ClientTriviaClue requires isDailyDouble: false (literal), but we compute it
      isDailyDouble: (clue.id === revealClueId ? clue.isDailyDouble : false) as false,
    }));
  }

  const { dailyDoubleIds: _stripped, ...rest } = session;
  return {
    ...rest,
    board: clientBoard as ClientGameBoard,
  };
}

// ─── Lazy GC ──────────────────────────────────────────────────────────────────

// Remove sessions older than 24 hours — called on each getSession() call
function pruneExpiredSessions() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, session] of sessionStore.entries()) {
    if (session.createdAt < cutoff) {
      sessionStore.delete(id);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Build an empty board with placeholder arrays for each category
function buildEmptyBoard(categories: string[]): GameBoard {
  const board: GameBoard = {};
  for (const category of categories) {
    board[category] = [];
  }
  return board;
}

// Populate the board from a flat array of generated clues.
// Categories are inferred from the clues themselves (no static list needed).
export function buildBoardFromClues(clues: TriviaClue[]): GameBoard {
  const board: GameBoard = {};
  for (const clue of clues) {
    if (!board[clue.category]) board[clue.category] = [];
    board[clue.category].push(clue);
  }
  // Sort each category by point value ascending
  for (const category of Object.keys(board)) {
    board[category].sort((a, b) => a.points - b.points);
  }
  return board;
}
