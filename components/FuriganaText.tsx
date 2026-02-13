"use client";

import type { Segment } from "@/lib/types";

interface FuriganaTextProps {
  segments: Segment[];
}

export function FuriganaText({ segments }: FuriganaTextProps) {
  return (
    <span className="japanese-text">
      {segments.map((segment, i) => {
        switch (segment.type) {
          case "kanji":
            return (
              <ruby key={i}>
                {segment.text}
                <rp>(</rp>
                <rt>{segment.reading}</rt>
                <rp>)</rp>
              </ruby>
            );
          case "kana":
            return <span key={i}>{segment.text}</span>;
          case "punctuation":
            return <span key={i}>{segment.text}</span>;
        }
      })}
    </span>
  );
}
