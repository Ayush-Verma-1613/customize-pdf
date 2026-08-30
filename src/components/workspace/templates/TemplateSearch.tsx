'use client';

import { Search } from 'lucide-react';

export function TemplateSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative px-4 pb-3">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search templates..."
        aria-label="Search templates"
        className="h-[42px] w-full rounded-[10px] border border-forge-line bg-[#FAFAF8] pr-10 pl-3.5 text-[13.5px] text-forge-ink placeholder:text-forge-muted transition-all duration-150 focus:border-forge-accent focus:bg-white focus:ring-[3px] focus:ring-forge-accent/12 focus:outline-none"
      />
      <Search
        size={16}
        className="pointer-events-none absolute top-1/2 right-7 -translate-y-1/2 text-forge-muted"
      />
    </div>
  );
}
