import fs from 'node:fs';
import path from 'node:path';

export interface GitContext {
  rootPath: string;
  branch?: string;
  commitHash?: string;
  remoteUrl?: string;
}

export function detectGitContext(cwd: string): GitContext | null {
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) return null;

  const context: GitContext = { rootPath: gitRoot };

  try {
    const headPath = path.join(gitRoot, '.git', 'HEAD');
    const headContent = fs.readFileSync(headPath, 'utf-8').trim();

    if (headContent.startsWith('ref: ')) {
      context.branch = headContent.slice(5).replace('refs/heads/', '');
    } else {
      context.commitHash = headContent;
    }

    // Try to get remote URL from .git/config
    const configPath = path.join(gitRoot, '.git', 'config');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const urlMatch = configContent.match(/url\s*=\s*(.+)/);
      if (urlMatch?.[1]) {
        context.remoteUrl = urlMatch[1].trim();
      }
    }
  } catch {
    // Best effort — return partial context
  }

  return context;
}

function findGitRoot(startPath: string): string | null {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  while (current !== root) {
    const gitPath = path.join(current, '.git');
    if (fs.existsSync(gitPath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

export function buildProjectId(gitContext: GitContext): string {
  const base = gitContext.remoteUrl || gitContext.rootPath;
  // Simple hash function for project ID stability
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  const name = gitContext.rootPath.split(/[/\\]/).pop() || 'unknown';
  return `${name}-${hashHex}`;
}
