'use client';

import { useState, useEffect, useRef } from 'react';
import { api, SearchResult } from '@/lib/api';

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as globalThis.Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search(query, 20);
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const kindColors: Record<string, string> = {
    function: 'bg-blue-500/20 text-blue-400',
    method: 'bg-purple-500/20 text-purple-400',
    type: 'bg-green-500/20 text-green-400',
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search functions, types..."
          className="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg
                     text-white placeholder-gray-500 focus:outline-none focus:border-blue-500
                     transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="spinner w-4 h-4" />
          </div>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700
                        rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors
                         border-b border-gray-700 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{result.name}</span>
                <span className={`px-2 py-0.5 text-xs rounded ${kindColors[result.kind] || 'bg-gray-600 text-gray-300'}`}>
                  {result.kind}
                </span>
              </div>
              {result.package && (
                <p className="text-sm text-gray-400 mt-1">{result.package}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
