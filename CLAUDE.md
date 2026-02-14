# CLAUDE.md

## Project overview

GlossAI is a Japanese translation app built with Next.js 15 (App Router, Turbopack) and Convex (self-hosted). Users type English text and get back Japanese with furigana annotations, romaji, and notes. Translations are persisted in Convex and browsable via a sidebar.

## Architecture

```
app/                  Next.js App Router pages + layout
components/           React components (EnglishInput, JapaneseOutput, FuriganaText, Sidebar, etc.)
hooks/                Custom hooks (useDebounce, useTranslation)
lib/types.ts          Shared TypeScript types (TranslationResult, Segment, etc.)
convex/               Convex backend functions
  schema.ts           Database schema (translations table)
  translate.ts        Action: translation with provider fallback chain
  translations.ts     Mutations + queries for CRUD on translations
  providers/          Translation provider implementations
    google.ts         Free Google Translate API + furigana annotation
    claude.ts         Anthropic Claude API translation
    openai.ts         OpenAI API translation
  lib/prompts.ts      Shared LLM prompts and JSON schemas
docker/               Docker infrastructure
  docker-compose.yml  Dev + prod Convex backends, dashboards
scripts/
  kuroshiro-server.js Standalone kuroshiro+kuromoji HTTP server (port 9100)
```

## Tech stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS 4
- **Backend:** Convex (self-hosted via Docker)
- **Translation providers:** Google Translate (free, primary), Claude, OpenAI (fallback chain)
- **Furigana:** `@sglkc/kuroshiro` + `@sglkc/kuroshiro-analyzer-kuromoji`

## Infrastructure: Dev + Prod Convex backends

Two independent Convex instances run on the same machine via Docker, each with its own data volume:

| Service        | Host port | Purpose          | Dashboard            |
|----------------|-----------|------------------|----------------------|
| convex-dev     | 3210      | Dev backend API  | http://localhost:6791 |
| convex-dev     | 3211      | Dev HTTP actions | -                    |
| convex-prod    | 3220      | Prod backend API | http://localhost:6792 |
| convex-prod    | 3221      | Prod HTTP actions| -                    |

### Starting infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d
```

### Generating admin keys

Admin keys are deterministic (derived from a secret in each volume). Re-running gives the same key.

```bash
docker compose -f docker/docker-compose.yml exec convex-dev ./generate_admin_key.sh
docker compose -f docker/docker-compose.yml exec convex-prod ./generate_admin_key.sh
```

### Nuking a database (fresh start)

```bash
docker compose -f docker/docker-compose.yml down
docker volume rm docker_convex-dev-data   # or docker_convex-prod-data
docker compose -f docker/docker-compose.yml up -d
# Re-generate admin key (it will change since the volume is new)
# Re-push schema with npx convex dev --once (or npx convex deploy)
```

## Environment files

Both are gitignored (`.env*.local` pattern).

**`.env.local`** (dev — used by `npx convex dev` and `npm run dev`):
```
NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<dev-admin-key>
```
`npx convex dev` also auto-writes `NEXT_PUBLIC_CONVEX_SITE_URL` into this file.

**`.env.production.local`** (prod — used by `npx convex deploy` and `next build`):
```
NEXT_PUBLIC_CONVEX_URL=http://localhost:3220
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3220
CONVEX_SELF_HOSTED_ADMIN_KEY=<prod-admin-key>
```

## Common commands

```bash
# ── Dev (3 terminals) ──
npx convex dev              # Terminal 1: Convex watcher, pushes to dev backend
npm run kuroshiro           # Terminal 2: Kuroshiro annotation server on :9100
npm run dev                 # Terminal 3: Next.js dev server on :3000

# ── Prod ──
npx convex deploy --env-file .env.production.local   # Deploy schema + functions
npm run build               # Build Next.js (uses .env.production.local → :3220)
npm run start               # Serve production Next.js on :3000

# ── Utilities ──
npx convex dev --once       # One-shot push to dev (no watch)
docker compose -f docker/docker-compose.yml ps       # Check containers
```

## Kuroshiro annotation server

The kuroshiro server (`scripts/kuroshiro-server.js`) runs kuroshiro + kuromoji outside Convex's bundler sandbox (kuromoji needs native dictionary loading). It exposes two endpoints on port 9100:

- `POST /annotate` — `{ "text": "Japanese text" }` → `{ segments, fullHiragana, romaji }`
- `GET /health` — readiness check

The Convex Google provider calls it at `http://host.docker.internal:9100` from inside Docker. Override with the `KUROSHIRO_URL` Convex environment variable if needed.

## Schema

The `translations` table (`convex/schema.ts`):

| Field              | Type                          | Notes                          |
|--------------------|-------------------------------|--------------------------------|
| english_text       | string                        | Source text                    |
| japanese_segments  | optional array of segment unions | Kanji (with reading), kana, punctuation |
| full_hiragana      | optional string               | Full hiragana reading          |
| romaji             | optional string               | Romanized Japanese             |
| notes              | string                        | Translation notes              |
| provider_used      | optional string               | Which provider succeeded       |
| created_at         | number                        | Epoch ms                       |
| updated_at         | number                        | Epoch ms                       |

Fields are optional because translations use a create-empty + patch-in-place model: an empty row is created first, then updated with results when the translation completes.

Indexes: `by_created_at`, `search_english` (full-text search).

## Translation provider fallback

The `translate` action (`convex/translate.ts`) tries providers in order: google -> claude -> openai. First success wins. Google is free and doesn't need API keys; Claude needs `ANTHROPIC_API_KEY`; OpenAI needs `OPENAI_API_KEY` (both set as Convex environment variables via the dashboard).

## Known quirk

`ctx.runMutation` inside Convex actions is broken on self-hosted Convex (throws "Invalid URL"). The workaround is to return the translation result to the client, which then calls the mutation directly.

## Planning

When planning a feature or change, always produce a table of functions/components to **add**, **change**, or **remove** — with file paths, locations, and a short description of each change. This scopes the work upfront and prevents drift during implementation.

## Code style

- TypeScript strict mode
- Tailwind CSS for styling (v4, no tailwind.config — uses CSS-based config)
- Convex functions use `"use node"` directive for Node.js runtime (needed for npm packages in actions)
- Provider implementations are lazy-imported inside the action to avoid bundling issues
