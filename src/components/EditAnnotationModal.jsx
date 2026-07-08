import { useEffect, useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { ANNOTATION_SHORTCUTS, getShortcutByCode } from '../utils/shortcutCodes';
import { EVENT_CODES } from '../utils/scheme';

const TIME_REGEX = /^\d+:\d{2}:\d{2}(:\d{1,2})?$|^\d+:\d{2}$/;

function buildFormState(annotation) {
  if (!annotation) return null;
  if (annotation.type === 'event') {
    return {
      timestamp: annotation.timestamp ?? '',
      eventCode: annotation.eventCode ?? '',
      comment: annotation.comment ?? '',
    };
  }
  const shortcut = getShortcutByCode(annotation.primaryCode);
  return {
    timeStart: annotation.timeStart ?? '',
    timeEnd: annotation.timeEnd ?? '',
    primaryCode: shortcut?.code ?? annotation.primaryCode ?? '',
    comment: annotation.comment ?? '',
  };
}

function validateStateForm(form) {
  const errs = {};
  if (!form.timeStart.trim()) errs.timeStart = 'Required';
  else if (!TIME_REGEX.test(form.timeStart.trim())) errs.timeStart = 'Use H:MM:SS:FF';
  if (!form.timeEnd.trim()) errs.timeEnd = 'Required';
  else if (!TIME_REGEX.test(form.timeEnd.trim())) errs.timeEnd = 'Use H:MM:SS:FF';
  if (!form.primaryCode) errs.primaryCode = 'Select a code';
  return errs;
}

function validateEventForm(form) {
  const errs = {};
  if (!form.timestamp.trim()) errs.timestamp = 'Required';
  else if (!TIME_REGEX.test(form.timestamp.trim())) errs.timestamp = 'Use H:MM:SS:FF';
  if (!form.eventCode) errs.eventCode = 'Select an event code';
  return errs;
}

export default function EditAnnotationModal({ open, annotation, onSubmit, onCancel }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && annotation) {
      setForm(buildFormState(annotation));
      setErrors({});
    }
  }, [open, annotation]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open || !annotation || !form) return null;

  const isEvent = annotation.type === 'event';

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = isEvent ? validateEventForm(form) : validateStateForm(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (isEvent) {
      const ev = EVENT_CODES.find((c) => c.value === form.eventCode);
      onSubmit({
        ...annotation,
        timestamp: form.timestamp.trim(),
        eventCode: form.eventCode,
        eventLabel: ev?.label ?? form.eventCode,
        comment: form.comment.trim(),
      });
      return;
    }

    const shortcut = getShortcutByCode(form.primaryCode);
    onSubmit({
      ...annotation,
      timeStart: form.timeStart.trim(),
      timeEnd: form.timeEnd.trim(),
      primaryCode: shortcut?.code ?? form.primaryCode,
      primaryCodeLabel: shortcut?.label ?? annotation.primaryCodeLabel ?? form.primaryCode,
      primaryLabel: shortcut?.label ?? annotation.primaryLabel ?? form.primaryCode,
      comment: form.comment.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-card" style={{ maxWidth: 480 }}>
        <div className="modal-hd">
          <div className="modal-title">
            <Pencil size={14} color="var(--accent)" />
            Edit Annotation
          </div>
          <button className="modal-x" onClick={onCancel} title="Cancel (Esc)">
            <X size={14} />
          </button>
        </div>

        <div className="modal-bd">
          <form onSubmit={handleSubmit}>
            {isEvent ? (
              <>
                <div className="f-field">
                  <label className="f-label">Timestamp</label>
                  <input
                    className={`f-input mono${errors.timestamp ? ' err' : ''}`}
                    value={form.timestamp}
                    onChange={(e) => setForm((p) => ({ ...p, timestamp: e.target.value }))}
                    placeholder="0:00:00:00"
                    autoFocus
                  />
                  {errors.timestamp && <div className="f-err">{errors.timestamp}</div>}
                </div>

                <div className="f-field">
                  <label className="f-label">Event Code</label>
                  <select
                    className={`f-select${errors.eventCode ? ' err' : ''}`}
                    value={form.eventCode}
                    onChange={(e) => setForm((p) => ({ ...p, eventCode: e.target.value }))}
                  >
                    <option value="">Select event…</option>
                    {EVENT_CODES.map((ev) => (
                      <option key={ev.value} value={ev.value}>{ev.label}</option>
                    ))}
                  </select>
                  {errors.eventCode && <div className="f-err">{errors.eventCode}</div>}
                </div>
              </>
            ) : (
              <>
                <div className="f-row">
                  <div>
                    <label className="f-label">Time Start</label>
                    <input
                      className={`f-input mono${errors.timeStart ? ' err' : ''}`}
                      value={form.timeStart}
                      onChange={(e) => setForm((p) => ({ ...p, timeStart: e.target.value }))}
                      placeholder="0:00:00:00"
                      autoFocus
                    />
                    {errors.timeStart && <div className="f-err">{errors.timeStart}</div>}
                  </div>
                  <div>
                    <label className="f-label">Time End</label>
                    <input
                      className={`f-input mono${errors.timeEnd ? ' err' : ''}`}
                      value={form.timeEnd}
                      onChange={(e) => setForm((p) => ({ ...p, timeEnd: e.target.value }))}
                      placeholder="0:00:00:00"
                    />
                    {errors.timeEnd && <div className="f-err">{errors.timeEnd}</div>}
                  </div>
                </div>

                <div className="f-field">
                  <label className="f-label">Code</label>
                  <select
                    className={`f-select${errors.primaryCode ? ' err' : ''}`}
                    value={form.primaryCode}
                    onChange={(e) => setForm((p) => ({ ...p, primaryCode: e.target.value }))}
                  >
                    <option value="">Select code…</option>
                    {!getShortcutByCode(form.primaryCode) && form.primaryCode && (
                      <option value={form.primaryCode}>
                        {form.primaryCode} — {annotation.primaryCodeLabel || annotation.primaryLabel || 'Imported'}
                      </option>
                    )}
                    {ANNOTATION_SHORTCUTS.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} — {s.label}
                      </option>
                    ))}
                  </select>
                  {errors.primaryCode && <div className="f-err">{errors.primaryCode}</div>}
                </div>
              </>
            )}

            <div className="f-field">
              <label className="f-label">
                Comment{' '}
                <span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>
                  (optional)
                </span>
              </label>
              <textarea
                className="f-textarea"
                rows={3}
                value={form.comment}
                onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                placeholder="Add a note about this segment…"
              />
            </div>

            <div className="f-actions">
              <button type="submit" className="btn btn-primary">
                Save Changes
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
