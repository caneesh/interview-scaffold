# TrackF Architecture Sanity - Executive Summary

**Date**: 2026-01-24
**Architect**: Claude (Staff Engineer Mode)

---

## Current State Assessment

### Architecture Quality: STRONG ✅

The codebase follows **clean hexagonal architecture** with excellent separation of concerns:

- **Pure domain core** (`packages/core`) with zero framework dependencies
- **Ports/Adapters pattern** properly implemented
- **Dependency injection** via `/apps/web/src/lib/deps.ts`
- **Type safety** with branded types and strict TypeScript
- **Multi-tenancy** built-in from day one

### Existing Practice Modes

1. **Coding Interview** - Fully implemented with use-cases, DB schema, API routes
2. **Debug Lab** - Separate in-memory repo, no use-cases, entity-level validation
3. **Bug Hunt** - Separate in-memory repo, entity-level validation

### Key Finding: **Siloed Content Storage**

Each practice mode has its own:
- Entity types (`Problem` vs `DebugLabItem` vs `BugHuntItem`)
- Repository ports (`ContentRepo` vs `DebugLabRepo` vs `BugHuntRepo`)
- Database tables (`problems` vs `debugScenarios` vs no table for bug hunt)

**Implication**: Adding System Design mode would require duplicating this pattern → technical debt.

---

## Proposed Solution: Unified Content Bank

### Core Concept

A **polymorphic content storage system** that supports all practice modes through:

