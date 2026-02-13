"use node";

import OpenAI from "openai";
import { TRANSLATION_PROMPT, TRANSLATION_JSON_SCHEMA } from "../lib/prompts";
import type { TranslationResult, Segment } from "@/lib/types";

export async function translateWithOpenAI(
  englishText: string
): Promise<TranslationResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: TRANSLATION_PROMPT },
      {
        role: "user",
        content: `Translate to Japanese: "${englishText}"`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "translation",
        strict: true,
        schema: {
          ...TRANSLATION_JSON_SCHEMA,
          additionalProperties: false,
          properties: {
            ...TRANSLATION_JSON_SCHEMA.properties,
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["kanji", "kana", "punctuation"],
                  },
                  text: { type: "string" },
                  reading: { type: "string" },
                },
                required: ["type", "text", "reading"],
                additionalProperties: false,
              },
            },
          },
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  // Normalize: OpenAI strict mode requires "reading" on all segments,
  // but kana/punctuation don't need it. Strip empty readings.
  const segments: Segment[] = parsed.segments.map((seg: any) => {
    if (seg.type === "kana") return { type: "kana", text: seg.text };
    if (seg.type === "punctuation")
      return { type: "punctuation", text: seg.text };
    return { type: "kanji", text: seg.text, reading: seg.reading };
  });

  return {
    segments,
    fullHiragana: parsed.fullHiragana,
    romaji: parsed.romaji,
    provider: "openai",
  };
}
