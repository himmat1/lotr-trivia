// ─── Core Game Types ─────────────────────────────────────────────────────────
// Single source of truth for all TypeScript interfaces in the LOTR Trivia app.
// Every module (session store, game engine, API routes, React context) imports from here.

// The 6 fixed Jeopardy categories covering all LOTR/Hobbit source material
export type CategoryName =
  | "Fellowship & Heroes"
  | "Rings & Dark Powers"
  | "Lands of Middle-earth"
  | "Epic Battles & Wars"
  | "The Shire & Hobbit Life"
  | "Ancient Lore & Languages";

export const ALL_CATEGORIES: CategoryName[] = [
  "Fellowship & Heroes",
  "Rings & Dark Powers",
  "Lands of Middle-earth",
  "Epic Battles & Wars",
  "The Shire & Hobbit Life",
  "Ancient Lore & Languages",
];

// Point values match classic Jeopardy scaling
export type PointValue = 200 | 400 | 600 | 800 | 1000;
export const ALL_POINT_VALUES: PointValue[] = [200, 400, 600, 800, 1000];

// Difficulty maps to point value: easy=200, legendary=1000
export type Difficulty = "easy" | "medium" | "hard" | "expert" | "legendary";

// The fundamental unit — one trivia clue on the board
export interface TriviaClue {
  id: string;
  category: CategoryName;
  points: PointValue;
  // The clue text shown to players (the "answer" in Jeopardy terms)
  clue: string;
  // The correct response players must give
  correct_answer: string;
  difficulty: Difficulty;
  // Only set to true in the server PATCH response after selection — never in board listing
  // This prevents clients from detecting Daily Doubles before clicking
  isDailyDouble: boolean;
  isAnswered: boolean;
  // Track whether the question came from The One API context or pure Claude knowledge
  source: "one_api" | "claude";
}

// Board is a record of 6 categories, each with exactly 5 clues (one per point value)
export type GameBoard = Record<CategoryName, TriviaClue[]>;

// ─── Player ──────────────────────────────────────────────────────────────────

// Per-player accent colors — assigned sequentially to differentiate players on screen
export const PLAYER_COLORS = [
  "#c9a227", // gold
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#a855f7", // purple
] as const;

export interface Player {
  id: string;      // UUID assigned at join time, stored in client sessionStorage
  name: string;
  score: number;
  isHost: boolean; // host gets extra controls: mark correct / mark wrong / skip
  color: string;   // from PLAYER_COLORS array, assigned by join order
  isConnected: boolean; // SSE connection alive — shown as online/offline indicator
}

// ─── Game Phase State Machine ────────────────────────────────────────────────
// Phases progress in this general order:
//   waiting → generating → board → [clue_open → buzzed_in → answer_reveal] ×30 → final_jeopardy → game_over
//   daily_double can occur instead of clue_open for Daily Double tiles

export type GamePhase =
  | "waiting"         // lobby: players are joining, host hasn't started yet
  | "generating"      // Claude is generating questions (async, takes ~15-30s)
  | "board"           // main board shown, current player picks a clue
  | "clue_open"       // clue revealed, waiting for a player to buzz in (30s timer)
  | "buzzed_in"       // a player buzzed in, submitting/being judged
  | "answer_reveal"   // correct answer shown after correct/wrong/timeout
  | "daily_double"    // picking player bets before seeing their Daily Double clue
  | "final_jeopardy"  // final round (betting → answering → reveal)
  | "game_over";      // all 30 clues answered, scores final

// ─── Final Jeopardy ──────────────────────────────────────────────────────────

export type FinalJeopardyPhase = "betting" | "answering" | "reveal";

export interface FinalJeopardyState {
  clue: TriviaClue;
  // Each player submits a bet (0 to current score, or 0 to 1000 if score ≤ 0)
  bets: Record<string, number>;    // playerId → bet amount
  // Collected simultaneously; hidden from other players until reveal phase
  answers: Record<string, string>; // playerId → written answer
  // Tracks who has locked in their bet/answer
  lockedBets: string[];            // playerIds who have locked their bet
  lockedAnswers: string[];         // playerIds who have locked their answer
  phase: FinalJeopardyPhase;
}

// ─── Game Session ─────────────────────────────────────────────────────────────

export interface GameSession {
  id: string;
  // 6-character room code displayed in the lobby — derived from first 6 chars of id
  roomCode: string;
  players: Player[];
  // The 6×5 board of clues — populated after question generation completes
  board: GameBoard;
  phase: GamePhase;
  // The clue currently being displayed (set when phase = clue_open/buzzed_in/daily_double)
  currentClue: TriviaClue | null;
  // Which player buzzed in (set when phase = buzzed_in)
  activeBuzzerId: string | null;
  // Clue IDs marked as Daily Doubles (chosen randomly server-side at game start)
  // Never sent to client until the corresponding clue is selected
  dailyDoubleIds: string[];
  // Daily Double bet amount (for the current Daily Double clue)
  dailyDoubleBet: number | null;
  finalJeopardy: FinalJeopardyState | null;
  // Whose turn it is to pick from the board
  currentPickerId: string;
  // Unix timestamp — used for lazy GC (sessions older than 24h are pruned)
  createdAt: number;
  questionsGenerated: boolean;
  // Tracks which category/point tile is currently highlighted (clue_open phase)
  openClueId: string | null;
}

// ─── API Types ────────────────────────────────────────────────────────────────

// Actions sent via PATCH /api/game/[sessionId]
export type GameAction =
  | { type: "start_game" }                          // host starts from waiting → generating
  | { type: "select_clue"; clueId: string }         // pick a tile from the board
  | { type: "buzz_in"; playerId: string }           // player buzzes in
  | { type: "score_correct"; playerId: string }     // host marks answer correct
  | { type: "score_wrong"; playerId: string }       // host marks answer wrong
  | { type: "skip_clue" }                           // host skips / timer expired
  | { type: "place_dd_bet"; playerId: string; amount: number } // daily double bet
  | { type: "place_fj_bet"; playerId: string; amount: number } // final jeopardy bet
  | { type: "submit_fj_answer"; playerId: string; answer: string } // final jeopardy answer
  | { type: "reveal_fj" }                           // host triggers final reveal
  | { type: "player_connected"; playerId: string }
  | { type: "player_disconnected"; playerId: string }
  | { type: "advance_reveal" }   // host advances from answer_reveal back to board
  | { type: "game_over" };       // host ends the game after Final Jeopardy

// Sent to client — board listing strips isDailyDouble to prevent cheating
export type ClientTriviaClue = Omit<TriviaClue, "isDailyDouble"> & {
  isDailyDouble: false; // always false in board listing
};

export type ClientGameBoard = Record<CategoryName, ClientTriviaClue[]>;

// Session as sent to clients (board has isDailyDouble hidden)
export type ClientGameSession = Omit<GameSession, "board" | "dailyDoubleIds"> & {
  board: ClientGameBoard;
  // Only populated when this specific clue has been selected (PATCH response)
  revealedIsDailyDouble?: boolean;
};
