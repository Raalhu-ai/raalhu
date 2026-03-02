# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start backend (Express, port 3000)
pnpm dev:server

# Start frontend (Vite, port 5173, proxies /auth and /api/* to :3000)
pnpm dev:frontend

# Build frontend for production
pnpm --filter mogger-frontend build

# Deploy backend (Cloudflare Worker) — must be done manually
cd server && pnpm run deploy
```

Both servers must run simultaneously during development. Always use `pnpm`.

## Deployment

- **Frontend** (Cloudflare Pages): deploys automatically on git push
- **Backend** (Cloudflare Worker): must be manually deployed via `cd server && pnpm run deploy` (runs `wrangler deploy`)

## Architecture

Monorepo with pnpm workspaces (`server/` and `frontend/`).

**server/** — Express 5 backend (CommonJS). Handles Google OAuth, proxies Google Code Assist API for per-user Gemini quota, manages in-memory cookie-based sessions. No database.

**frontend/** — SvelteKit app (SSR disabled, client-only SPA). Uses Svelte 5 runes, Tailwind CSS v4, shadcn-svelte (bits-ui), and Vercel AI SDK (`@ai-sdk/svelte`).

### Request Flow

1. User authenticates via Google OAuth → session cookie (`mogger_session`)
2. Frontend calls `POST /api/setup` to provision a Code Assist project (calls `loadCodeAssist` then `onboardUser` if needed)
3. User selects a mode from the dashboard → form dialog (if applicable) → chat session
4. Chat messages go: `ChatView` → `POST /api/chat` (SvelteKit server route) → `POST /api/stream` (Express) → Gemini SSE
5. The SvelteKit `/api/chat` endpoint translates between AI SDK Data Stream Protocol v1 and Gemini SSE format

### Frontend Patterns

- **App state machine** in `+page.svelte`: `loading → login → setup → dashboard → chat`
- **Prompt modules** (`src/lib/prompts/*.ts`): each exports `getInitialMessages()` and `buildPrompt(formData)`. Seven modes: chat, generate, rephrase, summarize, translate, research, web_search
- **Bilingual UI**: Dhivehi (Thaana script, RTL) as primary language, English secondary. Use `.thaana` and `.thaana-heading` CSS classes for Thaana text
- **Component props**: Use `let { prop } = $props()` (Svelte 5 runes, not legacy `export let`)
- **UI components**: shadcn-svelte in `src/lib/components/ui/`, app components directly in `src/lib/components/`
- **Transliteration** (`src/lib/transliterate.ts`): `englishToThaana(text)` converts Latin text to Thaana script, `isLatinText(text)` detects Latin-only strings. Use these whenever user-facing text might come back in English (e.g. AI-generated titles) — this is a Dhivehi-first app, all visible text must be in Thaana
- **Chat history** (`src/lib/db.ts` + `src/lib/chat-history.ts`): IndexedDB via Dexie for client-side session persistence. Sessions are created on chat start, messages auto-saved when chat status becomes `ready`, AI-generated titles via `POST /api/title` (uses `gemini-2.0-flash`)

### Code Assist API Gotchas

- Field name is `cloudaicompanionProject` (all lowercase), NOT `cloudAiCompanionProject`
- `loadCodeAssist` returns project as a **string**; `onboardUser` returns it as an **object** `{ id, name, projectNumber }`
- `loadCodeAssist` body: `{ metadata: { ideType: "GEMINI_CLI" } }` — no `clientType` field
- `onboardUser` requires `tierId` from `loadCodeAssist().allowedTiers[n].id` (`"free-tier"` or `"standard-tier"`)
- HTTP 428 from the API means Terms of Service acceptance is required

### Theme

"Neutral Dark" theme with a royal cobalt blue accent (`#1a3a8a` light / `#7d9fe3` dark). Background `#242526` in dark mode. Minimal, content-first aesthetic. No glows, grain, or vignette. Custom Thaana fonts: "MV Typewriter" for body, "Sangu Suruhee" for headings.

### Landing Page Assets

Illustrations and photos are stored in `asset/` and copied to `frontend/static/` for use:
- **Hero**: `hero.jpg` — dark wave illustration (Great Wave style)
- **Sections**: `sections/free.jpg` (whale shark), `sections/python.jpg` (snake), `sections/document.jpg` (children with Thaana boards), `sections/recipe.jpg` (women cooking)
- **Feature cards**: `features/websearch.jpg` (harbor), `features/documentgeneration.jpg` (man writing), `features/modelchange.jpg` (woman by tree)
- **Footer**: `footer.jpg` — dark aerial beach with palm trees
