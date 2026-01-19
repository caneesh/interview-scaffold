/**
 * Feature Registry
 *
 * Single source of truth for all features in the interview-scaffold platform.
 * This registry provides:
 * - Complete feature inventory with metadata
 * - Status tracking (implemented, beta, planned)
 * - Route and component mappings
 * - Feature flag dependencies
 * - Category organization
 */

// ============ Types ============

export type FeatureStatus = 'IMPLEMENTED' | 'BETA' | 'PLANNED' | 'DISABLED';

export type FeatureCategory =
  | 'PRACTICE_MODE'
  | 'VALIDATION'
  | 'COACHING'
  | 'LEARNING'
  | 'ANALYTICS'
  | 'NAVIGATION'
  | 'DEBUGGING';

export interface FeatureDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: FeatureCategory;
  readonly status: FeatureStatus;
  readonly route?: string;
  readonly hasRoute: boolean;
  readonly showInPrimaryNav: boolean;
  readonly components: readonly string[];
  readonly apiRoutes: readonly string[];
  readonly dependencies: readonly string[];
  readonly isBeta?: boolean;
  readonly tags: readonly string[];
}

// ============ Feature Definitions ============

export const FEATURES: readonly FeatureDefinition[] = [
  // ============ PRACTICE MODES ============
  {
    id: 'pattern-practice',
    name: 'Pattern Practice',
    description: 'Guided problem solving with pattern discovery, invariant templates, and Socratic coaching. Full implementation practice with adaptive feedback.',
    category: 'PRACTICE_MODE',
    status: 'IMPLEMENTED',
    route: '/practice',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['PracticePage', 'PatternDiscovery', 'InvariantBuilder', 'ThinkingGate'],
    apiRoutes: ['/api/attempts', '/api/problems'],
    dependencies: [],
    tags: ['guided', 'patterns', 'coding'],
  },
  {
    id: 'debug-lab',
    name: 'Debug Lab',
    description: 'Practice debugging real-world scenarios with a 9-category defect taxonomy. Triage defects, analyze observability signals, and fix bugs in mini-repos.',
    category: 'PRACTICE_MODE',
    status: 'IMPLEMENTED',
    route: '/debug-lab',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['DebugLabPage', 'TriageForm', 'MultiFileEditor', 'ObservabilityPanel'],
    apiRoutes: ['/api/debug-lab'],
    dependencies: [],
    tags: ['debugging', 'triage', 'multi-file'],
  },
  {
    id: 'bug-hunt',
    name: 'Bug Hunt',
    description: 'Find bugs in code snippets. Select buggy lines and explain the invariant violation. Quick pattern-focused debugging practice.',
    category: 'PRACTICE_MODE',
    status: 'IMPLEMENTED',
    route: '/bug-hunt',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['BugHuntPage', 'CodeViewer', 'LineSelector'],
    apiRoutes: ['/api/bug-hunt'],
    dependencies: [],
    tags: ['debugging', 'quick', 'line-selection'],
  },
  {
    id: 'daily-challenge',
    name: 'Daily Challenge',
    description: 'A new problem every day to maintain consistent practice habits. Track streaks and compete on leaderboards.',
    category: 'PRACTICE_MODE',
    status: 'IMPLEMENTED',
    route: '/daily',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['DailyPage'],
    apiRoutes: ['/api/daily'],
    dependencies: [],
    tags: ['daily', 'streak', 'consistency'],
  },
  {
    id: 'interview-mode',
    name: 'Interview Mode',
    description: 'Timed practice sessions simulating real interview conditions. Includes adversary challenges after solving.',
    category: 'PRACTICE_MODE',
    status: 'IMPLEMENTED',
    route: '/interview',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['InterviewPage', 'Timer', 'AdversaryChallenge'],
    apiRoutes: ['/api/interview'],
    dependencies: ['constraint-adversary'],
    tags: ['timed', 'interview', 'pressure'],
  },

  // ============ VALIDATION ============
  {
    id: 'thinking-gate',
    name: 'Thinking Gate',
    description: 'Validates pattern selection and invariant understanding before allowing code submission. Prevents premature coding.',
    category: 'VALIDATION',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['ThinkingGate', 'PatternSelector', 'InvariantInput'],
    apiRoutes: ['/api/attempts/[attemptId]/thinking-gate'],
    dependencies: [],
    tags: ['gating', 'validation', 'patterns'],
  },
  {
    id: 'pattern-discovery',
    name: 'Pattern Discovery',
    description: 'MCQ-based flow to help users identify the correct algorithmic pattern. Uses decision tree with heuristic questions.',
    category: 'VALIDATION',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['PatternDiscovery', 'PatternMCQ'],
    apiRoutes: ['/api/attempts/[attemptId]/pattern-discovery'],
    dependencies: [],
    tags: ['patterns', 'mcq', 'discovery'],
  },
  {
    id: 'pattern-challenge',
    name: "Advocate's Trap",
    description: 'When a user selects a weak pattern, generates counterexamples or challenge questions. Socratic validation without saying "wrong".',
    category: 'VALIDATION',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['PatternChallenge', 'CounterexampleDisplay'],
    apiRoutes: ['/api/attempts/[attemptId]/pattern-challenge'],
    dependencies: ['pattern-discovery'],
    tags: ['socratic', 'counterexample', 'challenge'],
  },
  {
    id: 'invariant-builder',
    name: 'Invariant Builder',
    description: 'Fill-in-the-blank templates for constructing loop invariants. Deterministic validation with multiple choice slots.',
    category: 'VALIDATION',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['InvariantBuilder', 'SlotSelector'],
    apiRoutes: [],
    dependencies: [],
    tags: ['invariants', 'fill-blanks', 'templates'],
  },
  {
    id: 'socratic-repair',
    name: 'Socratic Repair',
    description: 'Repair loop that guides users back after validation failures using Socratic questioning. Never gives answers directly.',
    category: 'VALIDATION',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['SocraticRepairDialog'],
    apiRoutes: [],
    dependencies: [],
    tags: ['socratic', 'repair', 'guidance'],
  },

  // ============ COACHING ============
  {
    id: 'ai-diagnostic-coach',
    name: 'AI Diagnostic Coach',
    description: '7-stage debugging coach: TRIAGE → REPRODUCE → LOCALIZE → HYPOTHESIZE → FIX → VERIFY → POSTMORTEM. Guides without solving.',
    category: 'COACHING',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['CoachDrawer', 'DiagnosticStageIndicator'],
    apiRoutes: ['/api/coaching'],
    dependencies: [],
    tags: ['ai', 'coaching', 'debugging'],
  },
  {
    id: 'constraint-adversary',
    name: 'Constraint Adversary',
    description: 'Post-solution challenges that mutate constraints: infinite streams, O(1) memory, unsorted input, etc. Tests adaptability.',
    category: 'COACHING',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['AdversaryChallenge', 'ConstraintCard'],
    apiRoutes: ['/api/attempts/[attemptId]/adversary'],
    dependencies: [],
    tags: ['adversary', 'constraints', 'mutations'],
  },
  {
    id: 'postmortem-generator',
    name: 'Postmortem Generator',
    description: 'Generates STAR stories, knowledge cards, and postmortem summaries from debugging sessions. Interview preparation artifacts.',
    category: 'COACHING',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['PostmortemView', 'STARStoryCard', 'KnowledgeCard'],
    apiRoutes: [],
    dependencies: ['ai-diagnostic-coach'],
    tags: ['postmortem', 'star', 'learning'],
  },

  // ============ LEARNING ============
  {
    id: 'micro-lessons',
    name: 'Micro-Lessons',
    description: 'Short, focused lessons triggered by gating decisions. Pattern-specific content with before/after examples.',
    category: 'LEARNING',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['MicroLessonModal', 'CodeComparison'],
    apiRoutes: [],
    dependencies: [],
    tags: ['lessons', 'examples', 'learning'],
  },
  {
    id: 'trace-visualization',
    name: 'Trace Visualization',
    description: 'Step-by-step visualization of algorithm execution. Shows variable states at each step.',
    category: 'LEARNING',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['TraceVisualization', 'VariableStateTable'],
    apiRoutes: [],
    dependencies: [],
    tags: ['visualization', 'trace', 'execution'],
  },
  {
    id: 'skill-tracking',
    name: 'Skill Tracking',
    description: 'Track mastery across patterns and problem types. Adaptive difficulty based on performance.',
    category: 'LEARNING',
    status: 'IMPLEMENTED',
    route: '/skills',
    hasRoute: true,
    showInPrimaryNav: false,
    components: ['SkillsPage', 'SkillMatrix', 'ProgressChart'],
    apiRoutes: ['/api/skills'],
    dependencies: [],
    tags: ['skills', 'progress', 'mastery'],
  },

  // ============ NAVIGATION ============
  {
    id: 'pattern-explorer',
    name: 'Pattern Explorer',
    description: 'Browse all algorithmic patterns with descriptions, examples, and related problems.',
    category: 'NAVIGATION',
    status: 'IMPLEMENTED',
    route: '/explorer',
    hasRoute: true,
    showInPrimaryNav: true,
    components: ['ExplorerPage', 'PatternCard', 'PatternDetail'],
    apiRoutes: ['/api/patterns'],
    dependencies: [],
    tags: ['patterns', 'browse', 'learn'],
  },
  {
    id: 'feature-explorer',
    name: 'Feature Explorer',
    description: 'Browse all platform features with status, descriptions, and navigation links.',
    category: 'NAVIGATION',
    status: 'IMPLEMENTED',
    route: '/features',
    hasRoute: true,
    showInPrimaryNav: false,
    components: ['FeaturesPage', 'FeatureCard'],
    apiRoutes: [],
    dependencies: [],
    tags: ['features', 'discovery', 'navigation'],
  },

  // ============ ANALYTICS ============
  {
    id: 'cognitive-load-governor',
    name: 'Cognitive Load Governor',
    description: 'Adaptive UI that reduces complexity when users struggle. Simplifies MCQs, shortens hints, collapses future steps.',
    category: 'ANALYTICS',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['CognitiveLoadIndicator'],
    apiRoutes: [],
    dependencies: [],
    tags: ['adaptive', 'ux', 'load'],
  },
  {
    id: 'session-analytics',
    name: 'Session Analytics',
    description: 'Track time spent, attempts, hints used, and patterns across sessions.',
    category: 'ANALYTICS',
    status: 'BETA',
    hasRoute: false,
    showInPrimaryNav: false,
    components: ['SessionSummary', 'AnalyticsChart'],
    apiRoutes: ['/api/analytics'],
    dependencies: [],
    isBeta: true,
    tags: ['analytics', 'metrics', 'tracking'],
  },

  // ============ DEBUGGING (Dev Tools) ============
  {
    id: 'debug-panel',
    name: 'Debug Panel',
    description: 'Developer tools for inspecting state, viewing logs, and testing features.',
    category: 'DEBUGGING',
    status: 'IMPLEMENTED',
    route: '/debug',
    hasRoute: true,
    showInPrimaryNav: false,
    components: ['DebugPage', 'StateInspector'],
    apiRoutes: [],
    dependencies: [],
    tags: ['dev', 'debug', 'tools'],
  },
];

