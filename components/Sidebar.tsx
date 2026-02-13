"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { SidebarItem } from "./SidebarItem";
import { useDebounce } from "@/hooks/useDebounce";

interface SidebarProps {
  selectedId: Id<"translations"> | null;
  onSelect: (id: Id<"translations">) => void;
  onNew: () => void;
}

export function Sidebar({ selectedId, onSelect, onNew }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  // Always use the search query — it handles empty strings by listing all
  const translations = useQuery(api.translations.search, {
    query: debouncedSearch,
  });

  return (
    <div className="flex h-full flex-col border-r border-border bg-bg">
      <div className="p-3">
        <button
          onClick={onNew}
          className="mb-3 w-full rounded-lg bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          + New Translation
        </button>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search translations..."
          className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {translations === undefined ? (
          <p className="px-3 py-2 text-xs text-text-muted">Loading...</p>
        ) : translations.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-muted">
            {searchQuery ? "No results found" : "No translations yet"}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {translations.map((t) => (
              <SidebarItem
                key={t._id}
                id={t._id}
                englishText={t.english_text}
                isSelected={selectedId === t._id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
