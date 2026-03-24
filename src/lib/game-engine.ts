// ─── Game Engine — Pure State Transition Functions ───────────────────────────
// All functions here are pure (no side effects, no I/O).
// The API routes call these and then pass results to updateSession().

import type { GameSession, GameAction, TriviaClue, Player } from "@/types/game";
import { getTopicConfig } from "@/lib/topics";

// ─── Clue Selection ───────────────────────────────────────────────────────────

// Called when a player selects a tile from the board.
// Returns the updated session and whether the selected clue is a Daily Double.
export function selectClue(
  session: GameSession,
  clueId: string
): { session: GameSession; isDailyDouble: boolean } {
  const clue = findClueById(session, clueId);
  if (!clue || clue.isAnswered) {
    return { session, isDailyDouble: false };
  }

  const isDailyDouble = session.dailyDoubleIds.includes(clueId);

  const updated: GameSession = {
    ...session,
    currentClue: clue,
    openClueId: clueId,
    activeBuzzerId: null,
    dailyDoubleBet: null,
    // Daily Double goes to a betting phase; normal clues open for buzzing
    phase: isDailyDouble ? "daily_double" : "clue_open",
  };

  return { session: updated, isDailyDouble };
}

// ─── Buzz-In ─────────────────────────────────────────────────────────────────