// ============ Query Functions ============

/**
 * Get all features
 */
export function getAllFeatures(): readonly FeatureDefinition[] {
  return FEATURES;
}

/**
 * Get feature by ID
 */
export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURES.find((f) => f.id === id);
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): readonly FeatureDefinition[] {
  return FEATURES.filter((f) => f.category === category);
}

/**
 * Get features by status
 */
export function getFeaturesByStatus(status: FeatureStatus): readonly FeatureDefinition[] {
  return FEATURES.filter((f) => f.status === status);
}

/**
 * Get features with routes (navigable)
 */
export function getRoutableFeatures(): readonly FeatureDefinition[] {
  return FEATURES.filter((f) => f.hasRoute && f.route);
}

/**
 * Get primary navigation features
 */
export function getPrimaryNavFeatures(): readonly FeatureDefinition[] {
  return FEATURES.filter((f) => f.showInPrimaryNav && f.status !== 'DISABLED');
}

/**
 * Check if a feature is active (implemented or beta)
 */
export function isFeatureActive(feature: FeatureDefinition): boolean {
  return feature.status === 'IMPLEMENTED' || feature.status === 'BETA';
}

/**
 * Get features by tag
 */
export function getFeaturesByTag(tag: string): readonly FeatureDefinition[] {
  return FEATURES.filter((f) => f.tags.includes(tag));
}

