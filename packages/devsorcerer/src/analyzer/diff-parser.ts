import type { CapturedEvent } from '../shared/types.js';

export interface DiffExtract {
  filePath: string;
  originalContent: string | null;
  newContent: string;
}

export class DiffParser {
  extractDiffs(events: CapturedEvent[]): DiffExtract[] {
    const diffs: DiffExtract[] = [];

    for (const event of events) {
      const extracted = this.extractFromEvent(event);
      if (extracted) {
        diffs.push(extracted);
      }
    }

    return diffs;
  }

  private extractFromEvent(event: CapturedEvent): DiffExtract | null {
    const toolName = event.toolName;
    if (!toolName) return null;

    switch (toolName) {
      case 'write_to_file':
      case 'write_file':
      case 'Write':
        return this.extractWriteFile(event);

      case 'replace_in_file':
      case 'edit_file':
      case 'Edit':
        return this.extractEditFile(event);

      case 'apply_patch':
        return this.extractPatch(event);

      default:
        return null;
    }
  }

  private extractWriteFile(event: CapturedEvent): DiffExtract | null {
    const params = event.params as Record<string, unknown> | undefined;
    const args = (params?.arguments || params) as Record<string, unknown> | undefined;

    const filePath =
      (args?.filePath as string) ||
      (args?.path as string) ||
      (args?.file as string);
    const content =
      (args?.content as string) || (args?.text as string) || (args?.code as string);

    if (!filePath) return null;

    return {
      filePath,
      originalContent: null, // New file
      newContent: content || '',
    };
  }

  private extractEditFile(event: CapturedEvent): DiffExtract | null {
    const params = event.params as Record<string, unknown> | undefined;
    const args = (params?.arguments || params) as Record<string, unknown> | undefined;

    const filePath =
      (args?.filePath as string) || (args?.path as string);

    if (!filePath) return null;

    // The old_string and new_string pattern (used by Claude Code)
    const oldStr = (args?.old_str || args?.oldString || args?.old) as string | undefined;
    const newStr = (args?.new_str || args?.newString || args?.new) as string | undefined;

    if (oldStr !== undefined && newStr !== undefined) {
      return {
        filePath,
        originalContent: oldStr,
        newContent: newStr,
      };
    }

    return null;
  }

  private extractPatch(event: CapturedEvent): DiffExtract | null {
    const params = event.params as Record<string, unknown> | undefined;
    const args = (params?.arguments || params) as Record<string, unknown> | undefined;

    const filePath =
      (args?.filePath as string) || (args?.path as string);

    if (!filePath) return null;

    const patch = args?.patch as string;
    if (patch) {
      return {
        filePath,
        originalContent: null,
        newContent: patch,
      };
    }

    return null;
  }
}
