'use client';

interface MicroLessonModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onComplete: () => void;
}

export function MicroLessonModal({ isOpen, title, content, onComplete }: MicroLessonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <div
            style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              whiteSpace: 'pre-wrap'
            }}
          >
            {content}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onComplete}>
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
