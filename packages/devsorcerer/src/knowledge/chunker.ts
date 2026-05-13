import type { CapturedEvent, DocumentChunk } from '../shared/types.js';
import { generateId } from '../shared/utils.js';
import { MAX_CHUNK_SIZE_CHARS, CHUNK_OVERLAP_CHARS } from '../shared/constants.js';

export class DocumentChunker {
  chunkEvents(
    events: CapturedEvent[],
    branch = 'unknown',
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const event of events) {
      if (!event.toolName) continue;

      const text = this.extractText(event);
      if (!text || text.length < 10) continue;

      const subChunks = this.splitText(text);
      for (const subText of subChunks) {
        const id = generateId();
        const chunkHash = this.hashText(subText);

        chunks.push({
          id,
          sessionId: event.sessionId,
          toolName: event.toolName,
          text: subText,
          chunkHash,
          metadata: {
            timestamp: event.timestamp,
            filePath: this.extractFilePath(event),
            projectBranch: branch,
            tokenCount: event.estimatedTokens,
          },
        });
      }
    }

    return chunks;
  }

  private splitText(text: string): string[] {
    if (text.length <= MAX_CHUNK_SIZE_CHARS) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + MAX_CHUNK_SIZE_CHARS, text.length);
      chunks.push(text.slice(start, end));
      start += MAX_CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;
    }

    return chunks;
  }

  private extractText(event: CapturedEvent): string {
    const parts: string[] = [];

    if (event.method) {
      parts.push(`Tool: ${event.toolName || event.method}`);
    }

    const params = event.params as Record<string, unknown> | undefined;
    const args = params?.arguments || params;

    if (args && typeof args === 'object') {
      // Extract key fields
      if (args.content && typeof args.content === 'string') {
        parts.push(args.content);
      } else if (args.code && typeof args.code === 'string') {
        parts.push(args.code);
      } else if (args.text && typeof args.text === 'string') {
        parts.push(args.text);
      } else if (args.patch && typeof args.patch === 'string') {
        parts.push(args.patch);
      }

      if (args.filePath && typeof args.filePath === 'string') {
        parts.push(`File: ${args.filePath}`);
      }
      if (args.query && typeof args.query === 'string') {
        parts.push(`Query: ${args.query}`);
      }
      if (args.pattern && typeof args.pattern === 'string') {
        parts.push(`Pattern: ${args.pattern}`);
      }
      if (args.command && typeof args.command === 'string') {
        // Don't include full shell commands in knowledge to keep it clean
        parts.push(`Executed: ${args.command.slice(0, 200)}`);
      }
    }

    // Include result if it contains meaningful content
    if (event.result) {
      const result = event.result as Record<string, unknown>;
      const content = result.content;
      if (content && typeof content === 'string' && content.length < 500) {
        parts.push(`Result: ${content}`);
      }
    }

    return parts.join('\n');
  }

  private extractFilePath(event: CapturedEvent): string | undefined {
    const params = event.params as Record<string, unknown> | undefined;
    const args = params?.arguments || params;
    if (args && typeof args === 'object') {
      const fp =
        (args as Record<string, unknown>).filePath ||
        (args as Record<string, unknown>).path ||
        (args as Record<string, unknown>).file;
      return typeof fp === 'string' ? fp : undefined;
    }
    return undefined;
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
