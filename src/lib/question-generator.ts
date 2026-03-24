// ─── Question Generator ───────────────────────────────────────────────────────
// Orchestrates the full pipeline:
//   1. (LOTR only) Fetch live context from The One API (cached)
//   2. Build prompt with randomSeed for variation between games
//   3. Call Claude claude-sonnet-4-6 to generate 31 structured questions
//   4. Parse and validate the JSON response
//   5. Fall back to hardcoded questions if anything fails

import Anthropic from "@anthropic-ai/sdk";
import { fetchLOTRContext } from "@/lib/the-one-api";
import { buildQuestionPrompt } from "@/lib/prompts/question-prompt";
import { FALLBACK_QUESTIONS } from "@/lib/fallback-questions";
import { getTopicConfig } from "@/lib/topics";
import type { TriviaClue } from "@/types/game";
import type { TopicId } from "@/types/game";

// Lazy-initialized Anthropic client — only created when question generation is needed
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

// ─── Main Export ──────────────────────────────────────────────────────────────

// Generates 30 board questions + 1 Final Jeopardy question for a game session.
// Returns validated TriviaClue[] ready to be organized into a GameBoard.
export async function generateQuestions(topic: TopicId = "lotr"): Promise<{
  boardClues: TriviaClue[];
  finalJeopardyClue: TriviaClue | null;
}> {
  const topicConfig = getTopicConfig(topic);

  // If no API key configured, skip to fallback immediately
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[QuestionGen] No ANTHROPIC_API_KEY — using fallback questions");
    return splitFallback(FALLBACK_QUESTIONS[topic]);
  }

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      // Only fetch The One API context for LOTR — other topics don't need it
      let lotrContext = null;
      if (topic === "lotr") {
        console.log(`[QuestionGen] Attempt ${attempt}: fetching LOTR context...`);
        lotrContext = await fetchLOTRContext();
      } else {
        console.log(`[QuestionGen] Attempt ${attempt}: generating ${topicConfig.name} questions...`);
      }

      // Random seed drives question variation between games
      const seed = Math.floor(Math.random() * 999999);
      const prompt = buildQuestionPrompt(topicConfig, seed, lotrContext, true);

      console.log(`[QuestionGen] Calling Claude claude-sonnet-4-6 for topic: ${topic}...`);
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      });

      // Extract text from response
      const rawText = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("");

      // Parse JSON — Claude should return a bare array
      const clues = parseCluesFromResponse(rawText, topicConfig.categories);

      if (clues.length >= 30) {
        console.log(
          `[QuestionGen] Successfully generated ${clues.length} questions for topic: ${topic}`
        );
        return splitFallback(clues);
      }

      console.warn(
        `[QuestionGen] Attempt ${attempt}: only got ${clues.length} questions, expected 30+`
      );
    } catch (err) {
      console.error(`[QuestionGen] Attempt ${attempt} failed:`, err);
    }
  }

  // Both attempts failed — fall back to hardcoded questions
  console.warn(`[QuestionGen] All attempts failed — using fallback questions for topic: ${topic}`);
  return splitFallback(FALLBACK_QUESTIONS[topic]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parse the raw Claude response into validated TriviaClue[]
// validCategories: the list of category names expected for this topic
function parseCluesFromResponse(raw: string, validCategories: string[]): TriviaClue[] {
  // Strip markdown code blocks if Claude wrapped the JSON
  const cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extract JSON array (find the outermost [ ... ])
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("No JSON array found in response");
  }

  const jsonStr = cleaned.slice(start, end + 1);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("Response is not a JSON array");
  }

  // Validate and coerce each clue
  const validated: TriviaClue[] = [];
  for (const item of parsed) {
    const clue = validateClue(item, validCategories);
    if (clue) validated.push(clue);
  }

  return validated;
}

// Validate a single clue object — coerce types and reject malformed entries
function validateClue(raw: unknown, validCategories: string[]): TriviaClue | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const id = String(obj.id ?? "");
  const category = String(obj.category ?? "");
  const points = Number(obj.points);
  const clue = String(obj.clue ?? "");
  const correct_answer = String(obj.correct_answer ?? "");
  const difficulty = String(obj.difficulty ?? "medium");

  // Skip if required fields are missing or category is not recognized for this topic
  // Also allow points: 0 for the Final Jeopardy clue
  if (
    !id ||
    !clue ||
    !correct_answer ||
    !validCategories.includes(category) ||
    (!([200, 400, 600, 800, 1000, 0] as number[]).includes(points))
  ) {
    return null;
  }

  return {
    id,
    category,
    points: points as TriviaClue["points"],
    clue,
    correct_answer,
    difficulty: (["easy", "medium", "hard", "expert", "legendary"].includes(
      difficulty
    )
      ? difficulty
      : "medium") as TriviaClue["difficulty"],
    isDailyDouble: Boolean(obj.isDailyDouble),
    isAnswered: false,
    source: "claude",
  };
}

// Split a flat clue array into board clues and the final jeopardy clue
function splitFallback(clues: TriviaClue[]): {
  boardClues: TriviaClue[];
  finalJeopardyClue: TriviaClue | null;
} {
  const finalJeopardyClue = clues.find((c) => c.id === "final-jeopardy") ?? null;
  const boardClues = clues.filter((c) => c.id !== "final-jeopardy");

  // Ensure exactly 2 Daily Doubles on the board (in 400-600 range)
  const adjustedBoard = ensureDailyDoubles(boardClues);

  return { boardClues: adjustedBoard, finalJeopardyClue };
}

// Enforce the Daily Double constraint: exactly 2 clues in [400, 600] point range
function ensureDailyDoubles(clues: TriviaClue[]): TriviaClue[] {
  const currentDDs = clues.filter((c) => c.isDailyDouble);
  const eligible = clues.filter(
    (c) => !c.isDailyDouble && (c.points === 400 || c.points === 600)
  );

  // Clear all current DDs and re-assign exactly 2
  const cleared = clues.map((c) => ({ ...c, isDailyDouble: false }));

  // Pick 2 random eligible clues — or use existing ones if already valid
  const ddTarget = 2;
  const toMark: string[] = [];

  // Prefer existing DDs if they're in the valid range
  for (const dd of currentDDs) {
    if (
      toMark.length < ddTarget &&
      (dd.points === 400 || dd.points === 600)
    ) {
      toMark.push(dd.id);
    }
  }

  // Fill remaining from eligible pool (shuffle for randomness)
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  for (const clue of shuffled) {
    if (toMark.length >= ddTarget) break;
    if (!toMark.includes(clue.id)) toMark.push(clue.id);
  }

  return cleared.map((c) =>
    toMark.includes(c.id) ? { ...c, isDailyDouble: true } : c
  );
}
