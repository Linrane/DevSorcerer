import type { FastifyInstance } from 'fastify';
import { createEmbedder } from '../../knowledge/embedder.js';
import { createVectorStore } from '../../knowledge/vectorstore.js';
import { KnowledgeSearcher } from '../../knowledge/searcher.js';
import { loadConfig } from '../../config/loader.js';

let searcher: KnowledgeSearcher | null = null;

async function getSearcher(): Promise<KnowledgeSearcher> {
  if (searcher) return searcher;
  const embedder = await createEmbedder();
  const vectorStore = createVectorStore('memory');
  const config = loadConfig();
  await vectorStore.connect(config.lancedbPath);
  await vectorStore.createTable('knowledge');
  searcher = new KnowledgeSearcher(embedder, vectorStore);
  return searcher;
}

export async function knowledgeRoutes(app: FastifyInstance): Promise<void> {
  // Semantic search
  app.get('/knowledge/search', async (request, reply) => {
    const query = request.query as {
      q?: string;
      query?: string;
      project_id?: string;
      session_id?: string;
      limit?: string;
      hybrid?: string;
      include_context?: string;
    };

    const searchQuery = query.q || query.query;
    if (!searchQuery || searchQuery.trim().length === 0) {
      reply.code(400);
      return { error: 'Missing query parameter "q" or "query"' };
    }
    if (searchQuery.length > 500) {
      reply.code(400);
      return { error: 'Query too long (max 500 characters)' };
    }
    if (query.limit && (parseInt(query.limit, 10) < 1 || parseInt(query.limit, 10) > 500)) {
      reply.code(400);
      return { error: 'Limit must be between 1 and 500' };
    }

    try {
      const s = await getSearcher();
      const results = await s.search(searchQuery, {
        limit: query.limit ? parseInt(query.limit, 10) : 10,
        sessionId: query.session_id,
        projectId: query.project_id,
        hybrid: query.hybrid === 'true',
        includeContext: query.include_context === 'true',
      });
      return results;
    } catch (err) {
      reply.code(500);
      return {
        error: 'Search failed',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  });
}
