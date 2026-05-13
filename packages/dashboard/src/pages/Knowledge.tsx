import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchKnowledge } from '../api/client';
import { Search, Clock, FileCode, Hash } from 'lucide-react';
import type { SearchResult } from '../api/client';

export function Knowledge() {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hybrid, setHybrid] = useState(true);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['knowledge', searchQuery, hybrid],
    queryFn: () => searchKnowledge({ q: searchQuery, limit: 15, hybrid }),
    enabled: searchQuery.length > 1,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Knowledge Search</h2>
      <p className="text-sm text-gray-500">
        Search across all historical AI sessions to find how problems were solved.
      </p>

      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search reasoning patterns, e.g. "concurrent lock competition" or "OAuth implementation"...'
            className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setHybrid(!hybrid)}
          className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
            hybrid
              ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
              : 'bg-gray-900 border-gray-700 text-gray-500'
          }`}
        >
          Hybrid
        </button>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="text-gray-500 p-8 text-center">Searching knowledge base...</div>
      )}
      {isError && (
        <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">
          Search failed: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {data && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {data.results.length} results in {data.tookMs}ms
          </p>
          <div className="space-y-4">
            {data.results.map((result: SearchResult, i: number) => (
              <ResultCard key={result.chunk.id} result={result} index={i} />
            ))}
          </div>
        </div>
      )}

      {data?.results.length === 0 && searchQuery && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          <Search size={48} className="mx-auto mb-3 text-gray-700" />
          <p>No results found for "{searchQuery}"</p>
          <p className="text-sm mt-1">Try different keywords or a broader query.</p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const date = result.chunk.metadata.timestamp
    ? new Date(result.chunk.metadata.timestamp).toLocaleString()
    : 'Unknown date';

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-600 font-mono w-6 pt-1">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded bg-purple-500/10 text-purple-400">
              {result.chunk.toolName}
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Hash size={12} />
              {result.chunk.sessionId.slice(0, 8)}
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock size={12} />
              {date}
            </span>
            <span className="text-xs text-gray-700">
              Score: {result.score.toFixed(3)}
            </span>
          </div>
          <p className="text-gray-300 text-sm line-clamp-3">{result.chunk.text}</p>
          {result.chunk.metadata.filePath && (
            <p className="mt-1 text-xs text-gray-600 flex items-center gap-1">
              <FileCode size={12} />
              {result.chunk.metadata.filePath}
            </p>
          )}
          {result.contextBefore && (
            <p className="mt-2 text-xs text-gray-600 italic">
              ...{result.contextBefore.slice(-80)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
