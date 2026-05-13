import { getDb } from '../storage/db.js';
import type { Embedder } from './embedder.js';
import type { VectorStore, MemoryVectorStore } from './vectorstore.js';
import type {
  SearchResult,
  SearchOptions,
  SearchResponse,
  DocumentChunk,
} from '../shared/types.js';
import { KNOWLEDGE_SEARCH_DEFAULT_LIMIT } from '../shared/constants.js';

export class KnowledgeSearcher {
  private embedder: Embedder;
  private vectorStore: VectorStore;

  constructor(embedder: Embedder, vectorStore: VectorStore) {
    this.embedder = embedder;
    this.vectorStore = vectorStore;
  }

  async search(
    query: string,
    options: SearchOptions = {},
  ): Promise<SearchResponse> {
    const startTime = Date.now();
    const limit = options.limit || KNOWLEDGE_SEARCH_DEFAULT_LIMIT;

    // Generate query embedding
    const queryVector = await this.embedder.embedQuery(query);

    // Vector search
    const vectorResults = await this.vectorStore.search(queryVector, limit, {
      sessionId: options.sessionId,
      projectId: options.projectId,
    });

    // If hybrid mode, also run keyword search and merge
    let results = vectorResults;
    if (options.hybrid) {
      const keywordResults = this.keywordSearch(query, limit, options);
      results = this.mergeResults(vectorResults, keywordResults, limit);
    }

    // Enrich with context
    if (options.includeContext) {
      results = await this.enrichWithContext(results);
    }

    const response: SearchResponse = {
      query,
      results,
      tookMs: Date.now() - startTime,
    };

    return response;
  }

  private keywordSearch(
    query: string,
    limit: number,
    options: SearchOptions,
  ): SearchResult[] {
    const db = getDb();
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

    if (terms.length === 0) return [];

    // Build FTS-like query
    const conditions = terms.map(() => 'LOWER(chunk_text) LIKE ?');
    let sql = `SELECT * FROM knowledge_chunks WHERE ${conditions.join(' AND ')}`;
    const params: unknown[] = terms.map((t) => `%${t}%`);

    if (options.sessionId) {
      sql += ' AND session_id = ?';
      params.push(options.sessionId);
    }

    sql += ' LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Array<{
      id: string;
      session_id: string;
      tool_name: string;
      chunk_text: string;
      chunk_hash: string;
      metadata: string;
    }>;

    return rows.map((r) => ({
      chunk: {
        id: r.id,
        sessionId: r.session_id,
        toolName: r.tool_name,
        text: r.chunk_text,
        chunkHash: r.chunk_hash,
        metadata: JSON.parse(r.metadata || '{}'),
      },
      score: 0.5, // Base score for keyword matches
    }));
  }

  private mergeResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    limit: number,
  ): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    for (const r of vectorResults) {
      merged.set(r.chunk.id, r);
    }

    for (const r of keywordResults) {
      const existing = merged.get(r.chunk.id);
      if (existing) {
        // Boost score for chunks that match both
        existing.score = Math.min(1, existing.score + 0.3);
      } else {
        merged.set(r.chunk.id, r);
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async enrichWithContext(
    results: SearchResult[],
  ): Promise<SearchResult[]> {
    const db = getDb();

    for (const result of results) {
      // Get surrounding chunks from the same session
      const siblings = db
        .prepare(
          `SELECT chunk_text FROM knowledge_chunks
           WHERE session_id = ? AND id != ?
           ORDER BY created_at
           LIMIT 2`,
        )
        .all(result.chunk.sessionId, result.chunk.id) as Array<{
        chunk_text: string;
      }>;

      if (siblings.length > 0) {
        result.contextBefore = siblings[0]?.chunk_text;
        result.contextAfter = siblings[1]?.chunk_text;
      }
    }

    return results;
  }

  formatResults(response: SearchResponse): string {
    const lines: string[] = [
      `Search: "${response.query}" (${response.tookMs}ms)`,
      '='.repeat(60),
      '',
    ];

    if (response.results.length === 0) {
      lines.push('No results found.');
      return lines.join('\n');
    }

    for (let i = 0; i < response.results.length; i++) {
      const r = response.results[i]!;
      lines.push(
        `[${i + 1}] Score: ${r.score.toFixed(3)} | ${r.chunk.toolName} | Session: ${r.chunk.sessionId.slice(0, 8)}`,
      );
      lines.push(`    ${r.chunk.text.slice(0, 150)}...`);
      if (r.chunk.metadata.filePath) {
        lines.push(`    File: ${r.chunk.metadata.filePath}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
