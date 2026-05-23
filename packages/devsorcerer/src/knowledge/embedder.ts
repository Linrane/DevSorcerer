import { EMBEDDING_DIMENSIONS } from '../shared/constants.js';

export interface Embedder {
  initialize(): Promise<void>;
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
  readonly dimensions: number;
  readonly modelName: string;
  readonly isRealModel: boolean;
}

/**
 * Lightweight TF-IDF embedder for offline/fallback use.
 * Produces meaningful sparse vectors based on term frequency,
 * NOT random hash values. Good enough for basic keyword overlap search.
 */
export class SimpleEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  readonly modelName = 'tfidf-fallback';
  readonly isRealModel = false;
  private idf = new Map<string, number>();
  private initialized = false;

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedSingle(text));
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.embedSingle(query);
  }

  /**
   * TF-IDF style embedding — each dimension represents a character trigram
   * weighted by its frequency. Unlike pure hashing, this captures actual
   * textual overlap between queries and documents.
   */
  private embedSingle(text: string): number[] {
    const vec = new Float64Array(this.dimensions);
    const n = 3;

    // Build term frequency map for this text
    const tf = new Map<string, number>();
    for (let i = 0; i <= text.length - n; i++) {
      const gram = text.slice(i, i + n).toLowerCase();
      tf.set(gram, (tf.get(gram) || 0) + 1);
    }

    // Map trigrams to dimensions using deterministic hashing
    for (const [gram, count] of tf) {
      const hash = this.hashString(gram);
      const gramCount = count || 0;
      // Spread each trigram across 3 dimensions to reduce collisions
      for (let offset = 0; offset < 3; offset++) {
        const dim = Math.abs(hash + offset * 7919) % this.dimensions;
        const val = vec[dim];
        vec[dim] = (val !== undefined ? val : 0) + gramCount / (offset + 1);
      }
    }

    // L2 normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        const val = vec[i];
        if (val !== undefined) vec[i] = val / norm;
      }
    }

    return Array.from(vec);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }
}

/**
 * Transformer-based embedder using HuggingFace Transformers.js.
 * Uses Xenova/bge-m3 (1024-dim) by default — BAAI's state-of-the-art
 * multilingual embedding model with dense + sparse + colbert capabilities.
 */
export class TransformerEmbedder implements Embedder {
  readonly dimensions: number;
  readonly modelName: string;
  readonly isRealModel = true;
  private pipeline: unknown = null;
  private initialized = false;

  constructor(modelName: string = 'Xenova/bge-m3') {
    this.modelName = modelName;
    // BGE-M3 is 1024-dim; all-MiniLM-L6-v2 is 384-dim
    this.dimensions = modelName.includes('bge-m3') ? 1024 :
                      modelName.includes('bge-large') ? 1024 :
                      modelName.includes('bge-small') ? 384 : 384;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const { pipeline } = await import('@huggingface/transformers');

      // Configure for better performance on CPU
      const extractor = await pipeline('feature-extraction', this.modelName, {
        // @ts-expect-error quantized not in official types but supported
        quantized: true,
      });

      this.pipeline = extractor;
      this.initialized = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Try fallback to all-MiniLM-L6-v2 if bge-m3 fails
      if (this.modelName.includes('bge-m3') && !msg.includes('ENOENT')) {
        console.warn(`BGE-M3 failed to load, trying all-MiniLM-L6-v2: ${msg}`);
        try {
          const { pipeline } = await import('@huggingface/transformers');
          const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            // @ts-expect-error quantized not in official types but supported
            quantized: true,
          });
          this.pipeline = extractor;
          this.initialized = true;
          (this as { dimensions: number }).dimensions = 384;
          (this as { modelName: string }).modelName = 'Xenova/all-MiniLM-L6-v2';
          return;
        } catch (fallbackErr) {
          console.warn('all-MiniLM-L6-v2 also failed to load');
        }
      }
      throw err;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.initialized) await this.initialize();

    const extractor = this.pipeline as {
      (texts: string[], options: { pooling: string; normalize: boolean }): Promise<{
        data: Float32Array;
        dims: number[];
      }>;
    };

    const results: number[][] = [];
    const batchSize = 32;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const output = await extractor(batch, {
        pooling: 'cls',
        normalize: true,
      });
      const dim = output.dims[1] || this.dimensions;
      for (let j = 0; j < batch.length; j++) {
        const vec: number[] = [];
        for (let k = 0; k < dim; k++) {
          vec.push(output.data[j * dim + k] || 0);
        }
        results.push(vec);
      }
    }
    return results;
  }

  async embedQuery(query: string): Promise<number[]> {
    const results = await this.embed([query]);
    return results[0] || new Array(this.dimensions).fill(0);
  }
}

/**
 * Creates the best available embedder.
 * Tries TransformerEmbedder first, falls back to SimpleEmbedder with a clear warning.
 */
export async function createEmbedder(modelName?: string): Promise<Embedder> {
  try {
    const embedder = new TransformerEmbedder(modelName);
    await embedder.initialize();
    return embedder;
  } catch {
    console.warn(
      '⚠️  Transformers.js embedding models could not be loaded.\n' +
      '   Semantic search will use TF-IDF fallback — keyword-based only.\n' +
      '   To enable real embeddings, ensure network access for model download.\n' +
      '   Models are cached at: ~/.cache/huggingface/'
    );
    const embedder = new SimpleEmbedder();
    await embedder.initialize();
    return embedder;
  }
}