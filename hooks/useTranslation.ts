import { useState, useEffect, useRef } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "./useDebounce";

export function useTranslation(
  activeTranslationId: Id<"translations"> | null
) {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [debouncedText, flushDebouncedText] = useDebounce(inputText, 500);
  const translateAction = useAction(api.translate.translate);
  const updateMutation = useMutation(api.translations.update);

  const existingTranslation = useQuery(
    api.translations.get,
    activeTranslationId ? { id: activeTranslationId } : "skip"
  );

  // Track which translation ID we last loaded text from,
  // so we only overwrite inputText when switching translations.
  const loadedIdRef = useRef<Id<"translations"> | null>(null);

  // Immediately reset input + debounced text when switching translations.
  // Without this, the stale debouncedText ("Good morning") survives
  // for 500ms and gets written into the newly-created empty record.
  useEffect(() => {
    setInputText("");
    flushDebouncedText("");
    loadedIdRef.current = null;
  }, [activeTranslationId]);

  // Load existing translation text once the Convex query resolves
  useEffect(() => {
    if (
      existingTranslation &&
      existingTranslation._id === activeTranslationId &&
      loadedIdRef.current !== activeTranslationId
    ) {
      loadedIdRef.current = activeTranslationId;
      setInputText(existingTranslation.english_text);
    }
  }, [activeTranslationId, existingTranslation?._id]);

  // Translate on debounced text change
  useEffect(() => {
    if (!activeTranslationId) return;
    if (!debouncedText.trim()) {
      setError(null);
      return;
    }

    // Wait until the query has loaded for the current ID before translating.
    // Without this, stale debouncedText can leak into a newly created row.
    if (!existingTranslation || existingTranslation._id !== activeTranslationId) {
      return;
    }

    // Skip if text matches what's already stored for this translation
    if (debouncedText === existingTranslation.english_text) {
      return;
    }

    let cancelled = false;

    async function doTranslate() {
      setIsTranslating(true);
      setError(null);
      try {
        const result = await translateAction({ englishText: debouncedText });
        if (cancelled) return;

        await updateMutation({
          id: activeTranslationId!,
          english_text: debouncedText,
          japanese_segments: result.segments,
          full_hiragana: result.fullHiragana,
          romaji: result.romaji,
          provider_used: result.provider,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Translation failed"
          );
        }
      } finally {
        if (!cancelled) {
          setIsTranslating(false);
        }
      }
    }

    doTranslate();
    return () => {
      cancelled = true;
    };
  }, [debouncedText, activeTranslationId, translateAction, updateMutation, existingTranslation]);

  return { inputText, setInputText, isTranslating, error };
}
