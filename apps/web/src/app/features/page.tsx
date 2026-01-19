'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  getAllFeatures,
  getFeaturesByCategory,
  getFeaturesByStatus,
  getCategoryCounts,
  getStatusCounts,
  searchFeatures,
  isFeatureActive,
  type FeatureDefinition,
  type FeatureCategory,
  type FeatureStatus,
} from '@interview-scaffold/core';

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  PRACTICE_MODE: 'Practice Modes',
  VALIDATION: 'Validation',
  COACHING: 'Coaching',
  LEARNING: 'Learning',
  ANALYTICS: 'Analytics',
  NAVIGATION: 'Navigation',
  DEBUGGING: 'Debugging',
};

const CATEGORY_ICONS: Record<FeatureCategory, string> = {
  PRACTICE_MODE: '🎯',
  VALIDATION: '✓',
  COACHING: '🧠',
  LEARNING: '📚',
  ANALYTICS: '📊',
  NAVIGATION: '🧭',
  DEBUGGING: '🔧',
};

const STATUS_COLORS: Record<FeatureStatus, string> = {
  IMPLEMENTED: '#22c55e',
  BETA: '#f59e0b',
  PLANNED: '#6b7280',
  DISABLED: '#ef4444',
};

const STATUS_LABELS: Record<FeatureStatus, string> = {
  IMPLEMENTED: 'Implemented',
  BETA: 'Beta',
  PLANNED: 'Planned',
  DISABLED: 'Disabled',
};

function FeatureCard({ feature }: { feature: FeatureDefinition }) {
  const isActive = isFeatureActive(feature);

  return (
    <div
      className="card"
      style={{
        opacity: isActive ? 1 : 0.6,
        borderLeft: `4px solid ${STATUS_COLORS[feature.status]}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>
          {feature.hasRoute && feature.route ? (
            <Link href={feature.route} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              {feature.name}
            </Link>
          ) : (
            feature.name
          )}
        </h3>
        <span
          style={{
            fontSize: '0.7rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            background: STATUS_COLORS[feature.status],
            color: feature.status === 'PLANNED' ? '#fff' : '#000',
          }}
        >
          {STATUS_LABELS[feature.status]}
        </span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
        {feature.description}
      </p>

      {feature.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          {feature.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '0.7rem',
                padding: '0.15rem 0.4rem',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {feature.hasRoute && feature.route && (
        <div style={{ marginTop: '0.75rem' }}>
          <Link
            href={feature.route}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
          >
            Open →
          </Link>
        </div>
      )}
    </div>
  );
}

export default function FeaturesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'ALL'>('ALL');

  const allFeatures = getAllFeatures();
  const categoryCounts = getCategoryCounts();
  const statusCounts = getStatusCounts();

  const filteredFeatures = useMemo(() => {
    let features = allFeatures;

    // Filter by search query
    if (searchQuery.trim()) {
      features = searchFeatures(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      features = features.filter((f) => f.category === selectedCategory);
    }

    // Filter by status
    if (selectedStatus !== 'ALL') {
      features = features.filter((f) => f.status === selectedStatus);
    }

    return features;
  }, [allFeatures, searchQuery, selectedCategory, selectedStatus]);

  // Group by category for display
  const featuresByCategory = useMemo(() => {
    const grouped: Record<FeatureCategory, FeatureDefinition[]> = {
      PRACTICE_MODE: [],
      VALIDATION: [],
      COACHING: [],
      LEARNING: [],
      ANALYTICS: [],
      NAVIGATION: [],
      DEBUGGING: [],
    };

    for (const feature of filteredFeatures) {
      grouped[feature.category].push(feature);
    }

    return grouped;
  }, [filteredFeatures]);

  const categories: FeatureCategory[] = [
    'PRACTICE_MODE',
    'VALIDATION',
    'COACHING',
    'LEARNING',
    'ANALYTICS',
    'NAVIGATION',
    'DEBUGGING',
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Feature Explorer</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Browse all {allFeatures.length} features in the interview-scaffold platform.
        </p>
      </header>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {Object.entries(statusCounts).map(([status, count]) => (
          <div
            key={status}
            className="card"
            style={{
              textAlign: 'center',
              cursor: 'pointer',
              borderColor: selectedStatus === status ? STATUS_COLORS[status as FeatureStatus] : undefined,
            }}
            onClick={() => setSelectedStatus(selectedStatus === status ? 'ALL' : (status as FeatureStatus))}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: STATUS_COLORS[status as FeatureStatus],
              }}
            >
              {count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {STATUS_LABELS[status as FeatureStatus]}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          />

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FeatureCategory | 'ALL')}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} ({categoryCounts[cat]})
              </option>
            ))}
          </select>

          {(searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
              }}
              style={{ fontSize: '0.85rem' }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Showing {filteredFeatures.length} of {allFeatures.length} features
        </div>
      </div>

      {/* Feature List by Category */}
      {categories.map((category) => {
        const features = featuresByCategory[category];
        if (features.length === 0) return null;

        return (
          <section key={category} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{CATEGORY_ICONS[category]}</span>
              {CATEGORY_LABELS[category]}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                ({features.length})
              </span>
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {features.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </section>
        );
      })}

      {filteredFeatures.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No features match your filters.</p>
        </div>
      )}

      {/* Back to Home */}
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <Link href="/" className="btn btn-secondary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
