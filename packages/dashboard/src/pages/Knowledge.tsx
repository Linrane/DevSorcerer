import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchKnowledge } from '../api/client';
import { Search, Clock, FileCode, Hash, Sparkles } from 'lucide-react';
import type { SearchResult } from '../api/client';
import { useT } from '../i18n';

export function Knowledge() {
  const { t } = useT();
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
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Sparkles size={22} /> {t('Knowledge Search')}
      </h2>
      <p className="text-sm text-gray-500">
        {t('Semantic search across all historical AI sessions. Find how similar problems were solved, what patterns worked, and reuse past solutions.')}
      </p>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Search patterns, e.g. "concurrent lock" or "OAuth implementation"...')}
            className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            {t('Search')}
          </button>
          <button
            type="button"
            onClick={() => setHybrid(!hybrid)}
            className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors border flex-shrink-0 ${
              hybrid
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-600'
            }`}
            title={t('Hybrid = vector similarity + keyword matching')}
          >
            {t('Hybrid')}
          </button>
        </div>
      </form>

      {/* Results */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {t('Search failed:')} {error instanceof Error ? error.message : t('Unknown error')}
        </div>
      )}

      {data && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {data.results.length} {data.results.length !== 1 ? t('results') : t('result')} in {data.tookMs}ms
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
          <p>{t('No results found for')} "{searchQuery}"</p>
          <p className="text-sm mt-1">{t('Try different keywords, a broader query, or toggle Hybrid search off.')}</p>
        </div>
      )}

      {!searchQuery && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center text-gray-500">
          <Sparkles size={48} className="mx-auto mb-3 text-gray-700" />
          <p>{t('Enter a query to search across all AI sessions')}</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {t("The knowledge engine uses AI embeddings to find semantically similar solutions, even when keywords don't match exactly.")}
          </p>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, index }: { result: SearchResult; index: number }) {
  const { t } = useT();
  const date = result.chunk.metadata.timestamp
    ? new Date(result.chunk.metadata.timestamp).toLocaleString()
    : t('Unknown date');

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-xs text-gray-600 font-mono w-6 pt-1 flex-shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 text-xs rounded bg-purple-500/10 text-purple-400">
              {result.chunk.toolName || t('unknown')}
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Hash size={12} />
              {result.chunk.sessionId.slice(0, 8)}
            </span>
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock size={12} />
              {date}
            </span>
            <span className="text-xs text-gray-700 font-mono">
              {(result.score * 100).toFixed(1)}% {t('match')}
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
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-400">
                {t('Show context')}
              </summary>
              <p className="mt-1 text-xs text-gray-500 bg-gray-800/50 rounded p-2 italic">
                {result.contextBefore}
                {result.contextAfter && (
                  <> ... <span className="text-yellow-400/50">{result.contextAfter}</span></>
                )}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
