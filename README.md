# GlossAI

English-to-Japanese translation app with furigana annotations. Built with Next.js 15, Convex (self-hosted), and Tailwind CSS v4.

## Prerequisites

- Node.js 18+
- Docker

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start Convex backends (dev + prod)**

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

   This starts two independent Convex instances with separate data volumes:

   | Environment | Backend        | Dashboard              |
   |-------------|----------------|------------------------|
   | Dev         | localhost:3210 | http://localhost:6791   |
   | Prod        | localhost:3220 | http://localhost:6792   |

3. **Generate a dev admin key**

   ```bash
   docker compose -f docker/docker-compose.yml exec convex-dev ./generate_admin_key.sh
   ```

4. **Create `.env.local`**

   ```bash
   cat > .env.local << EOF
   NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
   CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
   CONVEX_SELF_HOSTED_ADMIN_KEY=<paste-dev-admin-key>
   EOF
   ```

5. **Push schema and start dev servers**

   ```bash
   npx convex dev --once    # One-shot schema push
   ```

   Then in separate terminals:

   ```bash
   # Terminal 1 — Convex watcher
   npx convex dev

   # Terminal 2 — Kuroshiro annotation server
   npm run kuroshiro

   # Terminal 3 — Next.js frontend
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Set API keys** (optional, for Claude/OpenAI providers):

   ```bash
   npx convex env set ANTHROPIC_API_KEY sk-ant-...
   npx convex env set OPENAI_API_KEY sk-...
   ```

### Running production

```bash
# Generate prod admin key (first time only)
docker compose -f docker/docker-compose.yml exec convex-prod ./generate_admin_key.sh

# Create .env.production.local with prod URL + key, then deploy schema:
npx convex deploy --env-file .env.production.local

# Build and serve Next.js (uses .env.production.local → prod Convex on :3220)
npm run build
npm run start         # Serves on :3000
```

To run dev and prod Next.js simultaneously, use `--port` on one: `npm run start -- --port 3001`.

## Kuroshiro annotation server

The Google translation provider annotates Japanese text (furigana, romaji) using a fallback chain. The first option in that chain is a local Kuroshiro server:

```bash
npm run kuroshiro
```

This starts an HTTP server on port `9100` that wraps kuroshiro + kuromoji for fast, offline annotation. If it's not running, the Google provider falls back to Ollama or Claude for annotation.

| Variable | Default | Description |
|---|---|---|
| `KUROSHIRO_PORT` | `9100` | Port for the Kuroshiro server process |
| `KUROSHIRO_URL` | `http://host.docker.internal:9100` | URL Convex actions use to reach Kuroshiro |

## Environment variables reference

### Next.js (`.env.local` / `.env.production.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex backend URL (set automatically by `npx convex dev`) |
| `CONVEX_SELF_HOSTED_URL` | Self-hosted backend URL |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Admin key from `generate_admin_key.sh` |

### Convex server-side (set via dashboard or `npx convex env set`)

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Anthropic API key for Claude translation and annotation |
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
  docker-compose.yml  Dev + prod Convex backends with dashboards
hooks/
  useTranslation.ts   Translation state and debounced API calls
  useDebounce.ts      Generic debounce hook
lib/
  types.ts            Shared TypeScript types (Segment, TranslationResult)
scripts/
  kuroshiro-server.js Standalone furigana annotation HTTP server
```
