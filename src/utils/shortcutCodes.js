// One-key annotation shortcuts. Press a key while watching to end the current
// segment and immediately log the matching code.
export const ANNOTATION_SHORTCUTS = [
  { key: 'E', label: 'Edit Code (manually)', code: 'E' },
  { key: 'A', label: 'AI Autocomplete', code: 'A' },
  { key: 'W', label: 'Write Prompt', code: 'W' },
  { key: 'B', label: 'Backtrack Writing Prompt', code: 'B' },
  { key: 'O', label: 'Navigate AI Output', code: 'O' },
  { key: 'P', label: 'Navigate to Past Prompts', code: 'P' },
  { key: 'F', label: 'Navigate File Explorer', code: 'F' },
  { key: 'C', label: 'Navigate Code Editor', code: 'C' },
  { key: 'I', label: 'Interact With App', code: 'I' },
  { key: 'V', label: 'View App', code: 'V' },
  { key: 'D', label: 'Scroll Through Diffs', code: 'D' },
  { key: 'Z', label: 'Backtrack (Undo Changes)', code: 'Z' },
  { key: 'K', label: 'Move Mouse Over AI Output', code: 'K' },
  { key: 'H', label: 'Move Mouse Over File Explorer', code: 'H' },
  { key: 'J', label: 'Move Mouse Over Code Editor', code: 'J' },
  { key: 'L', label: 'Resize Windows / Change Layout', code: 'L' },
  { key: 'Y', label: 'Accept AI Response', code: 'Y' },
  { key: 'N', label: 'Nothing', code: 'N' },
  { key: 'X', label: 'Other/Review Later', code: 'X' },
];

const SHORTCUT_BY_KEY = Object.fromEntries(
  ANNOTATION_SHORTCUTS.map((s) => [s.key.toLowerCase(), s])
);

export function getShortcutByKey(key) {
  return SHORTCUT_BY_KEY[key?.toLowerCase()] ?? null;
}

export function buildQuickAnnotation({ shortcut, timeStart, timeEnd }) {
  return {
    id: Date.now().toString(),
    timeStart,
    timeEnd,
    primaryCode: shortcut.code,
    primaryCodeLabel: shortcut.label,
    primaryLabel: shortcut.label,
    comment: '',
  };
}
