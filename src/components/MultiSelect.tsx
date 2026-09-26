"use client";

import { useEffect, useRef, useState } from "react";

export default function MultiSelect({
  label,
  options,
  optionLabels,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  optionLabels?: Record<string, string>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const summary =
    selected.length === 0
      ? "Усі"
      : selected.length === 1
        ? optionLabels?.[selected[0]] ?? selected[0]
        : selected.map((v) => optionLabels?.[v] ?? v).join(", ");

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 rounded-md border border-line bg-ink px-3 py-2 text-left text-sm text-paper outline-none focus:border-accent"
      >
        <span className="truncate">{summary}</span>
        <span className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 max-h-64 w-56 overflow-y-auto scrollbar-thin rounded-md border border-line bg-surface-2 p-1 shadow-2xl">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded px-2 py-1.5 text-left text-xs uppercase tracking-wide text-accent hover:bg-ink"
            >
              Скинути вибір
            </button>
          )}
          {options.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-paper-dim hover:bg-ink"
            >
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() => toggle(o)}
                className="accent-accent"
              />
              <span className="truncate">{optionLabels?.[o] ?? o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
