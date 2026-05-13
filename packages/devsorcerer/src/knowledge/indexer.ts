import { getDb } from '../storage/db.js';
import { getEventsForAnalysis } from '../storage/repositories/events.js';
import { DocumentChunker } from './chunker.js';
import { type Embedder } from './embedder.js';
import { type VectorStore, createVectorStore } from './vectorstore.js';
import { loadConfig } from '../config/loader.js';

export class KnowledgeIndexer {
  private chunker: DocumentChunker;
  private embedder: Embedder;
  private vectorStore: VectorStore;

  constructor(embedder: Embedder, vectorStore?: VectorStore) {
    this.chunker = new DocumentChunker();
    this.embedder = embedder;
    this.vectorStore = vectorStore || createVectorStore('memory');
  }

  async initialize(): Promise<void> {
    const config = loadConfig();
    await this.vectorStore.connect(config.lancedbPath);
    await this.vectorStore.createTable('knowledge');
  }

  async indexSession(sessionId: string, branch?: string): Promise<number> {
    const events = getEventsForAnalysis(sessionId);
    if (events.length === 0) return 0;

    const chunks = this.chunker.chunkEvents(events, branch);
    if (chunks.length === 0) return 0;

    // Batch embed
    const texts = chunks.map((c) => c.text);
    const vectors = await this.embedder.embed(texts);

    // Store vectors and chunk metadata
    await this.vectorStore.addVectors(vectors, chunks);

    // Also store chunk references in SQLite
    const db = getDb();
    const insertStmt = db.prepare(
      `INSERT OR IGNORE INTO knowledge_chunks (id, session_id, tool_name, chunk_text, chunk_hash, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const tx = db.transaction(() => {
      for (const chunk of chunks) {
        insertStmt.run(
          chunk.id,
          chunk.sessionId,
          chunk.toolName,
          chunk.text,
          chunk.chunkHash,
          JSON.stringify(chunk.metadata),
        );
      }
    });
    tx();

    return chunks.length;
  }

  async deindexSession(sessionId: string): Promise<void> {
    await this.vectorStore.deleteBySession(sessionId);

    const db = getDb();
    db.prepare('DELETE FROM knowledge_chunks WHERE session_id = ?').run(
      sessionId,
    );
  }

  async close(): Promise<void> {
    await this.vectorStore.close();
  }
}
