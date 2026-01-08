/**
 * Supabase implementation of ContentRepo.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ContentRepo,
  ContentQuery,
  TenantId,
  ProblemId,
  PatternId,
  MicroDrillId,
  MicroLessonId,
  Problem,
  Pattern,
  MicroDrill,
  MicroLesson,
} from '@learning/core';

export class SupabaseContentRepo implements ContentRepo {
  constructor(private readonly client: SupabaseClient) {}

  // Patterns
  async getPattern(tenantId: TenantId, patternId: PatternId): Promise<Pattern | null> {
    const { data, error } = await this.client
      .from('patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', patternId)
      .single();

    if (error || !data) return null;
    return this.mapPattern(data);
  }

  async getPatterns(query: ContentQuery): Promise<readonly Pattern[]> {
    let q = this.client
      .from('patterns')
      .select('*')
      .eq('tenant_id', query.tenantId);

    if (query.difficulty) {
      q = q.eq('difficulty', query.difficulty);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }
    if (query.offset) {
      q = q.range(query.offset, query.offset + (query.limit ?? 10) - 1);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(this.mapPattern);
  }

  async getAllPatterns(tenantId: TenantId): Promise<readonly Pattern[]> {
    const { data, error } = await this.client
      .from('patterns')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error || !data) return [];
    return data.map(this.mapPattern);
  }

  // Problems
  async getProblem(tenantId: TenantId, problemId: ProblemId): Promise<Problem | null> {
    const { data, error } = await this.client
      .from('problems')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', problemId)
      .single();

    if (error || !data) return null;
    return this.mapProblem(data);
  }

  async getProblems(query: ContentQuery): Promise<readonly Problem[]> {
    let q = this.client
      .from('problems')
      .select('*')
      .eq('tenant_id', query.tenantId);

    if (query.patternIds && query.patternIds.length > 0) {
      q = q.in('pattern_id', [...query.patternIds]);
    }
    if (query.difficulty) {
      q = q.eq('difficulty', query.difficulty);
    }
    if (query.published !== undefined) {
      q = q.eq('published', query.published);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }
    if (query.offset) {
      q = q.range(query.offset, query.offset + (query.limit ?? 10) - 1);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(this.mapProblem);
  }

  async getProblemsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly Problem[]> {
    const { data, error } = await this.client
      .from('problems')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pattern_id', patternId)
      .eq('published', true);

    if (error || !data) return [];
    return data.map(this.mapProblem);
  }

  async getRandomProblem(query: ContentQuery): Promise<Problem | null> {
    const problems = await this.getProblems({ ...query, limit: 50 });
    if (problems.length === 0) return null;
    const index = Math.floor(Math.random() * problems.length);
    return problems[index] ?? null;
  }

  // Micro Drills
  async getMicroDrill(tenantId: TenantId, drillId: MicroDrillId): Promise<MicroDrill | null> {
    const { data, error } = await this.client
      .from('micro_drills')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', drillId)
      .single();

    if (error || !data) return null;
    return this.mapMicroDrill(data);
  }

  async getMicroDrills(query: ContentQuery): Promise<readonly MicroDrill[]> {
    let q = this.client
      .from('micro_drills')
      .select('*')
      .eq('tenant_id', query.tenantId);

    if (query.patternIds && query.patternIds.length > 0) {
      q = q.in('pattern_id', [...query.patternIds]);
    }
    if (query.difficulty) {
      q = q.eq('difficulty', query.difficulty);
    }
    if (query.published !== undefined) {
      q = q.eq('published', query.published);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(this.mapMicroDrill);
  }

  async getMicroDrillsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly MicroDrill[]> {
    const { data, error } = await this.client
      .from('micro_drills')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pattern_id', patternId)
      .eq('published', true)
      .order('order', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapMicroDrill);
  }

  async getRandomMicroDrill(query: ContentQuery): Promise<MicroDrill | null> {
    const drills = await this.getMicroDrills({ ...query, limit: 50 });
    if (drills.length === 0) return null;
    const index = Math.floor(Math.random() * drills.length);
    return drills[index] ?? null;
  }

  // Micro Lessons
  async getMicroLesson(tenantId: TenantId, lessonId: MicroLessonId): Promise<MicroLesson | null> {
    const { data, error } = await this.client
      .from('micro_lessons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', lessonId)
      .single();

    if (error || !data) return null;
    return this.mapMicroLesson(data);
  }

  async getMicroLessons(query: ContentQuery): Promise<readonly MicroLesson[]> {
    let q = this.client
      .from('micro_lessons')
      .select('*')
      .eq('tenant_id', query.tenantId);

    if (query.patternIds && query.patternIds.length > 0) {
      q = q.in('pattern_id', [...query.patternIds]);
    }
    if (query.published !== undefined) {
      q = q.eq('published', query.published);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map(this.mapMicroLesson);
  }

  async getMicroLessonsByPattern(tenantId: TenantId, patternId: PatternId): Promise<readonly MicroLesson[]> {
    const { data, error } = await this.client
      .from('micro_lessons')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('pattern_id', patternId)
      .eq('published', true)
      .order('order', { ascending: true });

    if (error || !data) return [];
    return data.map(this.mapMicroLesson);
  }

  // Mappers
  private mapPattern(data: Record<string, unknown>): Pattern {
    return {
      id: data['id'] as PatternId,
      tenantId: data['tenant_id'] as TenantId,
      name: data['name'] as string,
      slug: data['slug'] as string,
      description: data['description'] as string,
      category: data['category'] as string,
      difficulty: data['difficulty'] as Pattern['difficulty'],
      timeComplexity: data['time_complexity'] as string,
      spaceComplexity: data['space_complexity'] as string,
      primitives: (data['primitives'] as string[]) ?? [],
      templates: (data['templates'] as Pattern['templates']) ?? [],
      variants: (data['variants'] as Pattern['variants']) ?? [],
      commonMistakes: (data['common_mistakes'] as string[]) ?? [],
      whenToUse: (data['when_to_use'] as string[]) ?? [],
      relatedPatterns: (data['related_patterns'] as PatternId[]) ?? [],
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapProblem(data: Record<string, unknown>): Problem {
    return {
      id: data['id'] as ProblemId,
      tenantId: data['tenant_id'] as TenantId,
      patternId: data['pattern_id'] as PatternId,
      title: data['title'] as string,
      slug: data['slug'] as string,
      description: data['description'] as string,
      difficulty: data['difficulty'] as Problem['difficulty'],
      supportedLanguages: (data['supported_languages'] as Problem['supportedLanguages']) ?? ['python'],
      defaultLanguage: (data['default_language'] as Problem['defaultLanguage']) ?? 'python',
      patternSelection: data['pattern_selection'] as Problem['patternSelection'],
      interviewQuestion: data['interview_question'] as Problem['interviewQuestion'],
      strategyStep: data['strategy_step'] as Problem['strategyStep'],
      steps: (data['steps'] as Problem['steps']) ?? [],
      solutionCode: (data['solution_code'] as Problem['solutionCode']) ?? [],
      testCases: (data['test_cases'] as string[]) ?? [],
      tags: (data['tags'] as string[]) ?? [],
      estimatedTimeSec: (data['estimated_time_sec'] as number) ?? 900,
      published: (data['published'] as boolean) ?? false,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapMicroDrill(data: Record<string, unknown>): MicroDrill {
    return {
      id: data['id'] as MicroDrillId,
      tenantId: data['tenant_id'] as TenantId,
      patternId: data['pattern_id'] as PatternId,
      type: data['type'] as MicroDrill['type'],
      difficulty: data['difficulty'] as MicroDrill['difficulty'],
      title: data['title'] as string,
      description: data['description'] as string,
      prompt: data['prompt'] as string,
      codeSnippet: data['code_snippet'] as MicroDrill['codeSnippet'],
      options: data['options'] as MicroDrill['options'],
      expectedAnswer: data['expected_answer'] as string | null,
      hints: (data['hints'] as string[]) ?? [],
      explanation: data['explanation'] as string,
      timeBudgetSec: (data['time_budget_sec'] as number) ?? 60,
      tags: (data['tags'] as string[]) ?? [],
      order: (data['order'] as number) ?? 0,
      published: (data['published'] as boolean) ?? false,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }

  private mapMicroLesson(data: Record<string, unknown>): MicroLesson {
    return {
      id: data['id'] as MicroLessonId,
      tenantId: data['tenant_id'] as TenantId,
      patternId: data['pattern_id'] as PatternId,
      type: data['type'] as MicroLesson['type'],
      difficulty: data['difficulty'] as MicroLesson['difficulty'],
      title: data['title'] as string,
      description: data['description'] as string,
      sections: (data['sections'] as MicroLesson['sections']) ?? [],
      quiz: data['quiz'] as MicroLesson['quiz'],
      keyTakeaways: (data['key_takeaways'] as string[]) ?? [],
      estimatedTimeSec: (data['estimated_time_sec'] as number) ?? 300,
      prerequisites: (data['prerequisites'] as MicroLessonId[]) ?? [],
      relatedDrills: (data['related_drills'] as string[]) ?? [],
      order: (data['order'] as number) ?? 0,
      published: (data['published'] as boolean) ?? false,
      createdAt: new Date(data['created_at'] as string).getTime(),
      updatedAt: new Date(data['updated_at'] as string).getTime(),
    };
  }
}
