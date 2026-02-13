# GlossAI

English-to-Japanese translation app with furigana annotations. Built with Next.js 15, Convex, and Tailwind CSS v4.

## Prerequisites

- Node.js 18+
- An Anthropic API key (`ANTHROPIC_API_KEY`) — used by the Claude translation provider and as a fallback annotator for the Google provider

## Setup

### Option A: Convex Cloud (recommended)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Convex dev**

   ```bash
   npx convex dev
   ```

   On first run this prompts you to create or link a Convex cloud project. Follow the prompts and leave the process running — it watches for schema and function changes and syncs them to the backend.

3. **Set API keys**

   In the [Convex dashboard](https://dashboard.convex.dev/) under your project's environment variables, add:

   | Variable | Required | Description |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Yes | Used by the Claude provider and the Google+Claude annotation fallback |
   | `OPENAI_API_KEY` | No | Only needed if you want the OpenAI translation provider |

   Or from the CLI:

   ```bash
   npx convex env set ANTHROPIC_API_KEY sk-ant-...
   ```

   These are server-side secrets that run inside Convex actions and are never exposed to the browser.

4. **Start the Next.js dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Option B: Self-hosted Convex backend

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the Convex backend container**

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

   This runs the Convex backend on port `3210` with a persistent volume for data.

3. **Create `.env.local`** from the example:

   ```bash
   cp .env.local.example .env.local
   ```

   The defaults point at `http://localhost:3210`. Fill in the `CONVEX_SELF_HOSTED_ADMIN_KEY` printed in the container logs on first start.

4. **Run Convex dev against the local backend**

   ```bash
   npx convex dev
   ```

5. **Set API keys** via the CLI:

   ```bash
   npx convex env set ANTHROPIC_API_KEY sk-ant-...
   ```

6. **Start the Next.js dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Optional: Kuroshiro annotation server

The Google translation provider annotates Japanese text (furigana, romaji) using a fallback chain. The first option in that chain is a local Kuroshiro server:

```bash
npm run kuroshiro
```

This starts an HTTP server on port `9100` that wraps kuroshiro + kuromoji for fast, offline annotation. If it's not running, the Google provider falls back to Ollama or Claude for annotation.

| Variable | Default | Description |
|---|---|---|
| `KUROSHIRO_PORT` | `9100` | Port for the Kuroshiro server process |
| `KUROSHIRO_URL` | `http://host.docker.internal:9100` | URL Convex actions use to reach Kuroshiro |

Set `KUROSHIRO_URL` in your Convex environment if the server is reachable at a different address (e.g. `http://localhost:9100` when not using Docker).

## Running all services

In separate terminals:

```bash
# Terminal 1 — Convex backend (cloud or self-hosted)
npx convex dev

# Terminal 2 — Kuroshiro annotation server (optional)
npm run kuroshiro

# Terminal 3 — Next.js frontend
npm run dev
```

## Environment variables reference

### Next.js (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex backend URL (set automatically by `npx convex dev` for cloud; set manually for self-hosted) |
| `CONVEX_SELF_HOSTED_URL` | Self-hosted backend URL (only for Option B) |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Admin key from self-hosted container logs (only for Option B) |

### Convex server-side (set via dashboard or `npx convex env set`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude translation and annotation |
| `OPENAI_API_KEY` | No | OpenAI API key for GPT-4o translation provider |
| `KUROSHIRO_URL` | No | URL to the Kuroshiro server (default: `http://host.docker.internal:9100`) |
| `OLLAMA_BASE_URL` | No | URL to an Ollama instance (default: `http://host.docker.internal:11434`) |
| `OLLAMA_MODEL` | No | Ollama model for annotation (default: `qwen2.5:7b`) |

## Translation providers

The app tries providers in order until one succeeds:

1. **Google** — Free Google Translate endpoint for EN-to-JA, then annotates via a fallback chain: Kuroshiro (local) -> Ollama (local LLM) -> Claude (API)
2. **Claude** — Full translation + annotation in a single Anthropic API call
3. **OpenAI** — Full translation + annotation via GPT-4o (requires `OPENAI_API_KEY`)

## Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `next dev --turbopack` | Start Next.js dev server with Turbopack |
| `npm run build` | `next build` | Production build |
| `npm run start` | `next start` | Start production server |
| `npm run lint` | `next lint` | Run ESLint |
| `npm run kuroshiro` | `node scripts/kuroshiro-server.js` | Start the Kuroshiro annotation server |

## Project structure

```
app/                  Next.js app router (single page)
  ConvexClientProvider.tsx
  layout.tsx
  page.tsx
  globals.css
components/           React UI components
  EnglishInput.tsx    Text input with translating indicator
  JapaneseOutput.tsx  Translation display (furigana/hiragana/romaji)
  FuriganaText.tsx    Ruby text rendering for kanji + readings
  ViewToggle.tsx      Switch between display modes
  Sidebar.tsx         Translation list with search
  SidebarItem.tsx     Individual sidebar entry
  NotesEditor.tsx     Per-translation notes with auto-save
convex/               Convex backend
  schema.ts           Database schema (translations table)
  translate.ts        Translation action (provider orchestrator)
  translations.ts     Queries and mutations
  providers/          Translation provider implementations
    google.ts         Google Translate + annotation fallback
    claude.ts         Claude direct translation
    openai.ts         OpenAI direct translation
  lib/
    prompts.ts        Shared LLM prompts and JSON schemas
docker/
  docker-compose.yml  Self-hosted Convex backend
hooks/
  useTranslation.ts   Translation state and debounced API calls
  useDebounce.ts      Generic debounce hook
lib/
  types.ts            Shared TypeScript types (Segment, TranslationResult)
scripts/
  kuroshiro-server.js Standalone furigana annotation HTTP server
```
