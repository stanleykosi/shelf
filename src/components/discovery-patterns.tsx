"use client";

import { Search } from "lucide-react";

export function SearchCommand({
  inputRef,
  onChange,
  onClear,
  onSubmit,
  searching = false,
  value,
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (value: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  searching?: boolean;
  value: string;
}) {
  return (
    <form className="search-command" role="search" onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}>
      <Search size={20} aria-hidden="true" />
      <label className="sr-only" htmlFor="catalog-search">Search a company or product</label>
      <input id="catalog-search" maxLength={120} onChange={(event) => onChange(event.target.value)} placeholder="Search a company or product" ref={inputRef} type="search" value={value} />
      {value ? <button onClick={onClear} type="button">Clear</button> : <kbd>⌘ K</kbd>}
      <button className="search-submit" disabled={!value.trim() || searching} type="submit">
        {searching ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
