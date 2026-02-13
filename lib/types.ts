export interface KanjiSegment {
  type: "kanji";
  text: string;
  reading: string;
}

export interface KanaSegment {
  type: "kana";
  text: string;
}

export interface PunctuationSegment {
  type: "punctuation";
  text: string;
}

export type Segment = KanjiSegment | KanaSegment | PunctuationSegment;

export interface TranslationResult {
  segments: Segment[];
  fullHiragana: string;
  romaji: string;
  provider: string;
}

export type ViewMode = "furigana" | "hiragana" | "romaji";
