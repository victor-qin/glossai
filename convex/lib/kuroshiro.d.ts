declare module "@sglkc/kuroshiro" {
  interface ConvertOptions {
    to: "hiragana" | "katakana" | "romaji";
    mode: "normal" | "spaced" | "okurigana" | "furigana";
  }

  class Kuroshiro {
    init(analyzer: any): Promise<void>;
    convert(text: string, options: ConvertOptions): Promise<string>;
  }

  export default Kuroshiro;
}

declare module "@sglkc/kuroshiro-analyzer-kuromoji" {
  class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
  }

  export default KuromojiAnalyzer;
}
