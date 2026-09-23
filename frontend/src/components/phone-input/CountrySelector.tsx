import React, { useState, useRef, useEffect } from "react";
import { COUNTRY_DATA } from "./phoneCountries";
import type { CountrySelectorProps } from "./phoneInput.types";
import { searchCountries } from "./phoneInput.utils";

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  selectedCountry,
  onSelectCountry,
  disabled = false,
  className = "",
  id = "country-selector",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredCountries = searchCountries(searchQuery, COUNTRY_DATA);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Country Selector Trigger Button */}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select Country"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] px-3.5 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 hover:bg-slate-50 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shrink-0"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="font-medium text-slate-700 max-w-[90px] sm:max-w-[110px] truncate">
          {selectedCountry.name}
        </span>
        <span className="font-mono text-slate-500 font-bold">
          {selectedCountry.dialCode}
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 z-50 mt-1.5 w-72 max-h-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95"
        >
          {/* Live Search Input */}
          <div className="p-1 pb-2 border-b border-slate-100">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country name, code, or dial code..."
                className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] py-2 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
              <svg
                className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Country List */}
          <div className="mt-1 max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredCountries.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching country found.
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = country.iso === selectedCountry.iso;
                return (
                  <button
                    key={country.iso}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectCountry(country);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="text-base leading-none">
                        {country.flag}
                      </span>
                      <span className="truncate font-medium">
                        {country.name}
                      </span>
                    </div>

                    <span className="font-mono text-xs font-semibold text-slate-500 shrink-0">
                      {country.dialCode}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
