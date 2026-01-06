'use client';

interface LLMFeedbackProps {
  feedback: string;
  confidence: number;
  grade: 'PASS' | 'PARTIAL' | 'FAIL';
  microLessonId?: string;
}

export function LLMFeedback({ feedback, confidence, grade, microLessonId }: LLMFeedbackProps) {
  const gradeColors = {
    PASS: { bg: 'rgba(34, 197, 94, 0.1)', border: 'var(--success)', icon: '✓' },
    PARTIAL: { bg: 'rgba(234, 179, 8, 0.1)', border: 'var(--warning)', icon: '!' },
    FAIL: { bg: 'rgba(239, 68, 68, 0.1)', border: 'var(--error)', icon: '✗' },
  };

  const style = gradeColors[grade];

  return (
    <div style={{
      marginTop: '1.5rem',
      padding: '1rem',
      backgroundColor: style.bg,
      borderLeft: `4px solid ${style.border}`,
      borderRadius: '0.5rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.5rem',
          height: '1.5rem',
          borderRadius: '50%',
          backgroundColor: style.border,
          color: 'white',
          fontSize: '0.875rem',
          fontWeight: 'bold',
        }}>
          {style.icon}
        </span>
        <h4 style={{ margin: 0, fontSize: '1rem' }}>
          AI Code Review
          <span style={{
            marginLeft: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 'normal',
          }}>
            ({Math.round(confidence * 100)}% confident)
          </span>
        </h4>
      </div>

      <p style={{
        margin: 0,
        fontSize: '0.9rem',
        lineHeight: 1.6,
        color: 'var(--text-primary)',
      }}>
        {feedback}
      </p>

      {microLessonId && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <strong>Suggested topic:</strong> {microLessonId}
        </div>
      )}
    </div>
  );
}
