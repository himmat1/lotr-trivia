// ─── The One API Client ───────────────────────────────────────────────────────
// Wraps the theoneapi.dev REST API to fetch authentic LOTR data.
// This data is passed as context to Claude for richer, more accurate question generation.
//
// API key: THE_ONE_API_KEY (free tier: 1000 requests/day)
// Register at: https://the-one-api.dev/sign-up

const BASE_URL = "https://the-one-api.dev/v2";

// ─── Response Types ───────────────────────────────────────────────────────────

interface OneApiResponse<T> {
  docs: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

export interface LOTRMovie {
  _id: string;
  name: string;
  runtimeInMinutes: number;
  budgetInMillions: number;
  boxOfficeRevenueInMillions: number;
  academyAwardNominations: number;
  academyAwardWins: number;
  rottenTomatoesScore: number;
}

export interface LOTRCharacter {
  _id: string;
  height: string;
  race: string;
  gender: string;
  birth: string;
  spouse: string;
  death: string;
  realm: string;
  hair: string;
  name: string;
  wikiUrl: string;
}

export interface LOTRQuote {
  _id: string;
  dialog: string;
  movie: string; // movie ID
  character: string; // character ID
  id: string;
}

// Aggregated context passed to Claude for question generation
export interface LOTRContext {
  movies: LOTRMovie[];
  characters: LOTRCharacter[];
  quotes: Array<{
    dialog: string;
    movieName: string;
  }>;
}

// ─── Module-Level Cache ───────────────────────────────────────────────────────
// Cache LOTR data at the module level so we only call the API once per server
// process restart — well within the 1000 req/day free tier.

let cachedContext: LOTRContext | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

// ─── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchFromAPI<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const apiKey = process.env.THE_ONE_API_KEY;
  if (!apiKey) {
    console.warn("[TheOneAPI] No API key — skipping live data fetch");
    return [];
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
    // Next.js fetch cache — revalidate every 6 hours
    next: { revalidate: 21600 },
  });

  if (!res.ok) {
    console.warn(`[TheOneAPI] ${endpoint} failed: ${res.status}`);
    return [];
  }

  const data: OneApiResponse<T> = await res.json();
  return data.docs;
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Fetch all LOTR context in parallel and cache it.
// Falls back to empty arrays if the API is unavailable.
export async function fetchLOTRContext(): Promise<LOTRContext> {
  // Return cached data if fresh
  if (cachedContext && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedContext;
  }

  console.log("[TheOneAPI] Fetching fresh LOTR context...");

  // Fetch movies, characters, and quotes in parallel
  const [movies, characters, rawQuotes] = await Promise.all([
    fetchFromAPI<LOTRMovie>("/movie"),
    fetchFromAPI<LOTRCharacter>("/character", { limit: "100" }),
    fetchFromAPI<LOTRQuote>("/quote", { limit: "200" }),
  ]);

  // Build a movie ID → name lookup for enriching quotes
  const movieLookup = new Map(movies.map((m) => [m._id, m.name]));

  // Filter to memorable quotes (dialog length > 20 chars) and attach movie name
  const quotes = rawQuotes
    .filter((q) => q.dialog && q.dialog.length > 20 && q.dialog.length < 300)
    .slice(0, 80) // keep the 80 best quotes to avoid token bloat
    .map((q) => ({
      dialog: q.dialog,
      movieName: movieLookup.get(q.movie) ?? "Unknown",
    }));

  cachedContext = { movies, characters, quotes };
  cacheTimestamp = Date.now();

  console.log(
    `[TheOneAPI] Cached ${movies.length} movies, ${characters.length} chars, ${quotes.length} quotes`
  );

  return cachedContext;
}
