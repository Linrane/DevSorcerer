import fs from 'node:fs';
import path from 'node:path';
import type { DocumentChunk, SearchResult, SearchOptions } from '../shared/types.js';

// In-memory vector store for development
// Production uses LanceDB via @lancedb/lancedb
export interface VectorStore {
  connect(dbPath: string): Promise<void>;
  createTable(name: string): Promise<void>;
  addVectors(vectors: number[][], chunks: DocumentChunk[]): Promise<void>;
  search(
    queryVector: number[],
    limit: number,
    filters?: { projectId?: string; sessionId?: string },
  ): Promise<SearchResult[]>;
  deleteBySession(sessionId: string): Promise<void>;
  close(): Promise<void>;
}

interface StoredVector {
  id: string;
  vector: number[];
  chunk: DocumentChunk;
}

export class MemoryVectorStore implements VectorStore {
  private tableName = 'knowledge';
  private vectors: StoredVector[] = [];
  private connected = false;

  async connect(_dbPath: string): Promise<void> {
    this.connected = true;
  }

  async createTable(_name: string): Promise<void> {
    this.tableName = _name;
  }

  async addVectors(
    vectors: number[][],
    chunks: DocumentChunk[],
  ): Promise<void> {
    for (let i = 0; i < vectors.length; i++) {
      this.vectors.push({
        id: chunks[i]!.id,
        vector: vectors[i]!,
        chunk: chunks[i]!,
      });
    }
  }

  async search(
    queryVector: number[],
    limit: number,
    filters?: { projectId?: string; sessionId?: string },
  ): Promise<SearchResult[]> {
    // Cosine similarity search
    const scored = this.vectors
      .filter((v) => {
        if (filters?.sessionId && v.chunk.sessionId !== filters.sessionId)
          return false;
        return true;
      })
      .map((v) => ({
        chunk: v.chunk,
        score: this.cosineSimilarity(queryVector, v.vector),
      }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async deleteBySession(sessionId: string): Promise<void> {
    this.vectors = this.vectors.filter(
      (v) => v.chunk.sessionId !== sessionId,
    );
  }

  async close(): Promise<void> {
    this.vectors = [];
    this.connected = false;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// LanceDB-backed vector store for production
export class LanceDBVectorStore implements VectorStore {
  private db: unknown = null;
  private table: unknown = null;
  private tableName = 'knowledge';
  private connected = false;

  async connect(dbPath: string): Promise<void> {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const { connect } = await import('@lancedb/lancedb');
      this.db = await connect(dbPath);
      this.connected = true;
    } catch (err) {
      console.warn(
        'LanceDB not available, falling back to in-memory store:',
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  async createTable(name: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');

    this.tableName = name;
    const db = this.db as { createTable: (name: string, data: Array<{ vector: number[]; id: string; text: string; session_id: string }>) => Promise<unknown> };

    try {
      this.table = await db.createTable(name, []);
    } catch {
      // Table might already exist
      const db2 = this.db as { openTable: (name: string) => Promise<unknown> };
      this.table = await db2.openTable(name);
    }
  }

  async addVectors(
    vectors: number[][],
    chunks: DocumentChunk[],
  ): Promise<void> {
    if (!this.connected) throw new Error('Not connected');

    const data = chunks.map((chunk, i) => ({
      id: chunk.id,
      vector: vectors[i] || [],
      text: chunk.text,
      session_id: chunk.sessionId,
      tool_name: chunk.toolName,
      metadata: JSON.stringify(chunk.metadata),
    }));

    const table = this.table as { add: (records: Array<Record<string, unknown>>) => Promise<void> };
    await table.add(data);
  }

  async search(
    queryVector: number[],
    limit: number,
    _filters?: { projectId?: string; sessionId?: string },
  ): Promise<SearchResult[]> {
    if (!this.connected) return [];

    const table = this.table as {
      search: (vector: number[]) => {
        limit: (n: number) => {
          toArray: () => Promise<
            Array<{
              id: string;
              text: string;
              session_id: string;
              tool_name: string;
              metadata: string;
              _distance: number;
            }>
          >;
        };
      };
    };

    try {
      const results = await table.search(queryVector).limit(limit).toArray();
      return results.map((r) => ({
        chunk: {
          id: r.id,
          sessionId: r.session_id,
          toolName: r.tool_name,
          text: r.text,
          chunkHash: '',
          metadata: JSON.parse(r.metadata || '{}'),
        },
        score: 1 - r._distance, // Convert distance to similarity
      }));
    } catch {
      return [];
    }
  }

  async deleteBySession(_sessionId: string): Promise<void> {
    if (!this.connected) return;
    const table = this.table as {
      delete: (predicate: string) => Promise<void>;
    };
    try {
      // Sanitize: session IDs are generated UUIDs, but guard against injection
      const safe = _sessionId.replace(/'/g, "''");
      await table.delete(`session_id = '${safe}'`);
    } catch {
      // Best effort
    }
  }

  async close(): Promise<void> {
    this.connected = false;
    this.table = null;
    this.db = null;
  }
}

// Factory
export function createVectorStore(type: 'memory' | 'lancedb' = 'memory'): VectorStore {
  if (type === 'lancedb') return new LanceDBVectorStore();
  return new MemoryVectorStore();
}
