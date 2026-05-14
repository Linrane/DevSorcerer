import { Command, Option } from 'clipanion';
import { loadConfig } from '../../config/loader.js';
import { initDb } from '../../storage/db.js';
import { createEmbedder } from '../../knowledge/embedder.js';
import { createVectorStore } from '../../knowledge/vectorstore.js';
import { KnowledgeSearcher } from '../../knowledge/searcher.js';
import { sanitizeSearchQuery, validateProjectId, validateLimit } from '../../shared/validation.js';

export class KnowledgeSearchCommand extends Command {
  static override paths = [['knowledge', 'search']];
  static override usage = Command.Usage({
    description: 'Semantic search across all historical AI sessions',
    examples: [
      ['Search for patterns', 'devsorcerer knowledge search "concurrent lock competition"'],
      ['Limit results', 'devsorcerer knowledge search "OAuth flow" --limit 5'],
      ['With context', 'devsorcerer knowledge search "error handling" --context-lines 3'],
    ],
  });

  query = Option.String({ required: true, name: 'query' });
  project = Option.String('--project', { description: 'Filter by project' });
  limit = Option.String('--limit', { description: 'Max results (default: 10)' });
  format = Option.String('--format', { description: 'Output: text, json' });
  contextLines = Option.String('--context-lines', { description: 'Context lines' });

  async execute(): Promise<number> {
    const config = loadConfig();
    const db = initDb(config.dbPath);

    try {
      const searchQuery = sanitizeSearchQuery(this.query);
      const limit = this.limit ? validateLimit(this.limit) : 10;
      if (this.project) validateProjectId(this.project);

      this.context.stdout.write(`Searching: "${searchQuery}"...\n`);
      const embedder = await createEmbedder(config.embeddingModel);
      const vectorStore = createVectorStore('memory');
      await vectorStore.connect(config.lancedbPath);
      await vectorStore.createTable('knowledge');
      const searcher = new KnowledgeSearcher(embedder, vectorStore);

      const results = await searcher.search(searchQuery, {
        limit,
        projectId: this.project,
        includeContext: true,
        hybrid: true,
      });

      if (this.format === 'json') {
        this.context.stdout.write(JSON.stringify(results, null, 2) + '\n');
      } else {
        this.context.stdout.write(searcher.formatResults(results) + '\n');
      }
    } catch (err) {
      this.context.stderr.write(
        `Search failed: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      return 1;
    } finally {
      db.close();
    }

    return 0;
  }
}
