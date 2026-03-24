// ─── Claude Question Generation Prompt ───────────────────────────────────────
// Builds the prompt used to ask Claude claude-sonnet-4-6 to generate 30 unique
// Jeopardy-style trivia questions for a given topic.
//
// The randomSeed causes Claude to vary its question selection each game,
// ensuring players don't see the same clues across sessions.
//
// For LOTR, live context from The One API is injected.
// For Friends and Animal Kingdom, only the topic's own promptInstructions are used.

import type { LOTRContext } from "@/lib/the-one-api";
import type { TopicConfig } from "@/lib/topics";

export function buildQuestionPrompt(
  topicConfig: TopicConfig,
  randomSeed: number,
  lotrContext: LOTRContext | null = null,  // only provided for the LOTR topic
  includeFinalJeopardy = true
): string {
  // Build source coverage requirement from topic config
  const sourceList = topicConfig.sourceMaterials
    .map((s) => `- ${s}`)
    .join("\n");

  // Build the category listing for the JSON format reminder
  const categoryNames = topicConfig.categories
    .map((c, i) => `  "${c}" (category ${i + 1})`)
    .join(",\n");

  // LOTR-specific: inject live data from The One API as context
  const lotrContextBlock =
    topicConfig.id === "lotr" && lotrContext
      ? buildLOTRContextBlock(lotrContext)
      : "";

  return `${topicConfig.promptInstructions}

## Game Seed: ${randomSeed}
Use this seed to vary your question selection. Each seed should produce different questions.
Do NOT generate your most "obvious" or "default" questions — explore the full depth of the topic.
${lotrContextBlock}
## Source Coverage Requirement:
Across all 30 questions, include AT LEAST 3 questions from EACH of these sources:
${sourceList}

## Difficulty Scale:
- 200 pts ("easy"): Very well-known facts that any casual fan would know.
- 400 pts ("medium"): Common knowledge for regular fans of this topic.
- 600 pts ("hard"): Requires close attention or deeper familiarity.
- 800 pts ("expert"): Only dedicated fans or well-read enthusiasts would know.
- 1000 pts ("legendary"): Deep knowledge — true scholars and superfans only.

## Format Rules:
- Write clues in classic Jeopardy style: the clue IS the answer/fact, players respond in question form
- Clues should be one or two clear sentences
- Correct answers should be concise (1–5 words typically)
- Vary question styles: identification, fill-in-the-blank, quote attribution, "which season/episode/film", counting
- DO NOT repeat similar questions or facts within the same category
- Make 200-pt clues obviously easier than 1000-pt clues

## Daily Double:
After generating all 30 questions, randomly mark exactly 2 of them as Daily Doubles.
Daily Doubles MUST be 400 or 600 point clues (not 200, 800, or 1000).
${
  includeFinalJeopardy
    ? `
## Final Jeopardy:
Also generate 1 bonus "Final Jeopardy" question (category: "${topicConfig.finalJeopardyCategory}", legendary difficulty).
This should be the hardest question in the set — something only a true expert would know.
Add it to the array as a 31st item with points: 0 and isDailyDouble: false, isAnswered: false.
`
    : ""
}
## Output Instructions:
Return ONLY a valid JSON array. No markdown code blocks, no explanation text, no preamble.
Start your response with [ and end with ].

Each object must have exactly these fields:
{
  "id": "use a short unique slug like 'fw-ow-200-1' (topic-category-points-index)",
  "category": "exact category name — must be one of:\n${categoryNames}",
  "points": 200 | 400 | 600 | 800 | 1000,
  "clue": "The Jeopardy-style clue text here.",
  "correct_answer": "The expected answer",
  "difficulty": "easy" | "medium" | "hard" | "expert" | "legendary",
  "isDailyDouble": false,
  "isAnswered": false,
  "source": "claude"
}

Remember: mark isDailyDouble: true on exactly 2 questions (400 or 600 pt only).
${includeFinalJeopardy ? `The Final Jeopardy clue has points: 0 and id: "final-jeopardy".` : ""}

Generate all ${includeFinalJeopardy ? 31 : 30} questions now:`;
}

// ─── LOTR-Specific Context Block ───────────────────────────────────────────────
// Injects live data from The One API into the prompt when generating LOTR questions.

function buildLOTRContextBlock(context: LOTRContext): string {
  // Serialize context compactly — character names only (no wikiUrl bloat)
  const characterNames = context.characters
    .filter((c) => c.name && c.name !== "JRRT Tolkien")
    .map((c) => `${c.name} (${c.race || "Unknown race"})`)
    .slice(0, 60)
    .join(", ");

  const movieList = context.movies
    .map(
      (m) =>
        `${m.name} (${m.academyAwardWins} Academy Award wins, ${m.rottenTomatoesScore}% RT)`
    )
    .join("\n");

  const quotesSample = context.quotes
    .slice(0, 40)
    .map((q) => `"${q.dialog}" — from ${q.movieName}`)
    .join("\n");

  return `
## LOTR Universe Reference Data (from The One API):

### Movies:
${movieList || "(API unavailable — use your own knowledge)"}

### Notable Characters:
${characterNames || "(API unavailable — use your own knowledge)"}

### Memorable Quotes:
${quotesSample || "(API unavailable — use your own knowledge)"}
`;
}
