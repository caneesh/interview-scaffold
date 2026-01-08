/**
 * MicroLesson entity - short, focused learning content.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  MicroLessonId,
  TenantId,
  PatternId,
  Difficulty,
  LessonType,
  Language,
} from './types.js';

export interface LessonSection {
  readonly title: string;
  readonly content: string;
  readonly codeExample?: {
    readonly language: Language;
    readonly code: string;
    readonly explanation: string;
  };
}

export interface LessonQuiz {
  readonly question: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

export interface MicroLesson {
  readonly id: MicroLessonId;
  readonly tenantId: TenantId;
  readonly patternId: PatternId;
  readonly type: LessonType;
  readonly difficulty: Difficulty;
  readonly title: string;
  readonly description: string;
  readonly sections: readonly LessonSection[];
  readonly quiz: LessonQuiz | null;
  readonly keyTakeaways: readonly string[];
  readonly estimatedTimeSec: number;
  readonly prerequisites: readonly MicroLessonId[];
  readonly relatedDrills: readonly string[];
  readonly order: number;
  readonly published: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory function
export function createMicroLesson(
  params: Omit<MicroLesson, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): MicroLesson {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
