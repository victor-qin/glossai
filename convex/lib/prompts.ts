export const TRANSLATION_PROMPT = `You are a Japanese language expert. Translate the given English text to natural, idiomatic Japanese.

Return a JSON object with these fields:
- "segments": An array of objects representing each part of the Japanese sentence. Each object is one of:
  - { "type": "kanji", "text": "<kanji with okurigana>", "reading": "<full hiragana reading>" }
    Keep okurigana attached to kanji stems (e.g. "食べる" as one segment with reading "たべる", NOT "食" + "べる").
    Keep compound kanji together (e.g. "日本語" as one segment with reading "にほんご").
  - { "type": "kana", "text": "<hiragana or katakana>" }
    For particles, pure kana words, etc.
  - { "type": "punctuation", "text": "<punctuation mark>" }
    For Japanese punctuation like 。、！？ etc.
- "fullHiragana": The complete sentence written entirely in hiragana.
- "romaji": The complete sentence in Hepburn romanization.

Important rules:
- Produce natural, idiomatic Japanese that a native speaker would use.
- Every character of the Japanese output must appear in exactly one segment.
- Segments must be in order so concatenating all "text" fields reproduces the full sentence.
- Use standard Hepburn romanization (shi not si, chi not ti, tsu not tu, fu not hu).
- For katakana words (loanwords), use a "kana" segment.
- Spaces between words in romaji should follow natural word boundaries.`;

export const TRANSLATION_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    segments: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["kanji", "kana", "punctuation"],
          },
          text: { type: "string" as const },
          reading: { type: "string" as const },
        },
        required: ["type", "text"],
      },
    },
    fullHiragana: { type: "string" as const },
    romaji: { type: "string" as const },
  },
  required: ["segments", "fullHiragana", "romaji"],
};
