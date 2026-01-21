/**
 * Search Form Component
 *
 * Input form for job search criteria including query, location, and remote toggle.
 * Supports AI-powered search that uses natural language and multiple queries.
 */

import { useState, type FormEvent } from 'react';
import { Search, MapPin, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { JobSearchCriteria } from '../../types/jobSearch';

interface SearchFormProps {
  onSearch: (criteria: JobSearchCriteria) => void;
  isSearching: boolean;
  disabled?: boolean;
}

export function SearchForm({ onSearch, isSearching, disabled }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [useAISearch, setUseAISearch] = useState(true); // Default to AI-powered search

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching || disabled) return;

    // If remoteOnly is true, append "remote" to query for better results
    const searchQuery = remoteOnly ? `${query.trim()} remote` : query.trim();

    onSearch({
      query: searchQuery,
      location: location.trim() || undefined,
      remoteOnly,
      useAISearch,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Query input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Job title, skills, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            disabled={isSearching || disabled}
          />
        </div>

        {/* Location input */}
        <div className="sm:w-48 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="City, State"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10"
            disabled={isSearching || disabled}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Remote toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={remoteOnly}
              onClick={() => setRemoteOnly(!remoteOnly)}
              disabled={isSearching || disabled}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${remoteOnly ? 'bg-primary' : 'bg-surface-raised'}
                ${isSearching || disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${remoteOnly ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            <span className="text-sm text-foreground-muted">
              Remote only
            </span>
          </label>

          {/* AI Search toggle */}
          <label className="flex items-center gap-2 cursor-pointer" title="AI generates multiple queries and ranks results by match">
            <button
              type="button"
              role="switch"
              aria-checked={useAISearch}
              onClick={() => setUseAISearch(!useAISearch)}
              disabled={isSearching || disabled}
              className={`
                relative w-11 h-6 rounded-full transition-colors
                ${useAISearch ? 'bg-purple-500' : 'bg-surface-raised'}
                ${isSearching || disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <span
                className={`
                  absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${useAISearch ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            <span className="flex items-center gap-1.5 text-sm text-foreground-muted">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              AI Search
            </span>
          </label>
        </div>

        {/* Search button */}
        <Button
          type="submit"
          disabled={!query.trim() || isSearching || disabled}
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              {useAISearch ? (
                <Sparkles className="w-4 h-4 mr-2" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Search
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
