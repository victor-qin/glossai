"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface SidebarItemProps {
  id: Id<"translations">;
  englishText: string;
  isSelected: boolean;
  onSelect: (id: Id<"translations">) => void;
  onDelete: (id: Id<"translations">) => void;
}

export function SidebarItem({
  id,
  englishText,
  isSelected,
  onSelect,
  onDelete,
}: SidebarItemProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      onClick={() => {
        setConfirming(false);
        onSelect(id);
      }}
      className={`group flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm transition-colors ${
        isSelected
          ? "bg-accent/20 text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text"
      }`}
    >
      <span className={`flex-1 line-clamp-2 ${!englishText ? "italic text-text-muted" : ""}`}>
        {englishText || "New translation"}
      </span>
      {confirming ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="ml-2 flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
        >
          Delete?
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(true);
          }}
          className="ml-2 flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          aria-label="Delete translation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
