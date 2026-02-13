"use node";

import Anthropic from "@anthropic-ai/sdk";
import { TRANSLATION_PROMPT, TRANSLATION_JSON_SCHEMA } from "../lib/prompts";
import type { TranslationResult, Segment } from "@/lib/types";

export async function translateWithClaude(
  englishText: string
): Promise<TranslationResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    system: TRANSLATION_PROMPT,
    messages: [
      {
        role: "user",
        content: `Translate to Japanese: "${englishText}"`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from the response (may be wrapped in markdown code blocks)
  let jsonStr = textBlock.text.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  return {
    segments: parsed.segments as Segment[],
    fullHiragana: parsed.fullHiragana,
    romaji: parsed.romaji,
    provider: "claude",
  };
}
