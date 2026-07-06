export {
  DEFAULT_FPS,
  secondsToTimestamp,
  timestampToSeconds,
} from './timecode.js';

export function exportAnnotationsCsv(annotations, filename = 'annotations.csv') {
  // Rows with type='event' are point annotations; all others are duration-coded states.
  // CSV format: Type,Time Start,Time End,Code,Comment
  const header = 'Type,Time Start,Time End,Code,Comment';
  const rows = annotations.map(a => {
    const comment = (a.comment || '').replace(/,/g, ';'); // escape commas in comments
    if (a.type === 'event') {
      return `event,${a.timestamp},,${a.eventLabel || a.eventCode || ''},${comment}`;
    }
    const primaryLabel = a.primaryCodeLabel ?? a.primaryLabel ?? '';
    return `state,${a.timeStart},${a.timeEnd},${primaryLabel},${comment}`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
