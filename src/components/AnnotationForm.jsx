import { useState, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  DEFAULT_SCHEME,
  getOptionsForLevel,
  getFirstOption,
  getDefaultValues,
} from '../utils/scheme';

const TIME_REGEX = /^\d+:\d{2}:\d{2}(:\d{1,2})?$|^\d+:\d{2}$/;

// The task level is the last level in the scheme by convention.
function getTaskLevelId(scheme) {
  return scheme.levels[scheme.levels.length - 1]?.id ?? null;
}

// Resolves a raw stored string to a select value, accepting either a value
// ("T1") or a label ("Task 1") for backward compatibility with old annotations.
function resolveOptionValue(scheme, levelId, raw, parentValues = {}) {
  if (!raw) return getFirstOption(scheme, levelId, parentValues);
  const opts = getOptionsForLevel(scheme, levelId, parentValues);
  return (
    opts.find((o) => o.value === raw)?.value ??
    opts.find((o) => o.label === raw)?.value ??
    opts[0]?.value ??
    ''
  );
}

// Builds a fresh form state from scheme defaults, optionally overriding the
// task level with a default value (value string or label string).
function buildInitialState(scheme, taskDefault) {
  const levelDefaults = getDefaultValues(scheme);
  const taskLevelId = getTaskLevelId(scheme);
  if (taskLevelId && taskDefault) {
    levelDefaults[taskLevelId] = resolveOptionValue(scheme, taskLevelId, taskDefault, levelDefaults);
  }
  return { timeStart: '', timeEnd: '', ...levelDefaults, comment: '' };
}

