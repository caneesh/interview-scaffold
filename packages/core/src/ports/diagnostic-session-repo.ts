/**
 * Diagnostic Session Repository Port
 *
 * Persistence interface for diagnostic coaching sessions.
 */

import type { DiagnosticSession, DiagnosticEvidence, DiagnosticStage, AIGuidanceEntry } from '../entities/diagnostic-coach.js';

// ============ Port Interface ============

export interface DiagnosticSessionRepo {
  /**
   * Get a session by ID
   */
  getById(id: string): Promise<DiagnosticSession | null>;

  /**
   * Get session by attempt ID (one session per attempt)
   */
  getByAttemptId(attemptId: string): Promise<DiagnosticSession | null>;

  /**
   * Get all sessions for a user
   */
  getByUserId(tenantId: string, userId: string): Promise<readonly DiagnosticSession[]>;

  /**
   * Save a session (create or update)
   */
  save(session: DiagnosticSession): Promise<DiagnosticSession>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<void>;

  /**
   * Update session stage
   */
  updateStage(
    id: string,
    newStage: DiagnosticStage,
    reason?: string
  ): Promise<DiagnosticSession>;

  /**
   * Add evidence to session
   */
  addEvidence<K extends keyof DiagnosticEvidence>(
    id: string,
    key: K,
    value: DiagnosticEvidence[K]
  ): Promise<DiagnosticSession>;

  /**
   * Add AI guidance entry
   */
  addGuidance(
    id: string,
    entry: Omit<AIGuidanceEntry, 'id' | 'timestamp'>
  ): Promise<DiagnosticSession>;
}

// ============ In-Memory Implementation ============

/**
 * In-memory implementation for development/testing
 */
export function createInMemoryDiagnosticSessionRepo(): DiagnosticSessionRepo {
  const sessions = new Map<string, DiagnosticSession>();

  return {
    async getById(id: string): Promise<DiagnosticSession | null> {
      return sessions.get(id) ?? null;
    },

    async getByAttemptId(attemptId: string): Promise<DiagnosticSession | null> {
      for (const session of sessions.values()) {
        if (session.attemptId === attemptId) {
          return session;
        }
      }
      return null;
    },

    async getByUserId(tenantId: string, userId: string): Promise<readonly DiagnosticSession[]> {
      const result: DiagnosticSession[] = [];
      for (const session of sessions.values()) {
        if (session.tenantId === tenantId && session.userId === userId) {
          result.push(session);
        }
      }
      return result;
    },

    async save(session: DiagnosticSession): Promise<DiagnosticSession> {
      const updated = { ...session, updatedAt: new Date() };
      sessions.set(session.id, updated);
      return updated;
    },

    async delete(id: string): Promise<void> {
      sessions.delete(id);
    },

    async updateStage(
      id: string,
      newStage: DiagnosticStage,
      reason?: string
    ): Promise<DiagnosticSession> {
      const session = sessions.get(id);
      if (!session) {
        throw new Error(`Session not found: ${id}`);
      }

      const now = new Date();
      const updated: DiagnosticSession = {
        ...session,
        currentStage: newStage,
        stageHistory: [
          ...session.stageHistory,
          { from: session.currentStage, to: newStage, timestamp: now, reason },
        ],
        updatedAt: now,
      };

      sessions.set(id, updated);
      return updated;
    },

    async addEvidence<K extends keyof DiagnosticEvidence>(
      id: string,
      key: K,
      value: DiagnosticEvidence[K]
    ): Promise<DiagnosticSession> {
      const session = sessions.get(id);
      if (!session) {
        throw new Error(`Session not found: ${id}`);
      }

      const updated: DiagnosticSession = {
        ...session,
        evidence: { ...session.evidence, [key]: value },
        updatedAt: new Date(),
      };

      sessions.set(id, updated);
      return updated;
    },

    async addGuidance(
      id: string,
      entry: Omit<AIGuidanceEntry, 'id' | 'timestamp'>
    ): Promise<DiagnosticSession> {
      const session = sessions.get(id);
      if (!session) {
        throw new Error(`Session not found: ${id}`);
      }

      const newEntry: AIGuidanceEntry = {
        ...entry,
        id: `guidance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
      };

      const updated: DiagnosticSession = {
        ...session,
        aiGuidance: [...session.aiGuidance, newEntry],
        updatedAt: new Date(),
      };

      sessions.set(id, updated);
      return updated;
    },
  };
}
