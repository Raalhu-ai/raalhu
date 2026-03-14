# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start backend + SvelteKit frontend together (most common)
pnpm dev

# Start backend only (Hono on Cloudflare Workers, port 3000)
pnpm dev:server

# Start SvelteKit frontend only
pnpm dev:frontend

# Start mobile app (Expo, iOS/Android)
pnpm dev:mobile

# Start desktop app (Electron + backend together)
pnpm dev:desktop

# Start browser extension dev (watch mode)
pnpm dev:extension

# Build web for production (SvelteKit)
pnpm build:web

# Build browser extension
pnpm build:extension

# Deploy backend (Cloudflare Worker) — must be done manually
cd server && pnpm run deploy
```

Always use `pnpm`.

## Deployment

- **Web** (Cloudflare Pages): deploys automatically on git push (SvelteKit build from `frontend/`)
- **Backend** (Cloudflare Worker): must be manually deployed via `cd server && pnpm run deploy`
- **Mobile**: via EAS Build (`pnpm --filter @raalhu/mobile build:ios` / `build:android`)
- **Desktop**: via electron-builder (`pnpm --filter @raalhu/desktop package`)
- **Extension**: `pnpm build:extension` → load `apps/extension/dist/` as unpacked extension in Chrome

## Architecture

Monorepo with pnpm workspaces:

```
frontend/     → SvelteKit web app (PRIMARY, self-contained — no @raalhu/* imports)
apps/
  mobile/     → Expo Router (iOS/Android) + NativeWind — ~80% feature-complete
  desktop/    → Electron + React Native Web — ~90% feature-complete
  extension/  → Chrome Extension (Manifest V3) + React Native Web
  landing/    → Landing page (Svelte + Vite) — DEVELOPMENT ON HOLD
packages/
  shared/     → Business logic, API client, types, utils, AGENT LOGIC
  ui/         → Shared React Native + NativeWind components
  config/     → Shared Tailwind + TypeScript configs
server/       → Hono backend on Cloudflare Workers
_archive/
  web_expo/   → Archived Expo Web app (replaced by frontend/)
```

### Package Scopes

- `mogger-frontend` — SvelteKit web app (primary)
- `@raalhu/mobile` — mobile app
- `@raalhu/desktop` — desktop app
- `@raalhu/extension` — browser extension (Chrome MV3)
- `@raalhu/ui` — shared UI components (NativeWind + React Native)
- `@raalhu/shared` — shared business logic, types, and agent code
- `@raalhu/config` — shared configs (Tailwind theme, tsconfigs)
- `mogger-server` — backend

### App Structure

**Frontend (`frontend/`):**
- SvelteKit web app — self-contained, no `@raalhu/*` imports
- Fully functional: auth, chat streaming, agent loop, tool calling, Pyodide sandbox, projects, artifacts, settings
- Deployed to Cloudflare Pages

**Mobile (`apps/mobile/`):**
- `app/` — Expo Router routes
- `src/screens/` — LoginPage, Dashboard, SettingsPage, ChatScreen
- `src/components/` — ChatInput, Sidebar, MarkdownText, ThinkingBlock, ToolCallStep, MessageCompose, RecipeDisplay, UserInputWidget
- `src/agent/` — Platform-specific: loop (XHR-based SSE), sandbox (WebView bridge), PyodideSandboxProvider
- Agent tools/types/skills/retry/prompt → thin re-exports from `@raalhu/shared/src/agent`
- `src/agent/executor.ts` → `createExecutor(mobileAdapter)` with expo-file-system for `present_file`
- `src/api.ts` → `createApiClient(API_BASE, expoSecureStoreAdapter)` from `@raalhu/shared/src/api-core`
- Working: auth, chat streaming, all 11 tools, settings, sessions
- Missing: projects UI, artifacts gallery

**Desktop (`apps/desktop/`):**
- `src/main.ts` — Electron main process
- `src/preload.ts` — Context bridge (`window.platform`)
- `src/renderer/` — React app (App, Dashboard, LoginPage, LandingPage, Sidebar, ChatInput, SettingsPage, AgentChat, tool renderers)
- `src/renderer/agent/` — Platform-specific: gemini-transport (ReadableStream SSE), sandbox (Web Worker), constants (Thaana labels)
- Agent tools/types/skills/retry/prompt → thin re-exports from `@raalhu/shared/src/agent`
- `src/renderer/agent/executor.ts` → `createExecutor(desktopAdapter)` with Blob URLs for `present_file`
- `src/renderer/api.ts` → `createApiClient(API_BASE, localStorageAdapter)` from `@raalhu/shared/src/api-core`
- Working: auth, sidebar, settings, session list, quota display, model selection, chat streaming (SSE), agent loop with multi-turn tool calling, all 11 tools (including Pyodide sandbox), message/FS persistence via Dexie, projects UI, artifacts gallery, title generation
- Missing: file attachments not sent to model (UI-only), voice (ON HOLD)

### Shared Agent (`packages/shared/src/agent/`)

Consolidated agent logic shared across mobile, desktop, and extension:

```
packages/shared/src/agent/
  index.ts          — barrel export
  types.ts          — unified types (ToolResult, SandboxLike, PlatformAdapter, AgentEvent, AgentStep, etc.)
  tools.ts          — AGENT_TOOLS (Gemini function declarations for all 11 tools)
  skills.ts         — inline skill content + getSkillContent/getSkillList (6 skills: docx, pdf, xlsx, pptx, text-processing, csv-data)
  retry.ts          — configureAgent() + fetchWithRetry with exponential backoff
  executor-core.ts  — createExecutor(adapter: PlatformAdapter) — handles 10/11 tools, delegates present_file to adapter
  prompt.ts         — getSystemPrompt(opts: { hasSandbox?, customInstructions? })
```

**Key abstraction — `PlatformAdapter`:**
- `presentFile(sandbox, path, label)` — platform-specific file presentation (Blob URLs on desktop, expo-file-system on mobile)
- `fetchApi(path, init)` — platform-specific API fetch with auth

**What stays platform-specific:**
- `loop.ts` / `gemini-transport.ts` — Mobile: XHR-based SSE. Desktop: ReadableStream + `@ai-sdk/react`
- `sandbox.ts` — Mobile: hidden WebView bridge. Desktop: Web Worker
- `PyodideSandboxProvider.tsx` — Mobile-only React context for WebView

### Shared API Client (`packages/shared/src/api-core.ts`)

`createApiClient(baseUrl, storage: SessionStorage)` — configurable API client:
- Mobile: `expoSecureStoreAdapter` (expo-secure-store)
- Desktop/Extension: `localStorageAdapter` (localStorage)
- Returns: `startLogin`, `exchangeCode`, `fetchMe`, `setupCodeAssist`, `fetchQuota`, `logout`, `getAuthHeaders`

### Shared UI (`packages/ui`)

React Native primitives + NativeWind classes for cross-platform use:
- Mobile: native React Native
- Desktop: via `react-native-web` in Electron renderer

Components: `Button`, `Card`, `Text`, `TextInput`, `Badge` — use `cn()` utility for merging Tailwind classes.

Note: Mobile and Desktop currently use their own inline components rather than `@raalhu/ui` — consolidation is pending.

### Shared Logic (`packages/shared`)

Platform-agnostic TypeScript: API client, types, transliteration, modes, greetings, chat history, project store, settings, inspiration cards. Import as `@raalhu/shared`.

Storage is platform-specific:
- Web/Desktop: IndexedDB via Dexie
- Mobile: expo-secure-store for auth, expo-sqlite for sessions/data

### Request Flow

1. User authenticates via Google OAuth → session stored (cookie on web, secure-store on mobile, localStorage on desktop)
2. App calls `POST /api/setup` to provision a Code Assist project
3. User sends a message → agent chat session
4. Chat messages → `POST /api/stream` (server) → Gemini SSE
5. Agent loop handles multi-turn tool calling (up to 15 turns)

### Code Assist API Gotchas

- Field name is `cloudaicompanionProject` (all lowercase), NOT `cloudAiCompanionProject`
- `loadCodeAssist` returns project as a **string**; `onboardUser` returns it as an **object** `{ id, name, projectNumber }`
- `loadCodeAssist` body: `{ metadata: { ideType: "GEMINI_CLI" } }` — no `clientType` field
- `onboardUser` requires `tierId` from `loadCodeAssist().allowedTiers[n].id` (`"free-tier"` or `"standard-tier"`)
- HTTP 428 from the API means Terms of Service acceptance is required

### Theme

"Neutral Dark" theme with a royal cobalt blue accent (`#1a3a8a` light / `#7d9fe3` dark). Background `#242526` in dark mode. Minimal, content-first aesthetic. No glows, grain, or vignette. Custom Thaana fonts: "MV Typewriter" for body, "Sangu Suruhee" for headings.

Theme colors are defined in `packages/config/tailwind.config.ts` and shared across all apps.

### Bilingual UI

Dhivehi (Thaana script, RTL) as primary language, English secondary. Use `Text` component with `variant="thaana"` or `variant="thaana-heading"` for Thaana text. Transliteration utilities in `@raalhu/shared`.

### Landing Page (`apps/landing/`)

**Landing page development is ON HOLD until further notice.** The app exists as a Svelte + Vite SPA but should not be extended or worked on.

### Voice / Speech-to-Text

**Voice input and Whisper transcription are ON HOLD until further notice.** Do not implement, wire up, or work on voice/transcription features in any app. The code exists in some apps (`apps/desktop/src/renderer/voice.ts`, `apps/desktop/src/renderer/transcribe.ts`, `@raalhu/shared/voice`) but should not be connected or extended.

### Projects

Projects are 100% client-side — files, instructions, and memory are all stored in IndexedDB via Dexie. No server involvement. Currently implemented in `apps/desktop/` and was in the archived `apps/web/`.

### Landing Page Assets

Illustrations and photos are stored in `asset/`:
- **Hero**: `hero.jpg` — dark wave illustration (Great Wave style)
- **Sections**: `sections/free.jpg` (whale shark), `sections/python.jpg` (snake), `sections/document.jpg` (children with Thaana boards), `sections/recipe.jpg` (women cooking)
- **Feature cards**: `features/websearch.jpg` (harbor), `features/documentgeneration.jpg` (man writing), `features/modelchange.jpg` (woman by tree)
- **Footer**: `footer.jpg` — dark aerial beach with palm trees