export default function AnnotationForm({
  scheme = DEFAULT_SCHEME,
  timeStart,
  timeEnd,
  editingAnnotation,
  defaultTask,
  onSubmit,
  onCancelEdit,
}) {
  const taskLevelId = getTaskLevelId(scheme);
  const [form, setForm] = useState(() => buildInitialState(scheme, defaultTask));
  const [errors, setErrors] = useState({});

  useEffect(() => { if (timeStart) setForm((p) => ({ ...p, timeStart })); }, [timeStart]);
  useEffect(() => { if (timeEnd)   setForm((p) => ({ ...p, timeEnd }));   }, [timeEnd]);

  // Populate all fields from the annotation being edited.
  useEffect(() => {
    if (!editingAnnotation) return;
    const newForm = {
      timeStart: editingAnnotation.timeStart ?? '',
      timeEnd:   editingAnnotation.timeEnd   ?? '',
      comment:   editingAnnotation.comment   ?? '',
    };
    for (const level of scheme.levels) {
      let raw = editingAnnotation[level.id];
      // Backward compat: old annotations store the task as featureTask, not by level id.
      if (raw === undefined && level.id === taskLevelId) {
        raw = editingAnnotation.featureTask;
      }
      if (level.type === 'select') {
        newForm[level.id] = resolveOptionValue(scheme, level.id, raw, newForm);
      } else {
        newForm[level.id] = raw ?? '';
      }
    }
    setForm(newForm);
    setErrors({});
  }, [editingAnnotation]);

  // Keep the task field in sync with the defaultTask prop (when not editing).
  useEffect(() => {
    if (!editingAnnotation && taskLevelId && defaultTask) {
      setForm((p) => ({
        ...p,
        [taskLevelId]: resolveOptionValue(scheme, taskLevelId, defaultTask, p),
      }));
    }
  }, [defaultTask]);

  // Changes a level's value and resets any levels that depend on it
  // (handles transitive dependencies).
  const handleLevelChange = (level) => (e) => {
    const newValue = e.target.value;
    setForm((p) => {
      const updated = { ...p, [level.id]: newValue };
      const changed = new Set([level.id]);
      let hadChanges = true;
      while (hadChanges) {
        hadChanges = false;
        for (const dep of scheme.levels) {
          if (!changed.has(dep.id) && dep.dependsOn && changed.has(dep.dependsOn)) {
            updated[dep.id] = getFirstOption(scheme, dep.id, updated);
            changed.add(dep.id);
            hadChanges = true;
          }
        }
      }
      return updated;
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.timeStart.trim()) errs.timeStart = 'Required';
    else if (!TIME_REGEX.test(form.timeStart.trim())) errs.timeStart = 'Use H:MM:SS:FF';
    if (!form.timeEnd.trim()) errs.timeEnd = 'Required';
    else if (!TIME_REGEX.test(form.timeEnd.trim())) errs.timeEnd = 'Use H:MM:SS:FF';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    const annotation = {
      id: editingAnnotation?.id ?? Date.now().toString(),
      timeStart: form.timeStart,
      timeEnd:   form.timeEnd,
      comment:   form.comment,
    };

    // Store each level: value under level.id, full label under level.idLabel.
    for (const level of scheme.levels) {
      const value = form[level.id];
      if (level.type === 'select') {
        const opts = getOptionsForLevel(scheme, level.id, form);
        const optLabel = opts.find((o) => o.value === value)?.label ?? value;
        annotation[level.id] = value;
        annotation[`${level.id}Label`] = optLabel;
      } else {
        annotation[level.id] = value;
      }
    }

    // Backward compat: featureTask is used by App.jsx (session save/restore)
    // and by the CSV export layer.
    if (taskLevelId) {
      annotation.featureTask = annotation[`${taskLevelId}Label`] ?? annotation[taskLevelId];
    }

    onSubmit(annotation);

    if (!editingAnnotation) {
      // Reset to defaults but keep the last-used task value.
      const lastTaskValue = form[taskLevelId];
      setForm({ ...buildInitialState(scheme, null), [taskLevelId]: lastTaskValue });
    }
  };

  const isEditing = Boolean(editingAnnotation);

  return (
    <form onSubmit={handleSubmit} noValidate>
      {isEditing && (
        <div className="alert-warn">Editing annotation — update and click Save.</div>
      )}

      <div className="f-row">
        <div>
          <label className="f-label">Time Start</label>
          <input
            className={`f-input mono${errors.timeStart ? ' err' : ''}`}
            value={form.timeStart}
            onChange={(e) => setForm((p) => ({ ...p, timeStart: e.target.value }))}
            placeholder="0:00:00:00"
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

      {renderSchemeFields(scheme, form, handleLevelChange)}

      {scheme.hasComment && (
        <div className="f-field">
          <label className="f-label">
            Comment{' '}
            <span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>
              (optional)
            </span>
          </label>
          <textarea
            className="f-textarea"
            rows={2}
            value={form.comment}
            onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
          />
        </div>
      )}

      <div className="f-actions">
        <button type="submit" className="btn btn-primary">
          {isEditing ? <><Check size={13} /> Save Changes</> : <><Plus size={13} /> Add Annotation</>}
        </button>
        {isEditing && (
          <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>Cancel</button>
        )}
      </div>
    </form>
  );
}

// First two levels share an f-row (two-column grid); subsequent levels are
// each full-width f-field.
function renderSchemeFields(scheme, form, handleLevelChange) {
  const { levels } = scheme;
  const elements = [];
  let i = 0;

  if (levels.length >= 2) {
    elements.push(
      <div key={`${levels[0].id}-${levels[1].id}`} className="f-row">
        {renderLevelControl(scheme, levels[0], form, handleLevelChange)}
        {renderLevelControl(scheme, levels[1], form, handleLevelChange)}
      </div>
    );
    i = 2;
  } else if (levels.length === 1) {
    elements.push(
      <div key={levels[0].id} className="f-field">
        {renderLevelControl(scheme, levels[0], form, handleLevelChange)}
      </div>
    );
    i = 1;
  }

  for (; i < levels.length; i++) {
    elements.push(
      <div key={levels[i].id} className="f-field">
        {renderLevelControl(scheme, levels[i], form, handleLevelChange)}
      </div>
    );
  }

  return elements;
}

function renderLevelControl(scheme, level, form, handleLevelChange) {
  if (level.type === 'select') {
    const options = getOptionsForLevel(scheme, level.id, form);
    return (
      <div key={level.id}>
        <label className="f-label">{level.label}</label>
        <select
          className="f-select"
          value={form[level.id] ?? ''}
          onChange={handleLevelChange(level)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div key={level.id}>
      <label className="f-label">{level.label}</label>
      <input
        type="text"
        className="f-input"
        value={form[level.id] ?? ''}
        onChange={handleLevelChange(level)}
      />
    </div>
  );
}