// Called when a player buzzes in. First valid buzz wins — subsequent calls are no-ops.
export function buzzIn(session: GameSession, playerId: string): GameSession {
  // Only accept buzz-ins when the clue is open and no one has buzzed yet
  if (session.phase !== "clue_open") return session;
  if (session.activeBuzzerId !== null) return session;

  return {
    ...session,
    activeBuzzerId: playerId,
    phase: "buzzed_in",
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// Host marks the buzzing player's answer as correct.
export function scoreCorrect(session: GameSession, playerId: string): GameSession {
  if (!session.currentClue) return session;

  const points = session.dailyDoubleBet ?? session.currentClue.points;
  const updatedPlayers = adjustScore(session.players, playerId, +points);
  const updatedBoard = markClueAnswered(session, session.currentClue.id);

  // Player who answered correctly picks next
  return {
    ...session,
    players: updatedPlayers,
    board: updatedBoard,
    phase: "answer_reveal",
    currentPickerId: playerId,
    activeBuzzerId: null,
  };
}

// Host marks the answer as wrong (or timer expired with a buzz-in).
// Player loses points; clue stays open for others to buzz in.
export function scoreWrong(session: GameSession, playerId: string): GameSession {
  if (!session.currentClue) return session;

  const points = session.dailyDoubleBet ?? session.currentClue.points;
  const updatedPlayers = adjustScore(session.players, playerId, -points);

  // For Daily Double, wrong answer ends the clue immediately (only one player answers)
  if (session.phase === "buzzed_in" && session.dailyDoubleBet !== null) {
    const updatedBoard = markClueAnswered(session, session.currentClue.id);
    return {
      ...session,
      players: updatedPlayers,
      board: updatedBoard,
      phase: "answer_reveal",
      activeBuzzerId: null,
      currentPickerId: nextPlayerAfter(session, playerId),
    };
  }

  // Regular clue — clue stays open for others to buzz in
  return {
    ...session,
    players: updatedPlayers,
    activeBuzzerId: null,
    phase: "clue_open",
  };
}

// Host skips the clue (or timer expired with no buzz-in).
// No score change; clue is marked answered and turn passes.
export function skipClue(session: GameSession): GameSession {
  if (!session.currentClue) return session;

  const updatedBoard = markClueAnswered(session, session.currentClue.id);
  const nextPicker = nextPlayerAfter(session, session.currentPickerId);

  const updated: GameSession = {
    ...session,
    board: updatedBoard,
    phase: "answer_reveal",
    activeBuzzerId: null,
    currentPickerId: nextPicker,
  };

  return updated;
}

// ─── Daily Double ─────────────────────────────────────────────────────────────

// Picking player places their bet before seeing the clue.
// Bet constraints: min $100, max current score (or $1000 if score ≤ 0).
export function placeDailyDoubleBet(
  session: GameSession,
  playerId: string,
  amount: number
): GameSession {
  const player = session.players.find((p) => p.id === playerId);
  if (!player) return session;

  const maxBet = Math.max(player.score, 1000);
  const validatedBet = Math.min(Math.max(amount, 100), maxBet);

  return {
    ...session,
    dailyDoubleBet: validatedBet,
    activeBuzzerId: playerId, // Daily Double: only this player answers
    phase: "clue_open",
  };
}

// ─── Final Jeopardy ───────────────────────────────────────────────────────────

export function placeFinalJeopardyBet(
  session: GameSession,
  playerId: string,
  amount: number
): GameSession {
  if (!session.finalJeopardy) return session;

  const player = session.players.find((p) => p.id === playerId);
  if (!player) return session;

  const maxBet = Math.max(player.score, 0);
  const validatedBet = Math.min(Math.max(amount, 0), maxBet);

  const updatedFJ = {
    ...session.finalJeopardy,
    bets: { ...session.finalJeopardy.bets, [playerId]: validatedBet },
    lockedBets: [...session.finalJeopardy.lockedBets, playerId],
  };

  // Once all players have locked in bets, move to answering phase
  const allBetsIn = session.players.every((p) =>
    updatedFJ.lockedBets.includes(p.id)
  );

  return {
    ...session,
    finalJeopardy: {
      ...updatedFJ,
      phase: allBetsIn ? "answering" : "betting",
    },
  };
}

export function submitFinalJeopardyAnswer(
  session: GameSession,
  playerId: string,
  answer: string
): GameSession {
  if (!session.finalJeopardy) return session;

  const updatedFJ = {
    ...session.finalJeopardy,
    answers: { ...session.finalJeopardy.answers, [playerId]: answer },
    lockedAnswers: [...session.finalJeopardy.lockedAnswers, playerId],
  };

  return { ...session, finalJeopardy: updatedFJ };
}

// Host triggers the reveal — apply all bets based on correct/wrong
// For simplicity: host judges each answer at reveal time via the UI
export function revealFinalJeopardy(session: GameSession): GameSession {
  return {
    ...session,
    finalJeopardy: session.finalJeopardy
      ? { ...session.finalJeopardy, phase: "reveal" }
      : null,
    phase: "final_jeopardy", // stays in final_jeopardy until host calls game_over
  };
}

// Apply a Final Jeopardy score adjustment (called per-player during reveal)
export function applyFinalJeopardyScore(
  session: GameSession,
  playerId: string,
  correct: boolean
): GameSession {
  if (!session.finalJeopardy) return session;

  const bet = session.finalJeopardy.bets[playerId] ?? 0;
  const delta = correct ? +bet : -bet;
  const updatedPlayers = adjustScore(session.players, playerId, delta);

  return { ...session, players: updatedPlayers };
}

// ─── Board Navigation ─────────────────────────────────────────────────────────

// After answer_reveal phase, advance to board or final jeopardy
export function advanceFromReveal(session: GameSession): GameSession {
  const remaining = countRemainingClues(session);

  if (remaining === 0) {
    // All clues answered — trigger Final Jeopardy
    const fjClue = generateFinalJeopardyPlaceholder(session);
    return {
      ...session,
      phase: "final_jeopardy",
      currentClue: fjClue,
      openClueId: null,
      finalJeopardy: {
        clue: fjClue,
        bets: {},
        answers: {},
        lockedBets: [],
        lockedAnswers: [],
        phase: "betting",
      },
    };
  }

  return {
    ...session,
    phase: "board",
    currentClue: null,
    openClueId: null,
    activeBuzzerId: null,
    dailyDoubleBet: null,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findClueById(session: GameSession, clueId: string): TriviaClue | null {
  // Use Object.keys so this works for any topic's board, not just LOTR
  for (const category of Object.keys(session.board)) {
    const found = session.board[category]?.find((c) => c.id === clueId);
    if (found) return found;
  }
  return null;
}

function markClueAnswered(session: GameSession, clueId: string): typeof session.board {
  const updatedBoard = { ...session.board };
  for (const category of Object.keys(session.board)) {
    updatedBoard[category] = (session.board[category] ?? []).map((c) =>
      c.id === clueId ? { ...c, isAnswered: true } : c
    );
  }
  return updatedBoard;
}

function adjustScore(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((p) =>
    p.id === playerId ? { ...p, score: p.score + delta } : p
  );
}

// Round-robin: returns the ID of the next player after the given one
function nextPlayerAfter(session: GameSession, currentPlayerId: string): string {
  const idx = session.players.findIndex((p) => p.id === currentPlayerId);
  if (idx === -1) return session.players[0]?.id ?? currentPlayerId;
  const nextIdx = (idx + 1) % session.players.length;
  return session.players[nextIdx].id;
}

function countRemainingClues(session: GameSession): number {
  let count = 0;
  for (const category of Object.keys(session.board)) {
    count += (session.board[category] ?? []).filter((c) => !c.isAnswered).length;
  }
  return count;
}

// Placeholder for the Final Jeopardy clue — uses the topic's FJ category label
function generateFinalJeopardyPlaceholder(session: GameSession): TriviaClue {
  const topicConfig = getTopicConfig(session.topic ?? "lotr");
  return {
    id: "final-jeopardy",
    category: topicConfig.finalJeopardyCategory,
    points: 0 as never,
    clue: "",
    correct_answer: "",
    difficulty: "legendary",
    isDailyDouble: false,
    isAnswered: false,
    source: "claude",
  };
}

// Check if board is complete (all clues answered) — used to trigger Final Jeopardy
export function isBoardComplete(session: GameSession): boolean {
  return countRemainingClues(session) === 0;
}

// Process a GameAction and return the next session state
export function applyAction(
  session: GameSession,
  action: GameAction
): GameSession {
  switch (action.type) {
    case "start_game":
      return { ...session, phase: "generating" };

    case "select_clue": {
      const { session: next } = selectClue(session, action.clueId);
      return next;
    }

    case "buzz_in":
      return buzzIn(session, action.playerId);

    case "score_correct":
      return scoreCorrect(session, action.playerId);

    case "score_wrong":
      return scoreWrong(session, action.playerId);

    case "skip_clue":
      return skipClue(session);

    case "place_dd_bet":
      return placeDailyDoubleBet(session, action.playerId, action.amount);

    case "place_fj_bet":
      return placeFinalJeopardyBet(session, action.playerId, action.amount);

    case "submit_fj_answer":
      return submitFinalJeopardyAnswer(session, action.playerId, action.answer);

    case "reveal_fj":
      return revealFinalJeopardy(session);

    case "player_connected":
      return {
        ...session,
        players: session.players.map((p) =>
          p.id === action.playerId ? { ...p, isConnected: true } : p
        ),
      };

    case "player_disconnected":
      return {
        ...session,
        players: session.players.map((p) =>
          p.id === action.playerId ? { ...p, isConnected: false } : p
        ),
      };

    case "advance_reveal":
      // Move from answer_reveal back to board (or trigger final jeopardy if board is done)
      return advanceFromReveal(session);

    case "game_over":
      return { ...session, phase: "game_over" };

    default:
      return session;
  }
}
