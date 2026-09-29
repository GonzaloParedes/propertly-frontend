"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass, fieldBorderStyle } from "@/components/ui/field-styles";
import { MOCK_ADDRESS_SUGGESTIONS, type AddressSuggestion } from "@/lib/mock-data";

interface AddressAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  error?: string;
  disabled?: boolean;
}

// Combobox mock: simula un proveedor de geocodificación (Google Places /
// Mapbox) filtrando MOCK_ADDRESS_SUGGESTIONS en el cliente. Reemplazar el
// filtro local por una llamada real cuando haya API key sin tocar la UI.
export default function AddressAutocomplete({
  id,
  value,
  onChange,
  onSelectSuggestion,
  error,
  disabled,
}: Readonly<AddressAutocompleteProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const suggestions =
    value.trim().length >= 2
      ? MOCK_ADDRESS_SUGGESTIONS.filter((s) => s.label.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
      : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSuggestion(suggestion: AddressSuggestion) {
    onSelectSuggestion(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showList = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder="Empiece a escribir una dirección…"
        disabled={disabled}
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClass}
        style={fieldBorderStyle(!!error)}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Sugerencias de dirección"
          className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-[10px] border bg-white py-1"
          style={{ borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className="flex cursor-pointer flex-col px-3.5 py-2.5"
              style={{ background: index === activeIndex ? "#F1EFFA" : "transparent" }}
            >
              <span className="font-bold">{suggestion.label}</span>
              <span className="text-[14px]" style={{ color: "var(--text-2)" }}>
                {suggestion.city}, {suggestion.province}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
