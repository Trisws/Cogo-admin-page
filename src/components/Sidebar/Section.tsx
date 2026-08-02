import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ThemeMode } from '../../../lib/types/simulation';

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  themeMode?: ThemeMode;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, icon, count, defaultOpen = true, themeMode, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const isLight = themeMode === 'light';

  return (
    <div className={`border-b ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left cursor-pointer ${
          isLight ? 'hover:bg-zinc-50' : 'hover:bg-zinc-900'
        }`}
      >
        <span className={`flex items-center gap-2 text-sm font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
          {icon}
          {title}
          {typeof count === 'number' && (
            <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {count}
            </span>
          )}
        </span>
        {open ? (
          <ChevronDown className={`w-4 h-4 shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
        ) : (
          <ChevronRight className={`w-4 h-4 shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`} />
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};