/**
 * Get feature dependencies (resolved)
 */
export function getFeatureDependencies(featureId: string): readonly FeatureDefinition[] {
  const feature = getFeatureById(featureId);
  if (!feature) return [];

  return feature.dependencies
    .map((depId) => getFeatureById(depId))
    .filter((f): f is FeatureDefinition => f !== undefined);
}

/**
 * Get all categories with feature counts
 */
export function getCategoryCounts(): Record<FeatureCategory, number> {
  const counts: Record<FeatureCategory, number> = {
    PRACTICE_MODE: 0,
    VALIDATION: 0,
    COACHING: 0,
    LEARNING: 0,
    ANALYTICS: 0,
    NAVIGATION: 0,
    DEBUGGING: 0,
  };

  for (const feature of FEATURES) {
    counts[feature.category]++;
  }

  return counts;
}

/**
 * Get all status counts
 */
export function getStatusCounts(): Record<FeatureStatus, number> {
  const counts: Record<FeatureStatus, number> = {
    IMPLEMENTED: 0,
    BETA: 0,
    PLANNED: 0,
    DISABLED: 0,
  };

  for (const feature of FEATURES) {
    counts[feature.status]++;
  }

  return counts;
}

/**
 * Search features by query
 */
export function searchFeatures(query: string): readonly FeatureDefinition[] {
  const lowerQuery = query.toLowerCase();
  return FEATURES.filter(
    (f) =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.description.toLowerCase().includes(lowerQuery) ||
      f.tags.some((t) => t.includes(lowerQuery))
  );
}
