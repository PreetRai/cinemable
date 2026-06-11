import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { searchMultipleMovies } from '../services/omdbApi';

const MIN_AUTOCOMPLETE_CHARS = 3;

const SearchAutocomplete = forwardRef(({ searchTerm, onSelectMovie, type }, ref) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const fetchSuggestions = useCallback(async (term) => {
    const normalizedTerm = typeof term === 'string' ? term.trim() : '';

    if (normalizedTerm.length < MIN_AUTOCOMPLETE_CHARS) {
      setSuggestions([]);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchMultipleMovies(normalizedTerm, {
        type: type && type !== 'all' ? type : undefined,
        page: 1,
      });
      if (result.Response === 'True') {
        setSuggestions(result.Search.slice(0, 8));
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    }
    setIsSearching(false);
  }, [type]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (movie) => {
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onSelectMovie) onSelectMovie(movie);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Expose handleKeyDown to parent via ref
  useImperativeHandle(ref, () => ({ handleKeyDown }));

  const typeBadgeColor = (t) => {
    if (t === 'movie') return 'bg-[#e50914]/20 text-[#ffb3b7] border border-[#e50914]/30';
    if (t === 'series') return 'bg-white/5 text-white/70 border border-white/10';
    return 'bg-white/5 text-white/70 border border-white/10';
  };

  if (!isOpen && !isSearching) return null;

  return (
    <div ref={containerRef} className="absolute left-0 right-0 top-full mt-1 z-50">
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/5 overflow-hidden backdrop-blur-xl">
        {isSearching && suggestions.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
        ) : (
          <ul>
            {suggestions.map((movie, index) => (
              <li
                key={movie.imdbID}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  index === highlightedIndex ? 'bg-white/5' : 'hover:bg-white/5'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(movie);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {/* Poster thumbnail */}
                <div className="flex-shrink-0 w-[30px] h-[45px] overflow-hidden rounded-md bg-[#353535] ring-1 ring-white/5">
                  {movie.Poster && movie.Poster !== 'N/A' ? (
                    <img
                      src={movie.Poster}
                      alt={movie.Title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                      ?
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{movie.Title}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{movie.Year}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${typeBadgeColor(movie.Type)}`}>
                      {movie.Type}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

SearchAutocomplete.displayName = 'SearchAutocomplete';

export default SearchAutocomplete;
