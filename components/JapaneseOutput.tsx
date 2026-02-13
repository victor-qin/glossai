"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { FuriganaText } from "./FuriganaText";
import { ViewToggle } from "./ViewToggle";
import type { ViewMode } from "@/lib/types";

interface JapaneseOutputProps {
  translationId: Id<"translations"> | null;
}

export function JapaneseOutput({ translationId }: JapaneseOutputProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("furigana");

  const translation = useQuery(
    api.translations.get,
    translationId ? { id: translationId } : "skip"
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-muted">Japanese</h2>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>
      <div className="flex-1 rounded-lg border border-border bg-surface p-4 overflow-auto">
        {!translation ? (
          <p className="text-text-muted text-sm">
            Translation will appear here...
          </p>
        ) : (
          <div>
            {viewMode === "furigana" && (
              <FuriganaText segments={translation.japanese_segments} />
            )}
            {viewMode === "hiragana" && (
              <p className="japanese-text">{translation.full_hiragana}</p>
            )}
            {viewMode === "romaji" && (
              <p className="text-lg leading-relaxed">{translation.romaji}</p>
            )}
            <p className="mt-4 text-xs text-text-muted">
              via {translation.provider_used}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
