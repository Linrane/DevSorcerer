import { EMBEDDING_DIMENSIONS } from '../shared/constants.js';

export interface Embedder {
  initialize(): Promise<void>;
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
  readonly dimensions: number;
}

// Fallback embedder that uses a simple TF-IDF-like approach
// for when transformers.js is not available.
// In production, this is replaced by the transformer-based embedder.
export class SimpleEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private vocabulary = new Map<string, number>();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // Initialize with a basic vocabulary
    // In production, this would load the all-MiniLM-L6-v2 model via transformers.js
    this.initialized = true;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedSingle(text));
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.embedSingle(query);
  }

  private embedSingle(text: string): number[] {
    // Simple hash-based embedding for development
    // In production, this is replaced by transformers.js model inference
    const vec = new Array(this.dimensions).fill(0);

    // Character n-gram based hashing to create pseudo-embeddings
    const n = 3;
    for (let i = 0; i < text.length - n + 1; i++) {
      const gram = text.slice(i, i + n).toLowerCase();
      const hash = this.hashString(gram);
      const dim = Math.abs(hash) % this.dimensions;
      vec[dim] += 1;
    }

    // Normalize
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm;
      }
    }

    return vec;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

// Transformers.js based embedder (requires @huggingface/transformers)
// Will be activated when the dependency is installed.
export class TransformerEmbedder implements Embedder {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  private model: unknown = null;
  private tokenizer: unknown = null;
  private modelName: string;
  private initialized = false;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import to avoid hard dependency
      const { pipeline } = await import('@huggingface/transformers');
      const extractor = await pipeline('feature-extraction', this.modelName, {
        progress_callback: undefined,
      });
      this.model = extractor;
      this.initialized = true;
    } catch (err) {
      console.warn(
        `Failed to load transformer model ${this.modelName}:`,
        err instanceof Error ? err.message : String(err),
      );
      console.warn('Falling back to simple embedder.');
      throw err;
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.initialized) await this.initialize();

    const extractor = this.model as {
      (texts: string[], options: { pooling: string; normalize: boolean }): Promise<{
        data: Float32Array;
        dims: number[];
      }>;
    };

    const results: number[][] = [];
    // Process in batches to avoid memory issues
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const output = await extractor(batch, {
        pooling: 'mean',
        normalize: true,
      });
      // Convert Float32Array to number[][]
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

// Factory function that tries transformer first, falls back to simple
export async function createEmbedder(
  modelName?: string,
): Promise<Embedder> {
  try {
    const embedder = new TransformerEmbedder(modelName);
    await embedder.initialize();
    return embedder;
  } catch {
    const embedder = new SimpleEmbedder();
    await embedder.initialize();
    return embedder;
  }
}
