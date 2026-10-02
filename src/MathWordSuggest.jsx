import { memo, useCallback, useEffect, useRef, useState } from "react";
import useGlossary from "./api/useGlossary";

/**
 * Suggestion bar shown under the question text box.
 * Memoized and fed only the current word, so typing never re-renders the form.
 */
const SuggestionBar = memo(function SuggestionBar({ items, activeIndex, onPick }) {
  if (items.length === 0) return null;
  return (
    <div
      role="listbox"
      aria-label="Maths word suggestions"
      className="flex flex-wrap gap-1 border border-t-0 border-gray-300 bg-gray-50 px-2 py-1.5 rounded-b"
    >
      {items.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          // mousedown (not click) so the textarea keeps focus and caret
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(t);
          }}
          className={
            "rounded px-2 py-0.5 text-sm " +
            (i === activeIndex
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-800 border border-gray-300 hover:bg-blue-50")
          }
        >
          {t.word}
        </button>
      ))}
    </div>
  );
});

// The partial English word just before the caret, e.g. "Find the area of a tri|".
function currentWord(text, caret) {
  const m = /[A-Za-z]+$/.exec(text.slice(0, caret));
  return m ? { partial: m[0], start: caret - m[0].length } : null;
}

export default function MathWordSuggest({
  value,
  onChange, // (newText: string) => void
  onWordPicked, // optional: (term) => void, e.g. to fetch Tamil for it
  rows = 4,
  placeholder = "Type the question in English",
  className = "",
}) {
  const { suggest } = useGlossary();
  const ref = useRef(null);
  const timer = useRef(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [range, setRange] = useState(null); // { start, end } of the partial word

  const refresh = useCallback(
    (text, caret) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const w = currentWord(text, caret);
        if (!w) {
          setItems([]);
          setRange(null);
          return;
        }
        setItems(suggest(w.partial, 8));
        setRange({ start: w.start, end: caret });
        setActive(-1);
      }, 100); // short debounce
    },
    [suggest]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = useCallback(
    (term) => {
      if (!range) return;
      const next = value.slice(0, range.start) + term.word + " " + value.slice(range.end);
      const caret = range.start + term.word.length + 1;
      onChange(next);
      setItems([]);
      setRange(null);
      onWordPicked?.(term);
      requestAnimationFrame(() => {
        ref.current?.focus();
        ref.current?.setSelectionRange(caret, caret);
      });
    },
    [range, value, onChange, onWordPicked]
  );

  const handleChange = (e) => {
    onChange(e.target.value);
    refresh(e.target.value, e.target.selectionStart);
  };

  const handleKeyDown = (e) => {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Tab") {
      e.preventDefault();
      pick(items[active >= 0 ? active : 0]);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // Enter only accepts after you arrowed to a word
      pick(items[active]);
    } else if (e.key === "Escape") {
      setItems([]);
    }
  };

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => refresh(value, e.target.selectionStart)}
        onBlur={() => setItems([])}
        className={
          "w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 " +
          className
        }
      />
      <SuggestionBar items={items} activeIndex={active} onPick={pick} />
    </div>
  );
}
