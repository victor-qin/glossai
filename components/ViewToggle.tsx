"use client";

import type { ViewMode } from "@/lib/types";

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; label: string }[] = [
  { value: "furigana", label: "漢字+ふりがな" },
  { value: "hiragana", label: "ひらがな" },
  { value: "romaji", label: "Romaji" },
];

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === m.value
              ? "bg-accent text-white"
              : "text-text-muted hover:text-text hover:bg-surface-hover"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
