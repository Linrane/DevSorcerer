import { getDb } from '../db.js';
import type { ProjectInfo } from '../../shared/types.js';
import { generateId, now } from '../../shared/utils.js';

export function upsertProject(info: ProjectInfo): string {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(info.projectId) as { id: string } | undefined;

  if (existing) {
    db.prepare(
      'UPDATE projects SET remote_url = COALESCE(?, remote_url), updated_at = ? WHERE id = ?',
    ).run(info.remoteUrl ?? null, now(), info.projectId);
    return info.projectId;
  }

  db.prepare(
    `INSERT INTO projects (id, name, root_path, remote_url, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    info.projectId,
    info.rootPath.split(/[/\\]/).pop() || info.rootPath,
    info.rootPath,
    info.remoteUrl ?? null,
    now(),
  );
  return info.projectId;
}

export function getProject(id: string): ProjectInfo | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    projectId: row.id as string,
    rootPath: row.root_path as string,
    remoteUrl: (row.remote_url as string) ?? undefined,
  };
}

export function listProjects(): ProjectInfo[] {
  const db = getDb();
  return (
    db
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
      .all()
      .map((r: unknown) => {
        const row = r as Record<string, unknown>;
        return {
          projectId: row.id as string,
          rootPath: row.root_path as string,
          remoteUrl: (row.remote_url as string) ?? undefined,
        };
      })
  );
}
