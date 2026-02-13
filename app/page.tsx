"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Sidebar } from "@/components/Sidebar";
import { EnglishInput } from "@/components/EnglishInput";
import { JapaneseOutput } from "@/components/JapaneseOutput";
import { NotesEditor } from "@/components/NotesEditor";
import { useTranslation } from "@/hooks/useTranslation";

export default function Home() {
  const [activeTranslationId, setActiveTranslationId] =
    useState<Id<"translations"> | null>(null);

  const { inputText, setInputText, isTranslating, error } =
    useTranslation(activeTranslationId);

  const createEmptyMutation = useMutation(api.translations.createEmpty);
  const lastCreatedRef = useRef(0);

  async function handleNew() {
    // Debounce rapid clicks with a 500ms cooldown
    const now = Date.now();
    if (now - lastCreatedRef.current < 500) return;
    lastCreatedRef.current = now;
    const id = await createEmptyMutation();
    setActiveTranslationId(id);
  }

  function handleSelect(id: Id<"translations">) {
    setActiveTranslationId(id);
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar
          selectedId={activeTranslationId}
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
              onChange={setInputText}
              isTranslating={isTranslating}
              disabled={activeTranslationId === null}
            />
          </div>
          <div className="flex-1">
            <JapaneseOutput translationId={activeTranslationId} />
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
          <NotesEditor translationId={activeTranslationId} />
        </div>
      </div>
    </div>
  );
}
