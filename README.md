# Mogger

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An AI-powered assistant with a bilingual (Dhivehi/English) interface, built as a multi-platform monorepo. Features chat streaming, multi-turn agent tool calling, a Pyodide Python sandbox, document generation, and more — across web, mobile, desktop, and browser extension.

## Architecture

```
frontend/        → SvelteKit web app (primary)
apps/
  mobile/        → Expo Router (iOS/Android) + NativeWind
  desktop/       → Electron + React Native Web
  extension/     → Chrome Extension (Manifest V3) + React Native Web
  landing/       → Landing page (on hold)
packages/
  shared/        → Business logic, API client, types, agent logic
  ui/            → Shared React Native + NativeWind components
  config/        → Shared Tailwind theme + TypeScript configs
server/          → Hono backend on Cloudflare Workers
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

## Quick Start

```bash
# Install dependencies
pnpm install

# Start backend + web frontend together
pnpm dev
```

The web app will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

## Running Individual Apps

```bash
# Backend only (Hono on Cloudflare Workers, port 3000)
pnpm dev:server

# SvelteKit frontend only
pnpm dev:frontend

# Mobile (Expo — requires iOS/Android simulator or device)
pnpm dev:mobile

# Desktop (Electron — starts backend automatically)
pnpm dev:desktop

# Browser extension (watch mode — load dist/ as unpacked in Chrome)
pnpm dev:extension
```

## Building for Production

```bash
# Web (SvelteKit)
pnpm build:web

# Desktop (Electron)
pnpm build:desktop

# Browser extension
pnpm build:extension
```

## Deployment

| Platform   | Method                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Web        | Cloudflare Pages — deploys automatically on `git push`                 |
| Backend    | Cloudflare Worker — manual: `cd server && pnpm run deploy`             |
| Mobile     | EAS Build: `pnpm --filter @raalhu/mobile build:ios` / `build:android` |
| Desktop    | electron-builder: `pnpm --filter @raalhu/desktop package`             |
| Extension  | `pnpm build:extension` → load `apps/extension/dist/` in Chrome        |

## Environment Variables

Each app has a `.env.example` — copy and fill in your values:

```bash
cp .env.example .env                       # root (EAS project ID)
cp server/.env.example server/.env         # backend (OAuth + KV)
cp frontend/.env.example frontend/.env     # frontend (GA + backend URL)
cp apps/mobile/.env.example apps/mobile/.env  # mobile (API base URL)
```

| Variable | Location | Description |
| --- | --- | --- |
| `OAUTH_CLIENT_ID` | `server/.env` | Google OAuth client ID |
| `OAUTH_CLIENT_SECRET` | `server/.env` | Google OAuth client secret |
| `KV_AUTH_SESSIONS_ID` | `server/.env` | Cloudflare KV namespace ID for auth sessions |
| `KV_SESSIONS_ID` | `server/.env` | Cloudflare KV namespace ID for sessions |
| `BACKEND_URL` | `frontend/.env` | Backend URL (defaults to `http://localhost:3000`) |
| `PUBLIC_GA_ID` | `frontend/.env` | Google Analytics ID (optional) |
| `EXPO_PUBLIC_API_BASE` | `apps/mobile/.env` | API base URL for mobile (defaults to `http://localhost:3000`) |
| `EAS_PROJECT_ID` | Root `.env` | Expo EAS project ID (from `eas init`, mobile builds only) |

For production Cloudflare Workers, set OAuth secrets via `wrangler secret put`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

[MIT](LICENSE)
