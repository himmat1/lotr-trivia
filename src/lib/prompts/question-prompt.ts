// ─── Claude Question Generation Prompt ───────────────────────────────────────
// Builds the prompt used to ask Claude claude-sonnet-4-6 to generate 30 unique
// Jeopardy-style trivia questions for a LOTR game session.
//
// The randomSeed parameter causes Claude to vary its question selection each game,
// ensuring players don't see the same clues across sessions.

import type { LOTRContext } from "@/lib/the-one-api";

export function buildQuestionPrompt(
  context: LOTRContext,
  randomSeed: number,
  includeFinalJeopardy = true
): string {
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

  return `You are the greatest Lord of the Rings trivia master in all of Middle-earth.
Generate Jeopardy-style trivia clues for a game covering the complete LOTR universe.

## Game Seed: ${randomSeed}
Use this seed to vary your question selection. Each seed should produce different questions.
Do NOT generate your most "obvious" or "default" questions — explore the full depth of the lore.

## LOTR Universe Reference Data (from The One API):

### Movies:
${movieList || "(API unavailable — use your own knowledge)"}

### Notable Characters:
${characterNames || "(API unavailable — use your own knowledge)"}

### Memorable Quotes:
${quotesSample || "(API unavailable — use your own knowledge)"}

## Source Coverage Requirement:
Across all 30 questions, include AT LEAST 3 questions from EACH of these sources:
- The Fellowship of the Ring (film, 2001)
- The Two Towers (film, 2002)
- The Return of the King (film, 2003)
- The Lord of the Rings (books by J.R.R. Tolkien — include book-only content)
- The Hobbit: An Unexpected Journey (film, 2012)
- The Hobbit: The Desolation of Smaug / Battle of the Five Armies (films, 2013/2014)
- The Hobbit (book by J.R.R. Tolkien — include book-only content)

## Categories:
Generate exactly 5 questions per category, one at each point value:

1. **"Fellowship & Heroes"** — Frodo, Gandalf, Aragorn, Legolas, Gimli, Sam, Boromir, Faramir, Eowyn, Pippin, Merry, Bilbo, Thorin, actor facts, character relationships
2. **"Rings & Dark Powers"** — The One Ring, the 19 Rings of Power, Sauron, Saruman, Morgoth, Ringwraiths/Nazgûl, the Eye of Sauron, Gollum/Sméagol
3. **"Lands of Middle-earth"** — the Shire, Rivendell, Rohan, Gondor, Mordor, Mirkwood, Erebor, the Misty Mountains, Lothlórien, Isengard, Helms Deep, geography
4. **"Epic Battles & Wars"** — Battle of Helm's Deep, Pelennor Fields, Black Gate, Five Armies, Weathertop, battles of the First/Second Ages, military tactics, weapons
5. **"The Shire & Hobbit Life"** — Hobbit customs, Bag End, the Tooks, Brandybucks, longbottom leaf, birthday parties, Hobbit food and culture, Green Dragon Inn
6. **"Ancient Lore & Languages"** — Quenya, Sindarin, Black Speech, Tengwar alphabet, Tolkien's academic background, the Silmarillion, Ages of Middle-earth, the Valar and Maiar

## Difficulty Scale:
- 200 pts ("easy"): Very well-known facts. Any fan of the films knows this.
  Example: "This is the name of the hobbit who carries the One Ring to Mordor."
- 400 pts ("medium"): Common knowledge for casual fans.
  Example: "This is the elvish word for 'friend' inscribed on the Doors of Durin."
- 600 pts ("hard"): Requires close attention to the films or light book reading.
  Example: "This Rohirrim shield-maiden disguised herself as a man to fight at Pelennor Fields."
- 800 pts ("expert"): Film watchers who pay close attention, or book readers.
  Example: "This is the real name of Gollum before he became corrupted by the Ring."
- 1000 pts ("legendary"): Deep lore — book readers and Tolkien scholars only.
  Example: "This is the name Sauron used before serving Morgoth in the First Age."

## Format Rules:
- Write clues in classic Jeopardy style: the clue IS the answer/fact, players respond with a question form
- Clues should be one or two clear sentences
- Correct answers should be concise (1-5 words typically)
- Vary question styles: identification, fill-in-the-blank, quote attribution, "which film/book", counting
- DO NOT repeat similar questions or facts within the same category
- Make 200-pt clues obviously easier than 1000-pt clues

## Daily Double:
After generating all 30 questions, randomly mark exactly 2 of them as Daily Doubles.
Daily Doubles MUST be 400 or 600 point clues (not 200, 800, or 1000).
${
  includeFinalJeopardy
    ? `
## Final Jeopardy:
Also generate 1 bonus "Final Jeopardy" question (category: "Ancient Lore & Languages", legendary difficulty).
This should be the hardest question in the set — something only a true Tolkien scholar would know.
Add it to the array as a 31st item with points: 0 and isDailyDouble: false, isAnswered: false.
`
    : ""
}

## Output Instructions:
Return ONLY a valid JSON array. No markdown code blocks, no explanation text, no preamble.
Start your response with [ and end with ].

Each object must have exactly these fields:
{
  "id": "use a short unique slug like 'fh-200-1' (category-points-index)",
  "category": "exact category name from the list above",
  "points": 200 | 400 | 600 | 800 | 1000,
  "clue": "The Jeopardy-style clue text here.",
  "correct_answer": "The expected answer",
  "difficulty": "easy" | "medium" | "hard" | "expert" | "legendary",
  "isDailyDouble": false,
  "isAnswered": false,
  "source": "claude"
}

Remember: mark isDailyDouble: true on exactly 2 questions (400 or 600 pt only).
${includeFinalJeopardy ? 'The Final Jeopardy clue has points: 0 and id: "final-jeopardy".' : ""}

Generate all ${includeFinalJeopardy ? 31 : 30} questions now:`;
}
