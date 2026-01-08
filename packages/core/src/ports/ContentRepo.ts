/**
 * ContentRepo port - interface for loading problems, drills, and lessons.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  TenantId,
  ProblemId,
  PatternId,
  MicroDrillId,
  MicroLessonId,
  Difficulty,
} from '../entities/types.js';
import type { Problem } from '../entities/Problem.js';
import type { Pattern } from '../entities/Pattern.js';
import type { MicroDrill } from '../entities/MicroDrill.js';
import type { MicroLesson } from '../entities/MicroLesson.js';

export interface ContentQuery {
  readonly tenantId: TenantId;
  readonly patternIds?: readonly PatternId[];
  readonly difficulty?: Difficulty;
  readonly tags?: readonly string[];
  readonly published?: boolean;
  readonly limit?: number;
  readonly offset?: number;
}

export interface ContentRepo {
  // Patterns
  getPattern(tenantId: TenantId, patternId: PatternId): Promise<Pattern | null>;
  getPatterns(query: ContentQuery): Promise<readonly Pattern[]>;
  getAllPatterns(tenantId: TenantId): Promise<readonly Pattern[]>;

  // Problems
  getProblem(tenantId: TenantId, problemId: ProblemId): Promise<Problem | null>;
  getProblems(query: ContentQuery): Promise<readonly Problem[]>;
  getProblemsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly Problem[]>;
  getRandomProblem(query: ContentQuery): Promise<Problem | null>;

  // Micro Drills
  getMicroDrill(tenantId: TenantId, drillId: MicroDrillId): Promise<MicroDrill | null>;
  getMicroDrills(query: ContentQuery): Promise<readonly MicroDrill[]>;
  getMicroDrillsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly MicroDrill[]>;
  getRandomMicroDrill(query: ContentQuery): Promise<MicroDrill | null>;

  // Micro Lessons
  getMicroLesson(tenantId: TenantId, lessonId: MicroLessonId): Promise<MicroLesson | null>;
  getMicroLessons(query: ContentQuery): Promise<readonly MicroLesson[]>;
  getMicroLessonsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly MicroLesson[]>;
}
