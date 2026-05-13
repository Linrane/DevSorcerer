import type { Session } from '../shared/types.js';
import { createSession, endSession, getSession } from '../storage/repositories/sessions.js';
import { upsertProject } from '../storage/repositories/projects.js';
import { getGitContext, getProjectId } from './enricher.js';
import type { AgentInfo } from '../shared/types.js';

export class SessionManager {
  private activeSession: Session | null = null;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async startSession(agentInfo?: AgentInfo): Promise<Session> {
    if (this.activeSession) {
      await this.endSession('terminated');
    }

    const projectId = getProjectId(this.projectRoot);
    const git = getGitContext(this.projectRoot);

    // Ensure project exists in DB
    upsertProject({
      projectId,
      rootPath: this.projectRoot,
      remoteUrl: git?.remoteUrl,
      branch: git?.branch,
    });

    const session = createSession(
      projectId,
      agentInfo?.name ?? 'unknown-agent',
      agentInfo?.version,
      git?.branch,
      git?.commitHash,
    );

    this.activeSession = session;
    return session;
  }

  async endSession(status: 'completed' | 'error' | 'terminated' = 'completed'): Promise<void> {
    if (!this.activeSession) return;
    endSession(this.activeSession.id, status);
    this.activeSession = null;
  }

  getActiveSession(): Session | null {
    return this.activeSession;
  }

  getSessionId(): string {
    if (!this.activeSession) {
      throw new Error('No active session. Call startSession() first.');
    }
    return this.activeSession.id;
  }

  getProjectId(): string {
    return getProjectId(this.projectRoot);
  }
}
