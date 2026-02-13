"use node";

import type { TranslationResult, Segment } from "@/lib/types";

// Google Translate (free endpoint) — no kuroshiro, uses Google's own
// transliteration for romaji and simple character-class segmentation
export async function translateWithGoogle(
  englishText: string
): Promise<TranslationResult> {
  console.log("[google] step 1: building URL");
  const encodedText = encodeURIComponent(englishText);
  const fetchUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&dt=rm&q=${encodedText}`;

  console.log("[google] step 2: fetching");
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Google Translate failed: ${response.status}`);
  }

  console.log("[google] step 3: parsing response");
  const data = await response.json();
  const japaneseText: string = data[0]
    .map((item: any[]) => item[0])
    .filter(Boolean)
    .join("");
  console.log("[google] step 4: got text:", japaneseText);

  let romaji = "";
  for (const item of data[0]) {
    if (item[3]) {
      romaji += item[3];
    }
  }
  if (!romaji) {
    romaji = japaneseText;
  }
  console.log("[google] step 5: got romaji:", romaji);

  const segments = segmentJapanese(japaneseText);
  console.log("[google] step 6: segmented:", segments.length, "segments");

  const fullHiragana = japaneseText;

  console.log("[google] step 7: returning result");
  return { segments, fullHiragana, romaji, provider: "google" };
}

// Unicode ranges for Japanese character classes
const KANJI_RANGE = /[\u4E00-\u9FFF\u3400-\u4DBF]/;
const HIRAGANA_RANGE = /[\u3040-\u309F]/;
const KATAKANA_RANGE = /[\u30A0-\u30FF]/;
const JP_PUNCT = /[。、！？「」『』（）・～…：；\u3000]/;

function segmentJapanese(text: string): Segment[] {
  const segments: Segment[] = [];
  let current = "";
  let currentType: "kanji" | "kana" | "punctuation" | null = null;

  function flush() {
    if (current && currentType) {
      if (currentType === "kanji") {
        // Without a morphological analyzer, we can't provide readings.
        // Mark as kana so the UI just displays the text without ruby.
        segments.push({ type: "kana", text: current });
      } else {
        segments.push({ type: currentType, text: current });
      }
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
      // Spaces, ASCII, etc — treat as kana
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
