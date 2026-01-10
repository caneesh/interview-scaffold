'use client';

import type { z } from 'zod';
import type { ThinkingGateValidationResultSchema } from '@scaffold/contracts';

type ValidationResult = z.infer<typeof ThinkingGateValidationResultSchema>;

interface ThinkingGateValidationProps {
  validation: ValidationResult;
}

export function ThinkingGateValidation({ validation }: ThinkingGateValidationProps) {
  if (validation.passed && validation.errors.length === 0 && validation.warnings.length === 0) {
    return null;
  }

  return (
    <div className="validation-feedback" style={{ marginTop: '1rem' }}>
      {/* Errors */}
      {validation.errors.length > 0 && (
        <div className="validation-errors" style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Issues to Address
          </h4>
          {validation.errors.map((error, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: '#dc2626', fontSize: '1rem' }}>!</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#b91c1c', fontWeight: 500, fontSize: '0.875rem' }}>
                    {getFieldLabel(error.field)}
                  </div>
                  <div style={{ color: '#7f1d1d', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                    {error.message}
                  </div>
                  {error.hint && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '0.25rem',
                        fontSize: '0.8125rem',
                        color: '#9a3412',
                      }}
                    >
                      <strong>Hint:</strong> {error.hint}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <div className="validation-warnings">
          <h4 style={{ color: '#d97706', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            Suggestions
          </h4>
          {validation.warnings.map((warning, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ color: '#d97706', fontSize: '1rem' }}>i</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#92400e', fontWeight: 500, fontSize: '0.875rem' }}>
                    {getFieldLabel(warning.field)}
                  </div>
                  <div style={{ color: '#78350f', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                    {warning.message}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LLM indicator */}
      {validation.llmAugmented && (
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <span>AI-enhanced validation</span>
        </div>
      )}
    </div>
  );
}

function getFieldLabel(field: 'pattern' | 'invariant' | 'complexity'): string {
  switch (field) {
    case 'pattern':
      return 'Pattern Selection';
    case 'invariant':
      return 'Invariant Statement';
    case 'complexity':
      return 'Complexity Analysis';
    default:
      return field;
  }
}
