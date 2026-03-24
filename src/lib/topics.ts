// ─── Topic Configuration Registry ─────────────────────────────────────────────
// Defines all available trivia topics. Each topic has 6 categories, prompt
// instructions injected into the Claude question prompt, and source materials.
//
// To add a new topic: add a TopicId variant, add an entry to TOPICS.

export type TopicId = "lotr" | "friends" | "animal_kingdom";

export interface TopicConfig {
  id: TopicId;
  name: string;                    // display name shown in the lobby UI
  emoji: string;                   // decorative emoji shown next to the name
  categories: string[];            // exactly 6 category names for the board
  finalJeopardyCategory: string;   // category label used on the FJ screen
  // Injected into the Claude prompt — describes this topic's categories and content
  promptInstructions: string;
  // Source materials — Claude is asked to cover each with ≥3 questions
  sourceMaterials: string[];
}

export const TOPICS: Record<TopicId, TopicConfig> = {
  // ─── Lord of the Rings ────────────────────────────────────────────────────
  lotr: {
    id: "lotr",
    name: "Lord of the Rings",
    emoji: "💍",
    categories: [
      "Fellowship & Heroes",
      "Rings & Dark Powers",
      "Lands of Middle-earth",
      "Epic Battles & Wars",
      "The Shire & Hobbit Life",
      "Ancient Lore & Languages",
    ],
    finalJeopardyCategory: "Ancient Lore & Languages",
    promptInstructions: `You are the greatest Lord of the Rings trivia master in all of Middle-earth.
Generate Jeopardy-style trivia clues for a game covering the complete LOTR universe.

## Categories:
Generate exactly 5 questions per category, one at each point value:

1. **"Fellowship & Heroes"** — Frodo, Gandalf, Aragorn, Legolas, Gimli, Sam, Boromir, Faramir, Eowyn, Pippin, Merry, Bilbo, Thorin, actor facts, character relationships
2. **"Rings & Dark Powers"** — The One Ring, the 19 Rings of Power, Sauron, Saruman, Morgoth, Ringwraiths/Nazgûl, the Eye of Sauron, Gollum/Sméagol
3. **"Lands of Middle-earth"** — the Shire, Rivendell, Rohan, Gondor, Mordor, Mirkwood, Erebor, the Misty Mountains, Lothlórien, Isengard, Helms Deep, geography
4. **"Epic Battles & Wars"** — Battle of Helm's Deep, Pelennor Fields, Black Gate, Five Armies, Weathertop, battles of the First/Second Ages, military tactics, weapons
5. **"The Shire & Hobbit Life"** — Hobbit customs, Bag End, the Tooks, Brandybucks, longbottom leaf, birthday parties, Hobbit food and culture, Green Dragon Inn
6. **"Ancient Lore & Languages"** — Quenya, Sindarin, Black Speech, Tengwar alphabet, Tolkien's academic background, the Silmarillion, Ages of Middle-earth, the Valar and Maiar`,
    sourceMaterials: [
      "The Fellowship of the Ring (film, 2001)",
      "The Two Towers (film, 2002)",
      "The Return of the King (film, 2003)",
      "The Lord of the Rings (books by J.R.R. Tolkien — include book-only content)",
      "The Hobbit: An Unexpected Journey (film, 2012)",
      "The Hobbit: The Desolation of Smaug / Battle of the Five Armies (films, 2013/2014)",
      "The Hobbit (book by J.R.R. Tolkien — include book-only content)",
    ],
  },

  // ─── Friends (TV Show) ───────────────────────────────────────────────────
  friends: {
    id: "friends",
    name: "Friends",
    emoji: "☕",
    categories: [
      "The One Where…",
      "Central Perk & The Apartment",
      "Characters & Relationships",
      "Iconic Quotes",
      "Love, Breakups & Drama",
      "Behind the Scenes",
    ],
    finalJeopardyCategory: "Behind the Scenes",
    promptInstructions: `You are the ultimate Friends (the TV show, 1994–2004) trivia expert.
Generate Jeopardy-style trivia clues for a game covering all 10 seasons of the NBC sitcom Friends.

## Categories:
Generate exactly 5 questions per category, one at each point value:

1. **"The One Where…"** — episode titles, specific episode plots, memorable moments from individual episodes
2. **"Central Perk & The Apartment"** — the coffee house, Monica/Rachel's apartment, Chandler/Joey's apartment, Ugly Naked Guy, recurring NYC locations
3. **"Characters & Relationships"** — Ross, Rachel, Monica, Chandler, Joey, Phoebe — backstories, jobs, family members, character quirks and running gags
4. **"Iconic Quotes"** — famous lines: "We were on a break!", "How you doin'?", "Smelly Cat", "PIVOT!", "Oh. My. God!", "Could this BE any more…"
5. **"Love, Breakups & Drama"** — relationships (Ross & Rachel, Monica & Chandler, Joey's love interests, Phoebe & Mike), weddings, breakups, dramatic moments
6. **"Behind the Scenes"** — cast real names and backgrounds, Emmy wins, guest stars, show creators, theme song, network, production facts`,
    sourceMaterials: [
      "Friends Season 1 (1994–1995)",
      "Friends Seasons 2–3 (1995–1997)",
      "Friends Seasons 4–5 (1997–1999)",
      "Friends Seasons 6–7 (1999–2001)",
      "Friends Seasons 8–9 (2001–2003)",
      "Friends Season 10 and series finale (2003–2004)",
      "Friends: The Reunion (2021 HBO Max special) and behind-the-scenes facts",
    ],
  },

  // ─── Animal Kingdom ───────────────────────────────────────────────────────
  animal_kingdom: {
    id: "animal_kingdom",
    name: "Animal Kingdom",
    emoji: "🦁",
    categories: [
      "Mammals",
      "Birds & Reptiles",
      "Ocean & Aquatic Life",
      "Insects & Arachnids",
      "Endangered & Extinct",
      "Animal Behavior & Adaptations",
    ],
    finalJeopardyCategory: "Animal Behavior & Adaptations",
    promptInstructions: `You are the world's foremost animal kingdom trivia expert.
Generate Jeopardy-style trivia clues covering the entire animal kingdom — from common pets to the most exotic creatures.

## Categories:
Generate exactly 5 questions per category, one at each point value:

1. **"Mammals"** — land and sea mammals, mammal biology, reproduction, habitats, record-holders (fastest, largest, smallest, strongest)
2. **"Birds & Reptiles"** — birds of prey, flightless birds, migration, reptiles (snakes, lizards, crocodilians, turtles), bird and reptile biology
3. **"Ocean & Aquatic Life"** — fish, sharks, whales, dolphins, octopus, jellyfish, coral reefs, deep sea creatures, freshwater animals
4. **"Insects & Arachnids"** — ants, bees, butterflies, beetles, spiders, scorpions, insect colonies, metamorphosis, record-holding species
5. **"Endangered & Extinct"** — IUCN Red List, extinction events, dinosaurs, recently extinct species, conservation efforts, prehistoric animals
6. **"Animal Behavior & Adaptations"** — camouflage, mimicry, migration, mating rituals, tool use, symbiosis, animal intelligence, biological superpowers`,
    sourceMaterials: [
      "Mammalogy — land and sea mammals",
      "Ornithology and Herpetology — birds and reptiles",
      "Marine biology — ocean and aquatic creatures",
      "Entomology and Arachnology — insects and spiders",
      "Paleontology — prehistoric and extinct animals",
      "Ethology — animal behavior and adaptation science",
      "Conservation biology — endangered species worldwide",
    ],
  },
};

// Helper to safely retrieve a topic config (falls back to LOTR if unknown)
export function getTopicConfig(id: TopicId): TopicConfig {
  return TOPICS[id] ?? TOPICS.lotr;
}
