"use node";

import type { TranslationResult, Segment } from "@/lib/types";

// ---------------------------------------------------------------------------
// Google Translate (free endpoint) + annotation fallback chain
// ---------------------------------------------------------------------------
// Flow: English → Google Translate → Japanese text → [kuroshiro | Ollama | Claude] → TranslationResult
// ---------------------------------------------------------------------------

export async function translateWithGoogle(
  englishText: string
): Promise<TranslationResult> {
  // --- Step 1: Fetch translation from Google Translate ---
  const encodedText = encodeURIComponent(englishText);
  const fetchUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&dt=rm&q=${encodedText}`;

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Google Translate failed: ${response.status}`);
  }

  const data = await response.json();
  const japaneseText: string = data[0]
    .map((item: any[]) => item[0])
    .filter(Boolean)
    .join("");

  if (!japaneseText) {
    throw new Error("Google Translate returned empty text");
  }

  // --- Step 2: Annotate the Japanese text with furigana ---
  const annotation = await annotateJapanese(japaneseText);

  return {
    segments: annotation.segments,
    fullHiragana: annotation.fullHiragana,
    romaji: annotation.romaji,
    provider: annotation.provider,
  };
}

// ---------------------------------------------------------------------------
// Annotation result shape (same fields as TranslationResult)
// ---------------------------------------------------------------------------
interface AnnotationResult {
  segments: Segment[];
  fullHiragana: string;
  romaji: string;
  provider: string; // e.g. "google+kuroshiro"
}

// ---------------------------------------------------------------------------
// Main annotation dispatcher — tries annotators in order
// ---------------------------------------------------------------------------
async function annotateJapanese(text: string): Promise<AnnotationResult> {
  const annotators: Array<{
    name: string;
    fn: (text: string) => Promise<AnnotationResult>;
  }> = [
    { name: "kuroshiro", fn: annotateWithKuroshiro },
    { name: "ollama", fn: annotateWithOllama },
    { name: "claude", fn: annotateWithClaude },
  ];

  for (const annotator of annotators) {
    try {
      const result = await annotator.fn(text);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`Annotator ${annotator.name} failed: ${msg}`);
    }
  }

  // All annotators failed — return plain text fallback (no furigana)
  return {
    segments: plainTextSegments(text),
    fullHiragana: text,
    romaji: text,
    provider: "google",
  };
}

// ---------------------------------------------------------------------------
// 1. Kuroshiro annotator (local HTTP microservice)
// ---------------------------------------------------------------------------
// Calls the standalone kuroshiro server (scripts/kuroshiro-server.js)
// which runs kuromoji natively outside Convex's bundler sandbox.
// Start it with: npm run kuroshiro
async function annotateWithKuroshiro(text: string): Promise<AnnotationResult> {
  const baseUrl =
    process.env.KUROSHIRO_URL || "http://host.docker.internal:9100";

  const response = await fetch(`${baseUrl}/annotate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Kuroshiro server error ${response.status}: ${body}`);
  }

  const result = await response.json();
  return {
    segments: result.segments as Segment[],
    fullHiragana: result.fullHiragana,
    romaji: result.romaji,
    provider: "google+kuroshiro",
  };
}

// ---------------------------------------------------------------------------
// 2. Ollama annotator (local LLM)
// ---------------------------------------------------------------------------
async function annotateWithOllama(text: string): Promise<AnnotationResult> {
  const { ANNOTATION_PROMPT } = await import("../lib/prompts");
  const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434";

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: ANNOTATION_PROMPT },
        { role: "user", content: `Annotate this Japanese text: "${text}"` },
      ],
      temperature: 0,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }

  const data = await response.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonFromLlmResponse(content);

  return {
    segments: parsed.segments as Segment[],
    fullHiragana: parsed.fullHiragana,
    romaji: parsed.romaji,
    provider: "google+ollama",
  };
}

// ---------------------------------------------------------------------------
// 3. Claude annotator (Anthropic API)
// ---------------------------------------------------------------------------
async function annotateWithClaude(text: string): Promise<AnnotationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const { ANNOTATION_PROMPT } = await import("../lib/prompts");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: ANNOTATION_PROMPT,
    messages: [
      { role: "user", content: `Annotate this Japanese text: "${text}"` },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const parsed = parseJsonFromLlmResponse(textBlock.text);

  return {
    segments: parsed.segments as Segment[],
    fullHiragana: parsed.fullHiragana,
    romaji: parsed.romaji,
    provider: "google+claude",
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Extract JSON from an LLM response that may be wrapped in markdown fences. */
function parseJsonFromLlmResponse(
  text: string
): { segments: unknown[]; fullHiragana: string; romaji: string } {
  let jsonStr = text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }
  return JSON.parse(jsonStr);
}

/** Unicode ranges for Japanese character classes. */
const KANJI_RANGE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
const HIRAGANA_RANGE = /[\u3040-\u309F]/;
const KATAKANA_RANGE = /[\u30A0-\u30FF]/;
const JP_PUNCT = /[。、！？「」『』（）・～…：；\u3000]/;

/** Simple fallback: split text into plain segments without furigana. */
function plainTextSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let current = "";
  let currentType: "kanji" | "kana" | "punctuation" | null = null;

  function flush() {
    if (current && currentType) {
      // Without readings, kanji are displayed as kana (no ruby annotation)
      const type = currentType === "kanji" ? "kana" : currentType;
      segments.push({ type, text: current });
      current = "";
      currentType = null;
    }
  }

  for (const char of text) {
    let charType: "kanji" | "kana" | "punctuation";

    if (KANJI_RANGE.test(char)) {
      charType = "kanji";
    } else if (HIRAGANA_RANGE.test(char) || KATAKANA_RANGE.test(char)) {
      charType = "kana";
    } else if (JP_PUNCT.test(char)) {
      charType = "punctuation";
    } else {
      charType = "kana";
    }

    if (charType !== currentType) {
      flush();
      currentType = charType;
    }
    current += char;
  }
  flush();
  return segments;
}
