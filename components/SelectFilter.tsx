"use client";

import { useEffect, useRef, useState } from "react";

function summarize(selected: string[], options: string[]) {
  if (options.length > 0 && selected.length === options.length) return "Todos";
  if (selected.length === 0) return "Nenhum";
  if (selected.length === 1) return selected[0];
  return `${selected.length} selecionados`;
}

/**
 * Checkbox dropdown filter — presentational only. `selected` is the list of
 * checked values; an empty list means nothing matches and a full list means no
 * narrowing. State (including defaults, e.g. Sprint opening with everything but
 * Backlog checked) lives in lib/use-filter-options.ts's useMultiFilter.
 */
export function MultiSelectFilter({
  label,
  selected,
  onChange,
  options,
}: {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const allChecked = options.length > 0 && selected.length === options.length;

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }

  return (
    <div ref={ref} className="relative flex min-w-[180px] flex-col gap-1">
      <label className="font-mono text-label-mono uppercase tracking-wider text-outline">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-left text-body-md text-on-surface transition-colors hover:bg-surface-container focus:border-primary focus:outline-none"
      >
        <span className="truncate">{summarize(selected, options)}</span>
        <span className="material-symbols-outlined shrink-0 text-[18px] text-outline">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest py-1 shadow-lg">
          <div className="flex items-center justify-between border-b border-outline-variant px-3 py-2">
            <button
              type="button"
              onClick={() => onChange(allChecked ? [] : [...options])}
              className="text-body-md font-semibold text-primary hover:underline"
            >
              {allChecked ? "Limpar todos" : "Selecionar todos"}
            </button>
            <span className="font-mono text-label-mono text-outline">
              {selected.length}/{options.length}
            </span>
          </div>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-body-md text-on-surface hover:bg-surface-container-high"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 shrink-0 rounded border-outline-variant accent-primary"
              />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 ? (
            <p className="px-3 py-2 text-body-md text-on-surface-variant">Nenhuma opção</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
