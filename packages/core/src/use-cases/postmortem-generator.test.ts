/**
 * Tests for Postmortem and STAR Story Generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSTARStory,
  generateKnowledgeCard,
  generatePostmortemSummary,
} from './postmortem-generator.js';
import { createInMemoryDiagnosticSessionRepo } from '../ports/diagnostic-session-repo.js';
import { createDiagnosticSession, transitionStage, addEvidence } from '../entities/diagnostic-coach.js';
import type { DiagnosticSession, DiagnosticEvidence } from '../entities/diagnostic-coach.js';

describe('Postmortem Generator', () => {
  let sessionRepo: ReturnType<typeof createInMemoryDiagnosticSessionRepo>;
  let idGenerator: { generate: () => string };
  let idCounter: number;

  // Helper to create a complete debugging session
  function createCompleteSession(): DiagnosticSession {
    let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', false);

    // Add triage
    session = addEvidence(session, 'triage', {
      defectCategory: 'functional',
      severity: 'high',
      priority: 'urgent',
      observations: 'Binary search returns wrong index for edge cases',
      timestamp: new Date(),
    });

    // Progress to REPRODUCE
    session = transitionStage(session, 'REPRODUCE');
    session = addEvidence(session, 'reproduction', {
      steps: ['Run test with [1,2,3]', 'Search for value 1', 'Observe wrong index returned'],
      isDeterministic: true,
      reproCommand: 'npm test -- binary-search.test.ts',
      timestamp: new Date(),
    });

    // Progress to LOCALIZE
    session = transitionStage(session, 'LOCALIZE');
    session = addEvidence(session, 'localization', {
      suspectedFiles: ['src/algorithms/binary-search.ts'],
      suspectedFunctions: ['binarySearch'],
      stackTrace: 'Error at binary-search.ts:15',
      timestamp: new Date(),
    });

    // Progress to HYPOTHESIZE
    session = transitionStage(session, 'HYPOTHESIZE');
    session = addEvidence(session, 'hypotheses', [
      {
        id: 'h1',
        hypothesis: 'Off-by-one error in mid calculation',
        testMethod: 'Log mid values during search',
        status: 'rejected',
        evidence: 'Mid calculation is correct',
        timestamp: new Date(),
      },
      {
        id: 'h2',
        hypothesis: 'Wrong comparison operator (< vs <=)',
        testMethod: 'Check boundary conditions',
        status: 'confirmed',
        evidence: 'Found < instead of <= for upper bound',
        timestamp: new Date(),
      },
    ]);

    // Progress to FIX
    session = transitionStage(session, 'FIX');
    session = addEvidence(session, 'fixAttempts', [
      {
        id: 'f1',
        hypothesisId: 'h2',
        approach: 'Changed comparison from < to <=',
        filesModified: ['src/algorithms/binary-search.ts'],
        testsPassed: true,
        timestamp: new Date(),
      },
    ]);

    // Progress to VERIFY
    session = transitionStage(session, 'VERIFY');
    session = addEvidence(session, 'verification', {
      visibleTestsPassed: true,
      hiddenTestsPassed: true,
      edgeCasesChecked: ['empty array', 'single element', 'element at start', 'element at end'],
      regressionTestsPassed: true,
      timestamp: new Date(),
    });

    // Progress to POSTMORTEM
    session = transitionStage(session, 'POSTMORTEM');

    return session;
  }

  beforeEach(() => {
    sessionRepo = createInMemoryDiagnosticSessionRepo();
    idCounter = 0;
    idGenerator = { generate: () => `gen-${++idCounter}` };
  });

  describe('generateSTARStory', () => {
    it('should generate STAR story from complete session', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateSTARStory(
        { sessionId: session.id },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();

      const story = result.story!;
      expect(story.situation).toContain('high severity');
      expect(story.situation).toContain('functional');
      expect(story.task).toContain('urgent priority');
      expect(story.action).toContain('hypothesis');
      expect(story.result).toContain('passed');
    });

    it('should include technical details', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateSTARStory(
        { sessionId: session.id },
        { sessionRepo }
      );

      const details = result.story!.technicalDetails;
      expect(details.defectCategory).toBe('functional');
      expect(details.severity).toBe('high');
      expect(details.hypothesesTested).toBe(2);
      expect(details.fixAttemptsCount).toBe(1);
      expect(details.stagesVisited).toContain('TRIAGE');
      expect(details.stagesVisited).toContain('POSTMORTEM');
    });

    it('should include user reflection in result', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateSTARStory(
        {
          sessionId: session.id,
          userReflection: 'I learned to always check boundary conditions first.',
        },
        { sessionRepo }
      );

      expect(result.story!.result).toContain('boundary conditions');
    });

    it('should reject if not in POSTMORTEM stage', async () => {
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', false);
      await sessionRepo.save(session);

      const result = await generateSTARStory(
        { sessionId: session.id },
        { sessionRepo }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('POSTMORTEM');
    });

    it('should handle session not found', async () => {
      const result = await generateSTARStory(
        { sessionId: 'nonexistent' },
        { sessionRepo }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    it('should handle intermittent bugs', async () => {
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', false);
      session = addEvidence(session, 'triage', {
        defectCategory: 'heisenbug',
        severity: 'medium',
        priority: 'normal',
        observations: 'Flaky test',
        timestamp: new Date(),
      });
      session = transitionStage(session, 'REPRODUCE');
      session = addEvidence(session, 'reproduction', {
        steps: ['Run test 10 times'],
        isDeterministic: false,
        successRate: 0.3,
        timestamp: new Date(),
      });
      session = transitionStage(session, 'LOCALIZE');
      session = transitionStage(session, 'HYPOTHESIZE');
      session = transitionStage(session, 'FIX');
      session = transitionStage(session, 'VERIFY');
      session = transitionStage(session, 'POSTMORTEM');
      await sessionRepo.save(session);

      const result = await generateSTARStory(
        { sessionId: session.id },
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.story!.situation).toContain('intermittent');
      expect(result.story!.situation).toContain('30%');
    });
  });

  describe('generateKnowledgeCard', () => {
    it('should generate knowledge card from session', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateKnowledgeCard(
        { sessionId: session.id },
        { sessionRepo, idGenerator }
      );

      expect(result.success).toBe(true);
      expect(result.card).toBeDefined();

      const card = result.card!;
      expect(card.title).toContain('Functional');
      expect(card.pattern).toContain('comparison');
      expect(card.symptoms.length).toBeGreaterThan(0);
      expect(card.commonCauses).toContain('Wrong comparison operator (< vs <=)');
      expect(card.debuggingStrategy).toContain('Form and test hypotheses systematically');
    });

    it('should include default prevention strategies by category', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateKnowledgeCard(
        { sessionId: session.id },
        { sessionRepo, idGenerator }
      );

      expect(result.card!.prevention).toContain('Add unit tests for edge cases');
    });

    it('should use user-provided prevention strategies', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateKnowledgeCard(
        {
          sessionId: session.id,
          userInsights: {
            prevention: ['Always use property-based testing for search algorithms'],
            relatedPatterns: ['binary-search-overflow', 'boundary-conditions'],
          },
        },
        { sessionRepo, idGenerator }
      );

      expect(result.card!.prevention).toContain('Always use property-based testing for search algorithms');
      expect(result.card!.relatedPatterns).toContain('binary-search-overflow');
    });

    it('should reject without triage evidence', async () => {
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', false);
      await sessionRepo.save(session);

      const result = await generateKnowledgeCard(
        { sessionId: session.id },
        { sessionRepo, idGenerator }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('triage');
    });

    it('should include rejected hypotheses as ruled out causes', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generateKnowledgeCard(
        { sessionId: session.id },
        { sessionRepo, idGenerator }
      );

      const causes = result.card!.commonCauses;
      expect(causes.some(c => c.includes('NOT:'))).toBe(true);
    });
  });

  describe('generatePostmortemSummary', () => {
    it('should generate comprehensive summary', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();

      const summary = result.summary!;
      expect(summary.sessionId).toBe(session.id);
      expect(summary.rootCause).toContain('comparison');
      expect(summary.timeline.length).toBeGreaterThan(0);
    });

    it('should identify what went well', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      const wellItems = result.summary!.whatWentWell;
      expect(wellItems).toContain('Fixed on first attempt');
      expect(wellItems).toContain('Thorough edge case verification');
    });

    it('should identify areas for improvement', async () => {
      // Create session with multiple failed fix attempts
      let session = createDiagnosticSession('s1', 'a1', 't1', 'u1', false);
      session = addEvidence(session, 'triage', {
        defectCategory: 'functional',
        severity: 'high',
        priority: 'urgent',
        observations: 'Bug',
        timestamp: new Date(),
      });
      session = transitionStage(session, 'REPRODUCE');
      session = addEvidence(session, 'reproduction', {
        steps: ['test'],
        isDeterministic: false, // Intermittent - not ideal
        timestamp: new Date(),
      });
      session = transitionStage(session, 'LOCALIZE');
      session = transitionStage(session, 'HYPOTHESIZE');
      session = addEvidence(session, 'hypotheses', [
        { id: 'h1', hypothesis: 'H1', testMethod: 'T1', status: 'rejected', timestamp: new Date() },
        { id: 'h2', hypothesis: 'H2', testMethod: 'T2', status: 'rejected', timestamp: new Date() },
        { id: 'h3', hypothesis: 'H3', testMethod: 'T3', status: 'rejected', timestamp: new Date() },
        { id: 'h4', hypothesis: 'H4', testMethod: 'T4', status: 'confirmed', timestamp: new Date() },
      ]);
      session = transitionStage(session, 'FIX');
      session = addEvidence(session, 'fixAttempts', [
        { id: 'f1', hypothesisId: 'h4', approach: 'Fix 1', filesModified: ['a.ts'], testsPassed: false, timestamp: new Date() },
        { id: 'f2', hypothesisId: 'h4', approach: 'Fix 2', filesModified: ['a.ts'], testsPassed: false, timestamp: new Date() },
        { id: 'f3', hypothesisId: 'h4', approach: 'Fix 3', filesModified: ['a.ts'], testsPassed: true, timestamp: new Date() },
      ]);
      session = transitionStage(session, 'VERIFY');
      session = addEvidence(session, 'verification', {
        visibleTestsPassed: true,
        edgeCasesChecked: [],
        regressionTestsPassed: true,
        timestamp: new Date(),
      });
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      const improveItems = result.summary!.whatCouldImprove;
      expect(improveItems.some(i => i.includes('deterministic reproduction'))).toBe(true);
      expect(improveItems.some(i => i.includes('hypotheses were rejected'))).toBe(true);
      expect(improveItems.some(i => i.includes('Multiple fix attempts'))).toBe(true);
      expect(improveItems.some(i => i.includes('edge case'))).toBe(true);
    });

    it('should build timeline from stage history', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      const timeline = result.summary!.timeline;
      expect(timeline[0].stage).toBe('TRIAGE');
      expect(timeline[timeline.length - 1].stage).toBe('POSTMORTEM');
    });

    it('should generate action items', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      const actionItems = result.summary!.actionItems;
      expect(actionItems).toContain('Add regression test for this specific scenario');
      expect(actionItems.some(i => i.includes('Document the fix approach'))).toBe(true);
    });

    it('should extract lessons learned', async () => {
      const session = createCompleteSession();
      await sessionRepo.save(session);

      const result = await generatePostmortemSummary(
        session.id,
        { sessionRepo }
      );

      const lessons = result.summary!.lessonsLearned;
      expect(lessons.some(l => l.includes('Root cause pattern'))).toBe(true);
      expect(lessons.some(l => l.includes('functional'))).toBe(true);
      expect(lessons.some(l => l.includes('Ruled out'))).toBe(true);
    });
  });
});
