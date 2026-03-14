# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

```bash
npm run dev     # Start dev server (Next.js + Turbopack)
npm run build   # Production build
npm run start   # Start production server
npm run test    # Run tests (Vitest)
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude claude-sonnet-4-6 question generation |
| `THE_ONE_API_KEY` | No | theoneapi.dev — authentic LOTR data context |

Copy `.env.example` to `.env.local` and fill in your values.

## Architecture

LOTR Trivia is a network-multiplayer Jeopardy-style trivia game built with Next.js 15 App Router.

### Real-Time Multiplayer
- **SSE (Server-Sent Events)** at `GET /api/game/[sessionId]/stream` — pushes session state to all connected devices
- **HTTP PATCH** at `/api/game/[sessionId]` — players send actions; server updates state + broadcasts via SSE
- **In-memory session store** (`src/lib/session-store.ts`) — `globalThis` Map + Node.js EventEmitter
- No external real-time service needed for local/self-hosted deployment
- **For Vercel serverless**: replace EventEmitter with Pusher (free tier sufficient)

### Game Flow
```
Lobby (/) → Create or Join → Waiting Room → Generating Questions → Jeopardy Board
→ [pick tile → clue open → buzz in → judge → reveal] ×30 → Final Jeopardy → Game Over
```

### Question Generation
- `src/lib/question-generator.ts` orchestrates: The One API → Claude prompt → JSON parse → fallback
- `src/lib/prompts/question-prompt.ts` — Claude prompt with LOTR context + random seed
- `src/lib/fallback-questions.ts` — 30 hardcoded questions (used when AI/API unavailable)
- Claude generates 30 board questions + 1 Final Jeopardy question per game session
- Source coverage enforced: ≥3 questions from each of 7 LOTR/Hobbit source materials

### Key Files

| File | Purpose |
|---|---|
| `src/types/game.ts` | All TypeScript interfaces — single source of truth |
| `src/lib/session-store.ts` | In-memory session store + EventEmitter broadcaster |
| `src/lib/game-engine.ts` | Pure state transition functions (no I/O) |
| `src/lib/contexts/game-context.tsx` | React Context: SSE subscriber + action dispatchers |
| `src/app/api/game/[sessionId]/route.ts` | GET session state; PATCH game actions |
| `src/app/api/game/[sessionId]/stream/route.ts` | SSE stream endpoint |
| `src/components/board/JeopardyBoard.tsx` | Main 6×5 game board |
| `src/components/clue/ClueModal.tsx` | Clue display + timer + buzz-in flow |
| `src/components/special/FinalJeopardyModal.tsx` | Final Jeopardy (betting → answering → reveal) |

### Player Identity
- `playerId` (UUID) assigned at join/create time
- Stored in `sessionStorage` as `lotr_player_[sessionId]`
- Survives page refresh but not new tabs — appropriate for in-session play

### Game State
- `GameSession` in `src/types/game.ts` is the canonical shape
- `ClientGameSession` is the client-safe version (Daily Double flags hidden in board listing)
- `GamePhase` state machine: `waiting → generating → board → clue_open → buzzed_in → answer_reveal → final_jeopardy → game_over`

### Daily Double Anti-Cheat
- `isDailyDouble: true` is **never** included in board GET responses
- Only revealed in the PATCH response when `action.type === "select_clue"` for that tile
- `dailyDoubleIds` array is stored server-side only, never sent to clients

## Code Style

- Use comments often to explain intent and context throughout the code
- TypeScript strict mode
- Tailwind CSS 4 with custom LOTR color palette (see `globals.css`)
- Font: Cinzel + Cinzel Decorative from Google Fonts
- Server Components where possible; Client Components only where interactivity needed
