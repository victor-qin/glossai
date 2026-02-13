"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { EnglishInput } from "@/components/EnglishInput";
import { JapaneseOutput } from "@/components/JapaneseOutput";
import { NotesEditor } from "@/components/NotesEditor";
import { useTranslation } from "@/hooks/useTranslation";

export default function Home() {
  const { inputText, setInputText, isTranslating, error, lastTranslatedId } =
    useTranslation();
  const [selectedId, setSelectedId] = useState<Id<"translations"> | null>(
    null
  );

  function handleNew() {
    setSelectedId(null);
    setInputText("");
  }

  function handleSelect(id: Id<"translations">) {
    setSelectedId(id);
  }

  // When a new translation comes in from typing, auto-select it
  const displayId =
    selectedId !== null ? selectedId : lastTranslatedId;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar
          selectedId={displayId}
          onSelect={handleSelect}
          onNew={handleNew}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
        {/* Top row: English input + Japanese output */}
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-1">
            <EnglishInput
              value={inputText}
              onChange={(val) => {
                setInputText(val);
                // Clear sidebar selection when typing new text
                setSelectedId(null);
              }}
              isTranslating={isTranslating}
            />
          </div>
          <div className="flex-1">
            <JapaneseOutput translationId={displayId} />
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Bottom row: Notes */}
        <div className="h-40 flex-shrink-0">
          <NotesEditor translationId={displayId} />
        </div>
      </div>
    </div>
  );
}
