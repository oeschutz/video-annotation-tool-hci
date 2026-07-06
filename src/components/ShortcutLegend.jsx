import { ANNOTATION_SHORTCUTS } from '../utils/shortcutCodes';

export default function ShortcutLegend() {
  return (
    <div className="shortcut-legend">
      <div className="shortcut-legend-hd">Keyboard shortcuts</div>
      <div className="shortcut-legend-grid">
        {ANNOTATION_SHORTCUTS.map((s) => (
          <div key={s.key} className="shortcut-item">
            <kbd>{s.key}</kbd>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
