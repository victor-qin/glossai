"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useDebounce } from "@/hooks/useDebounce";

interface NotesEditorProps {
  translationId: Id<"translations"> | null;
}

export function NotesEditor({ translationId }: NotesEditorProps) {
  const [notes, setNotes] = useState("");
  const [debouncedNotes] = useDebounce(notes, 800);
  const updateNotes = useMutation(api.translations.updateNotes);

  const translation = useQuery(
    api.translations.get,
    translationId ? { id: translationId } : "skip"
  );

  // Sync notes when selected translation changes
  useEffect(() => {
    if (translation) {
      setNotes(translation.notes);
    } else {
      setNotes("");
    }
  }, [translation?._id]);

  // Auto-save notes on debounced change
  useEffect(() => {
    if (!translationId || !translation) return;
    // Only save if notes actually changed from what's in DB
    if (debouncedNotes === translation.notes) return;

    updateNotes({ id: translationId, notes: debouncedNotes });
  }, [debouncedNotes, translationId]);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-2 text-sm font-medium text-text-muted">Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={
          translationId
            ? "Add notes about this translation..."
            : "Select or create a translation to add notes..."
        }
        disabled={!translationId}
        className="flex-1 resize-none rounded-lg border border-border bg-surface p-4 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
