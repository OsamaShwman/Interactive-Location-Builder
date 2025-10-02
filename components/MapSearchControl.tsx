import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Place } from '../types';

interface MapSearchControlProps {
  onSearch: (query: string) => void;
  onPlaceSelect: (place: Place) => void;
  isSearching: boolean;
}

const MapSearchControl: React.FC<MapSearchControlProps> = ({ onSearch, onPlaceSelect, isSearching }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsListRef = useRef<HTMLUListElement>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    // This function now only fetches and sets state upon completion.
    // The loading state is managed by the caller.
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`, {
        headers: { 'Accept-Language': language }
      });
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, [language]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);

    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    if (newQuery.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsFetchingSuggestions(false);
        return;
    }
    
    // Show loading indicator immediately for better perceived performance
    setShowSuggestions(true);
    setIsFetchingSuggestions(true);

    debounceTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(newQuery);
    }, 300); // Debounce API call to avoid excessive requests
  };

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (place: Place) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    setQuery(place.display_name);
    setShowSuggestions(false);
    setIsFetchingSuggestions(false);
    onPlaceSelect(place);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (highlightedIndex > -1 && suggestions[highlightedIndex]) {
      handleSuggestionClick(suggestions[highlightedIndex]);
    } else {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      setShowSuggestions(false);
      onSearch(query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const newDownIndex = (highlightedIndex + 1) % suggestions.length;
        setHighlightedIndex(newDownIndex);
        suggestionsListRef.current?.children[newDownIndex]?.scrollIntoView({ block: 'nearest' });
        break;
      case 'ArrowUp':
        e.preventDefault();
        const newUpIndex = (highlightedIndex - 1 + suggestions.length) % suggestions.length;
        setHighlightedIndex(newUpIndex);
        suggestionsListRef.current?.children[newUpIndex]?.scrollIntoView({ block: 'nearest' });
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
      case 'Enter':
        // The form's onSubmit will handle selection.
        break;
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-96 max-w-[calc(100%-2rem)]" ref={containerRef}>
      <form onSubmit={handleSubmit} className="relative" autoComplete="off">
        <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 ltr:pl-4 rtl:pr-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          id="map-search-input"
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => { if(query.length >= 2) setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPlacePlaceholder')}
          className="w-full ltr:pl-11 rtl:pr-11 py-3 text-sm bg-white border border-slate-300 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-800"
          aria-label={t('searchAriaLabel')}
          aria-autocomplete="list"
          aria-controls="suggestions-list"
        />
        {isSearching && (
            <div className="absolute inset-y-0 ltr:right-0 rtl:left-0 ltr:pr-4 rtl:pl-4 flex items-center">
                 <svg className="animate-spin h-5 w-5 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        )}
      </form>
      
      {showSuggestions && (query.length > 1) && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
          <ul id="suggestions-list" role="listbox" aria-label={t('searchAriaLabel')} ref={suggestionsListRef}>
            {isFetchingSuggestions && (
              <li className="px-4 py-3 text-sm text-slate-500 flex items-center">
                <svg className="animate-spin -ml-1 ltr:mr-3 rtl:ml-3 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('searchingButton')}...
              </li>
            )}
            {!isFetchingSuggestions && suggestions.length > 0 && suggestions.map((place, index) => (
              <li key={place.place_id}
                onClick={() => handleSuggestionClick(place)}
                onMouseDown={(e) => e.preventDefault()} // prevent blur from hiding list before click is registered
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-3 text-sm text-slate-700 cursor-pointer hover:bg-sky-50 ${highlightedIndex === index ? 'bg-sky-100' : ''}`}
                role="option"
                aria-selected={highlightedIndex === index}
                id={`suggestion-${index}`}
              >
                {place.display_name}
              </li>
            ))}
             {!isFetchingSuggestions && query.length > 1 && suggestions.length === 0 && (
                 <li className="px-4 py-3 text-sm text-slate-500">{t('alert_searchNotFound')}</li>
             )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MapSearchControl;