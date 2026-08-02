import React, { useRef, useState } from 'react';
import { ThemeMode, CommandSpec } from '../../../lib/types/simulation';

interface CommandBarProps {
  onRunCommand: (raw: string) => string;
  themeMode?: ThemeMode;
  commands: CommandSpec[];
}

interface ScrollbackEntry {
  cmd: string;
  output: string;
}

const MAX_SCROLLBACK = 8;
const MAX_SUGGESTIONS = 6;

export const CommandBar: React.FC<CommandBarProps> = ({ onRunCommand, themeMode, commands }) => {
  const isLight = themeMode === 'light';
  const [input, setInput] = useState('');
  const [scrollback, setScrollback] = useState<ScrollbackEntry[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only suggest the command keyword itself while the user hasn't typed a space yet
  const firstToken = input.match(/^\S+/)?.[0] ?? '';
  const hasSpace = /\s/.test(input);
  const suggestions =
    firstToken && !hasSpace
      ? commands.filter((c) => c.cmd.startsWith(firstToken.toLowerCase())).slice(0, MAX_SUGGESTIONS)
      : [];
  const showSuggestions = suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0].cmd === firstToken.toLowerCase());
  const clampedHighlight = Math.min(highlightIndex, suggestions.length - 1);

  const applySuggestion = (spec: CommandSpec) => {
    setInput(`${spec.cmd} `);
    setHighlightIndex(0);
    inputRef.current?.focus();
  };

  const submit = () => {
    const raw = input.trim();
    if (!raw) return;

    historyRef.current = [raw, ...historyRef.current].slice(0, 50);
    historyIndexRef.current = -1;

    const result = onRunCommand(raw);

    if (result === '__CLEAR__') {
      setScrollback([]);
    } else {
      setScrollback((prev) => [...prev.slice(-(MAX_SCROLLBACK - 1)), { cmd: raw, output: result }]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setHighlightIndex((i) => (i + delta + suggestions.length) % suggestions.length);
      return;
    }

    if (showSuggestions && e.key === 'Tab') {
      e.preventDefault();
      applySuggestion(suggestions[clampedHighlight]);
      return;
    }

    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'Escape') {
      setHighlightIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = historyRef.current;
      if (hist.length === 0) return;
      const nextIndex = Math.min(historyIndexRef.current + 1, hist.length - 1);
      historyIndexRef.current = nextIndex;
      setInput(hist[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndexRef.current - 1;
      historyIndexRef.current = nextIndex;
      setInput(nextIndex >= 0 ? historyRef.current[nextIndex] : '');
    }
  };

  return (
    <div className={`relative border-t shrink-0 ${isLight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-950'}`}>
      {showSuggestions && (
        <div className={`absolute bottom-full left-0 right-0 mb-1 mx-2 rounded-md border shadow-lg overflow-hidden ${
          isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-700'
        }`}>
          {suggestions.map((spec, i) => (
            <button
              key={spec.cmd}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applySuggestion(spec); }}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`w-full flex items-baseline gap-2 px-2.5 py-1.5 text-left text-xs cursor-pointer ${
                i === clampedHighlight
                  ? isLight ? 'bg-zinc-100' : 'bg-zinc-800'
                  : ''
              }`}
            >
              <span className={`font-mono font-semibold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{spec.usage}</span>
              <span className={`truncate ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{spec.desc}</span>
            </button>
          ))}
        </div>
      )}

      {scrollback.length > 0 && (
        <div className={`max-h-28 overflow-y-auto px-3 py-1.5 text-[10px] leading-relaxed whitespace-pre-wrap font-mono ${
          isLight ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          {scrollback.map((entry, i) => (
            <div key={i}>
              <div className={isLight ? 'text-zinc-900' : 'text-zinc-100'}>$ {entry.cmd}</div>
              <div>{entry.output}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className={`text-xs font-semibold shrink-0 font-mono ${isLight ? 'text-zinc-400' : 'text-zinc-500'}`}>
          &gt;_
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setHighlightIndex(0); }}
          onKeyDown={handleKeyDown}
          placeholder="gõ lệnh, vd: help"
          spellCheck={false}
          autoComplete="off"
          className={`flex-1 min-w-0 bg-transparent text-xs font-mono focus:outline-none ${
            isLight ? 'text-zinc-800 placeholder-zinc-400' : 'text-zinc-100 placeholder-zinc-600'
          }`}
        />
        {showSuggestions && (
          <span className={`text-[10px] shrink-0 ${isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>Tab để chọn</span>
        )}
      </div>
    </div>
  );
};
