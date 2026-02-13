#!/usr/bin/env node

// Standalone kuroshiro+kuromoji HTTP server.
// Runs outside Convex's bundler so dictionary loading works natively.
//
// Usage:
//   node scripts/kuroshiro-server.js
//   # or: npm run kuroshiro
//
// Endpoints:
//   POST /annotate  { "text": "Japanese text" }
//   GET  /health

import http from "node:http";
import Kuroshiro from "@sglkc/kuroshiro";
import KuromojiAnalyzer from "@sglkc/kuroshiro-analyzer-kuromoji";

const PORT = parseInt(process.env.KUROSHIRO_PORT || "9100", 10);

// --- Initialize kuroshiro (cached for all requests) ---
let kuroshiro = null;
let initError = null;

async function init() {
  try {
    console.log("Loading kuromoji dictionaries...");
    const start = Date.now();
    kuroshiro = new Kuroshiro();
    await kuroshiro.init(new KuromojiAnalyzer());
    console.log(`Kuroshiro ready in ${Date.now() - start}ms`);
  } catch (err) {
    initError = err;
    console.error("Failed to initialize kuroshiro:", err);
  }
}

// --- Furigana HTML parser (same logic as in google.ts) ---
function parseFuriganaHtml(html) {
  const segments = [];
  const parts = html.split(/(<ruby>[\s\S]*?<\/ruby>)/);

  for (const part of parts) {
    if (!part) continue;

    const rubyMatch = part.match(
      /<ruby>([\s\S]*?)<rp>\(<\/rp><rt>([\s\S]*?)<\/rt><rp>\)<\/rp><\/ruby>/
    );
    if (rubyMatch) {
      const [, base, reading] = rubyMatch;
      if (base === reading) {
        segments.push({ type: "kana", text: base });
      } else {
        segments.push({ type: "kanji", text: base, reading });
      }
    } else {
      segments.push(...classifyTextRun(part));
    }
  }

  return segments;
}

const JP_PUNCT = /[。、！？「」『』（）・～…：；\u3000]/;

function classifyTextRun(text) {
  const segments = [];
  let current = "";
  let currentType = null;

  function flush() {
    if (current && currentType) {
      segments.push({ type: currentType, text: current });
      current = "";
      currentType = null;
    }
  }

  for (const char of text) {
    const charType = JP_PUNCT.test(char) ? "punctuation" : "kana";
    if (charType !== currentType) {
      flush();
      currentType = charType;
    }
    current += char;
  }
  flush();
  return segments;
}

// --- Annotate endpoint ---
async function annotate(text) {
  if (!kuroshiro) throw new Error("Kuroshiro not initialized");
  if (initError) throw initError;

  const fullHiragana = await kuroshiro.convert(text, {
    to: "hiragana",
    mode: "normal",
  });
  const romaji = await kuroshiro.convert(text, {
    to: "romaji",
    mode: "spaced",
  });
  const furiganaHtml = await kuroshiro.convert(text, {
    to: "hiragana",
    mode: "furigana",
  });
  const segments = parseFuriganaHtml(furiganaHtml);

  return { segments, fullHiragana, romaji };
}

// --- HTTP server ---
const server = http.createServer(async (req, res) => {
  // CORS headers (in case needed)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: kuroshiro ? "ready" : "initializing" }));
    return;
  }

  if (req.method === "POST" && req.url === "/annotate") {
    try {
      const body = await readBody(req);
      const { text } = JSON.parse(body);
      if (!text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'text' field" }));
        return;
      }

      const result = await annotate(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

// --- Start ---
await init();
server.listen(PORT, () => {
  console.log(`Kuroshiro server listening on http://localhost:${PORT}`);
  console.log(`  POST /annotate  { "text": "日本語テキスト" }`);
  console.log(`  GET  /health`);
});
