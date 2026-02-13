"use client";

import { Id } from "@/convex/_generated/dataModel";

interface SidebarItemProps {
  id: Id<"translations">;
  englishText: string;
  isSelected: boolean;
  onSelect: (id: Id<"translations">) => void;
}

export function SidebarItem({
  id,
  englishText,
  isSelected,
  onSelect,
}: SidebarItemProps) {
  return (
    <button
      onClick={() => onSelect(id)}
      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "bg-accent/20 text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text"
      }`}
    >
      <span className={`line-clamp-2 ${!englishText ? "italic text-text-muted" : ""}`}>
        {englishText || "New translation"}
      </span>
    </button>
  );
}