1. **Single schema** for all content types (`content_items` + `content_versions`)
2. **Versioned payloads** (JSONB) for type-specific data
3. **Common metadata** (tags, difficulty, category)
4. **Unified submission/evaluation** tracking

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Existing APIs (NO CHANGES)                             │
│  /api/attempts/*, /api/debug-lab/*, /api/bug-hunt/*    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│  Bridge Adapter (ContentRepoWithFallback)               │
│  • Reads from content_items OR legacy tables            │
│  • Zero breaking changes                                │
│  • Gradual migration via ETL scripts                    │
└────────────┬───────────────────────┬────────────────────┘
             │                       │
             ↓                       ↓
┌────────────────────┐  ┌───────────────────────────────┐
│ Content Bank       │  │ Legacy Tables                 │
│ • content_items    │  │ • problems                    │
│ • content_versions │  │ • debugScenarios              │
│ • submissions      │  │ (Keep for rollback)           │
└────────────────────┘  └───────────────────────────────┘
```

---

## Implementation Plan Summary

### Phase 0: Foundation (P0) - 2 Weeks
- Add 7 new database tables (content_items, content_versions, submissions, evaluation_runs, ai_feedback, socratic_turns, user_progress)
- Create `ContentBankRepo` port
- Implement Drizzle adapter
- Build **bridge adapter** for backward compatibility
- Add feature flag (`USE_CONTENT_BANK=false` by default)

**Risk**: Low. All existing APIs continue to work.

### Phase 1: Migration (P1) - 2 Weeks
- ETL script to migrate coding problems
- ETL script to migrate debug lab scenarios
- ETL script to migrate bug hunt items
- Implement unified submission tracking
- Canary rollout: 10% → 50% → 100%

**Risk**: Medium. Data migration could fail. **Mitigation**: Dry-run, backups, keep legacy tables.

### Phase 2: System Design (P2) - 2.5 Weeks
- Define `SystemDesignCase` entity
- Build evaluation rubric
- Create API routes
- Build UI components (design canvas, submission form)
- Launch first system design case

**Risk**: Low. New feature, no migration risk.

**Total Timeline**: 6.5 weeks

---

## Key Benefits

### 1. Unified Content Management
- Single admin interface for all content types
- Consistent tagging, categorization, difficulty levels
- Easier to add new practice modes (e.g., SQL, networking)

### 2. Versioning & Rollback
- Every content update creates a new version
- Can rollback to previous version instantly
- Supports A/B testing different problem variants

### 3. Better Analytics
- Unified progress tracking across all modes
- Compare user performance: coding vs debugging vs design
- Identify skill gaps across multiple dimensions

### 4. System Design Support
- First-class support for system design practice
- LLM-based evaluation for open-ended submissions
- Rubric-based scoring for architectural decisions

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Data Migration Failure** | High | Dry-run scripts, database backups, keep legacy tables for rollback |
| **Performance Degradation** | Medium | Bridge adapter adds overhead; benchmark and optimize, add caching |
| **Breaking API Changes** | High | Bridge pattern prevents this; all existing routes unchanged |
| **Schema Evolution** | Medium | Version field in payloads; support multiple schemaVersions in code |

---

## Exact Changes Required

### P0: Foundation
- **Create**: 3 new files (port, adapter, bridge)
- **Modify**: 6 existing files (schema, deps, exports)
- **Generate**: 1 migration SQL script

### P1: Migration
- **Create**: 6 new files (ETL scripts, unified submission use-case)
- **Modify**: 4 existing files (entity types, exports)

### P2: System Design
- **Create**: 7 new files (entities, use-cases, API routes, UI)
- **Modify**: 3 existing files (contracts, exports)

**Total**: 16 new files, 13 modified files, 1 migration

---

## Decision Points

### Architecture Decisions Needed

**AD-1**: Dual writes or content bank only after migration?
- **Recommendation**: Content bank only. Simpler, no sync issues.

**AD-2**: Mark legacy tables read-only or allow dual writes?
- **Recommendation**: Read-only after ETL. Use DB triggers to prevent writes.

**AD-3**: Support real-time collaboration on system design?
- **Recommendation**: Defer to later phase. Start single-user.

### Product Decisions Needed

**PD-1**: Reuse EASY/MEDIUM/HARD difficulty scale for all modes?
- **Recommendation**: Yes, consistent UX. Allow metadata overrides if needed.

**PD-2**: What feedback format for system design?
- **Recommendation**: Rubric scores + LLM feedback. Both deterministic and open-ended.

---

## Success Criteria

### P0 Success (Foundation)
- [ ] All existing tests pass with feature flag on/off
- [ ] No API contract changes
- [ ] Database migrations apply cleanly in staging
- [ ] Bridge adapter serves both legacy and content bank seamlessly

### P1 Success (Migration)
- [ ] 100% of coding problems migrated and verified
- [ ] Debug lab and bug hunt accessible via content bank
- [ ] Zero data loss during migration
- [ ] Performance < 10% degradation from baseline

### P2 Success (System Design)
- [ ] First system design case published
- [ ] Users can submit design docs
- [ ] Evaluation rubric returns actionable feedback
- [ ] LLM feedback quality validated by SMEs

---

## Recommended Next Steps

### Immediate (This Week)
1. Review this plan with engineering team
2. Get approval on schema design (especially content_versions payload structure)
3. Set up test Postgres instance for migration dry-run
4. Create JIRA tickets for P0 tasks

### Week 1-2 (P0 Execution)
1. Implement schema changes in feature branch
2. Build content bank repos and bridge adapter
3. Write comprehensive tests
4. Deploy to staging with `USE_CONTENT_BANK=false` (disabled)
5. Run smoke tests

### Week 3-4 (P1 Execution)
1. Enable feature flag in staging
2. Run ETL scripts for problems → content bank
3. Verify data integrity
4. Canary release: 10% production traffic
5. Monitor error rates and latency

### Week 5-6 (Stabilization & P2 Planning)
1. Full rollout to 100% production
2. Begin P2: Design system design UI mockups
3. Define evaluation rubric with product team
4. Prototype first system design case

---

## Conclusion

The current architecture is **sound and well-designed**. The proposed Unified Content Bank is an **incremental, low-risk enhancement** that:

- Preserves all existing functionality
- Enables system design mode without architectural debt
- Provides a foundation for future practice modes
- Improves content management and analytics

**The architecture is production-ready**. The migration plan is **conservative and reversible**. Recommend proceeding with P0 immediately.

---

**Full Technical Details**: See `/TRACKF_ARCHITECTURE_PLAN.md`

**Author**: Claude (Staff Engineer + Architect)
**Status**: Ready for Review
**Next**: Team review → Schema approval → P0 execution
