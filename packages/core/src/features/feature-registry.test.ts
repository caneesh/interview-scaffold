import { describe, it, expect } from 'vitest';
import {
  getAllFeatures,
  getFeatureById,
  getFeaturesByCategory,
  getFeaturesByStatus,
  getRoutableFeatures,
  getPrimaryNavFeatures,
  isFeatureActive,
  getFeaturesByTag,
  getFeatureDependencies,
  getCategoryCounts,
  getStatusCounts,
  searchFeatures,
  FEATURES,
} from './feature-registry.js';

describe('Feature Registry', () => {
  describe('getAllFeatures', () => {
    it('should return all features', () => {
      const features = getAllFeatures();
      expect(features.length).toBeGreaterThan(0);
      expect(features).toBe(FEATURES);
    });
  });

  describe('getFeatureById', () => {
    it('should find feature by id', () => {
      const feature = getFeatureById('pattern-practice');
      expect(feature).toBeDefined();
      expect(feature?.name).toBe('Pattern Practice');
    });

    it('should return undefined for unknown id', () => {
      const feature = getFeatureById('unknown-feature');
      expect(feature).toBeUndefined();
    });
  });

  describe('getFeaturesByCategory', () => {
    it('should filter by category', () => {
      const practiceModes = getFeaturesByCategory('PRACTICE_MODE');
      expect(practiceModes.length).toBeGreaterThan(0);
      expect(practiceModes.every((f) => f.category === 'PRACTICE_MODE')).toBe(true);
    });
  });

  describe('getFeaturesByStatus', () => {
    it('should filter by status', () => {
      const implemented = getFeaturesByStatus('IMPLEMENTED');
      expect(implemented.length).toBeGreaterThan(0);
      expect(implemented.every((f) => f.status === 'IMPLEMENTED')).toBe(true);
    });
  });

  describe('getRoutableFeatures', () => {
    it('should return features with routes', () => {
      const routable = getRoutableFeatures();
      expect(routable.length).toBeGreaterThan(0);
      expect(routable.every((f) => f.hasRoute && f.route)).toBe(true);
    });

    it('should include pattern-practice with /practice route', () => {
      const routable = getRoutableFeatures();
      const practice = routable.find((f) => f.id === 'pattern-practice');
      expect(practice).toBeDefined();
      expect(practice?.route).toBe('/practice');
    });
  });

  describe('getPrimaryNavFeatures', () => {
    it('should return features shown in primary nav', () => {
      const navFeatures = getPrimaryNavFeatures();
      expect(navFeatures.length).toBeGreaterThan(0);
      expect(navFeatures.every((f) => f.showInPrimaryNav)).toBe(true);
    });

    it('should not include disabled features', () => {
      const navFeatures = getPrimaryNavFeatures();
      expect(navFeatures.every((f) => f.status !== 'DISABLED')).toBe(true);
    });
  });

  describe('isFeatureActive', () => {
    it('should return true for implemented features', () => {
      const feature = getFeatureById('pattern-practice');
      expect(feature && isFeatureActive(feature)).toBe(true);
    });

    it('should return true for beta features', () => {
      const betaFeature = getFeaturesByStatus('BETA')[0];
      if (betaFeature) {
        expect(isFeatureActive(betaFeature)).toBe(true);
      }
    });
  });

  describe('getFeaturesByTag', () => {
    it('should filter by tag', () => {
      const debuggingFeatures = getFeaturesByTag('debugging');
      expect(debuggingFeatures.length).toBeGreaterThan(0);
      expect(debuggingFeatures.every((f) => f.tags.includes('debugging'))).toBe(true);
    });
  });

  describe('getFeatureDependencies', () => {
    it('should resolve dependencies', () => {
      const deps = getFeatureDependencies('interview-mode');
      // interview-mode depends on constraint-adversary
      expect(deps.some((f) => f.id === 'constraint-adversary')).toBe(true);
    });

    it('should return empty array for feature with no dependencies', () => {
      const deps = getFeatureDependencies('pattern-practice');
      expect(deps).toEqual([]);
    });

    it('should return empty array for unknown feature', () => {
      const deps = getFeatureDependencies('unknown');
      expect(deps).toEqual([]);
    });
  });

  describe('getCategoryCounts', () => {
    it('should count features per category', () => {
      const counts = getCategoryCounts();
      expect(counts.PRACTICE_MODE).toBeGreaterThan(0);
      expect(counts.VALIDATION).toBeGreaterThan(0);

      // Total should match all features
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(getAllFeatures().length);
    });
  });

  describe('getStatusCounts', () => {
    it('should count features per status', () => {
      const counts = getStatusCounts();
      expect(counts.IMPLEMENTED).toBeGreaterThan(0);

      // Total should match all features
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(getAllFeatures().length);
    });
  });

  describe('searchFeatures', () => {
    it('should search by name', () => {
      const results = searchFeatures('pattern');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((f) => f.name.toLowerCase().includes('pattern'))).toBe(true);
    });

    it('should search by description', () => {
      const results = searchFeatures('debugging');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by tags', () => {
      const results = searchFeatures('socratic');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchFeatures('PATTERN');
      const results2 = searchFeatures('pattern');
      expect(results1.length).toBe(results2.length);
    });
  });

  describe('feature data integrity', () => {
    it('all features should have required fields', () => {
      for (const feature of FEATURES) {
        expect(feature.id).toBeTruthy();
        expect(feature.name).toBeTruthy();
        expect(feature.description).toBeTruthy();
        expect(feature.category).toBeTruthy();
        expect(feature.status).toBeTruthy();
        expect(typeof feature.hasRoute).toBe('boolean');
        expect(typeof feature.showInPrimaryNav).toBe('boolean');
        expect(Array.isArray(feature.components)).toBe(true);
        expect(Array.isArray(feature.apiRoutes)).toBe(true);
        expect(Array.isArray(feature.dependencies)).toBe(true);
        expect(Array.isArray(feature.tags)).toBe(true);
      }
    });

    it('features with hasRoute should have route defined', () => {
      for (const feature of FEATURES) {
        if (feature.hasRoute) {
          expect(feature.route).toBeTruthy();
          expect(feature.route).toMatch(/^\//);
        }
      }
    });

    it('feature ids should be unique', () => {
      const ids = FEATURES.map((f) => f.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
