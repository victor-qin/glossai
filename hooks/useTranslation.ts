import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "./useDebounce";

export function useTranslation() {
  const [inputText, setInputText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTranslatedId, setLastTranslatedId] =
    useState<Id<"translations"> | null>(null);

  const debouncedText = useDebounce(inputText, 500);
  const translateAction = useAction(api.translate.translate);
  const createMutation = useMutation(api.translations.create);

  useEffect(() => {
    if (!debouncedText.trim()) {
      setError(null);
      return;
    }

    let cancelled = false;

    async function doTranslate() {
      setIsTranslating(true);
      setError(null);
      try {
        // Action returns translation result, we persist it client-side
        const result = await translateAction({ englishText: debouncedText });
        if (cancelled) return;

        const id = await createMutation({
          english_text: debouncedText,
          japanese_segments: result.segments,
          full_hiragana: result.fullHiragana,
          romaji: result.romaji,
          provider_used: result.provider,
        });
        if (!cancelled) {
          setLastTranslatedId(id);
        }
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
  }, [debouncedText, translateAction, createMutation]);

  return { inputText, setInputText, isTranslating, error, lastTranslatedId };
}
