# Contributing to Mogger

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.x+

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/mogger.git
   cd mogger
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Configure the backend:

   `server/wrangler.toml` is gitignored — copy the example and fill in your values:
   ```bash
   cp server/wrangler.toml.example server/wrangler.toml
   ```

   Create your KV namespaces (requires a Cloudflare account):
   ```bash
   cd server
   bunx wrangler kv namespace create AUTH_SESSIONS
   bunx wrangler kv namespace create SESSIONS
   ```
   Paste the returned IDs into `server/wrangler.toml`.

   Add your OAuth credentials to `server/.dev.vars` (create the file if it doesn't exist):
   ```
   OAUTH_CLIENT_ID=your-google-oauth-client-id
   OAUTH_CLIENT_SECRET=your-google-oauth-client-secret
   ```

5. Start the dev server:
   ```bash
   bun dev
   ```

See the [README](README.md) for commands to run individual apps (mobile, desktop, extension).

## Making Changes

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes
3. Test locally with the relevant dev command
4. Commit with a clear message:
   ```
   feat: add search to sidebar
   fix: correct streaming timeout on slow connections
   docs: update deployment instructions
   ```
   Use conventional commit prefixes: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Describe what changed and why in the PR description
- Link any related issues
- Make sure the app builds and works locally before submitting

## Project Structure

This is a bun monorepo. See [CLAUDE.md](CLAUDE.md) for a detailed architecture overview, including package scopes, shared agent logic, and platform-specific details.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming and respectful environment.

## Questions?

Open a [discussion](https://github.com/Elgius/mogger/discussions) or file an issue.
