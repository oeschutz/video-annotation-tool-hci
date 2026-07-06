import { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

function annotationLabel(ann) {
  if (ann.type === 'event') return ann.eventLabel || ann.eventCode || 'Event';
  return ann.primaryCodeLabel || ann.primaryLabel || ann.primaryCode || 'Annotation';
}

function annotationTime(ann) {
  if (ann.type === 'event') return ann.timestamp;
  return `${ann.timeStart} → ${ann.timeEnd}`;
}

export default function CommentModal({ open, annotation, onSubmit, onCancel }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && annotation) setComment(annotation.comment || '');
  }, [open, annotation]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open || !annotation) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(annotation.id, comment.trim());
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div className="modal-hd">
          <div className="modal-title">
            <MessageSquare size={14} color="var(--accent)" />
            Add Comment
            <span style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>
              {annotationLabel(annotation)}
            </span>
          </div>
          <button className="modal-x" onClick={onCancel} title="Cancel (Esc)">
            <X size={14} />
          </button>
        </div>

        <div className="modal-bd">
          <form onSubmit={handleSubmit}>
            <div className="f-field">
              <label className="f-label">Time</label>
              <div className="f-input mono" style={{ background: 'var(--surface-2)', cursor: 'default' }}>
                {annotationTime(annotation)}
              </div>
            </div>

            <div className="f-field">
              <label className="f-label">Comment</label>
              <textarea
                className="f-textarea"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note about this segment…"
                autoFocus
              />
            </div>

            <div className="f-actions">
              <button type="submit" className="btn btn-primary">
                Save Comment
              </button>
              <button type="button" className="btn btn-ghost" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
