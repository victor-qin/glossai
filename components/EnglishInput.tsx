"use client";

interface EnglishInputProps {
  value: string;
  onChange: (value: string) => void;
  isTranslating: boolean;
  disabled?: boolean;
}

export function EnglishInput({
  value,
  onChange,
  isTranslating,
  disabled,
}: EnglishInputProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-muted">English</h2>
        {isTranslating && (
          <span className="text-xs text-accent animate-pulse">
            Translating...
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? "Click + New Translation to start..." : "Type English text here..."}
        disabled={disabled}
        className="flex-1 resize-none rounded-lg border border-border bg-surface p-4 text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        autoFocus
      />
    </div>
  );
}
