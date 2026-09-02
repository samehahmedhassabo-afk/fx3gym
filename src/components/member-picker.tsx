"use client";

import { useEffect, useRef, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MemberOption = { id: string; label: string; sublabel?: string; isDuplicate?: boolean };

export function MemberPicker({
  name,
  members,
  defaultValue,
  placeholder,
  onSelect,
}: {
  name: string;
  members: MemberOption[];
  defaultValue?: string;
  placeholder?: string;
  onSelect?: (id: string) => void;
}) {
  const initial = members.find((m) => m.id === defaultValue);
  const [query, setQuery] = useState(initial?.label ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();
  const filtered =
    trimmed.length === 0
      ? members.slice(0, 20)
      : members.filter((m) => m.label.toLowerCase().includes(trimmed) || m.sublabel?.toLowerCase().includes(trimmed)).slice(0, 20);

  function choose(m: MemberOption) {
    setSelectedId(m.id);
    setQuery(m.label);
    setOpen(false);
    onSelect?.(m.id);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name={name} value={selectedId} />
      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-[var(--muted)] pointer-events-none" />
        <Input
          value={query}
          placeholder={placeholder}
          className="ps-9"
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedId) {
              setSelectedId("");
              onSelect?.("");
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              className={cn(
                "w-full text-start px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors",
                m.id === selectedId && "bg-[var(--surface-2)]"
              )}
              onClick={() => choose(m)}
            >
              <div className="font-medium flex items-center gap-1.5">
                {m.label}
                {m.isDuplicate && (
                  <span title="يوجد أكتر من عضو بنفس الاسم" className="inline-flex items-center gap-0.5 text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              {m.sublabel && <div className="text-xs text-[var(--muted)]">{m.sublabel}</div>}
            </button>
          ))}
        </div>
      )}
      {open && trimmed.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg px-3 py-2 text-sm text-[var(--muted)]">
          —
        </div>
      )}
    </div>
  );
}
