function headerIncludes(headerCols, name) {
  return headerCols.some((h) => h.trim().toLowerCase().includes(name));
}

export function parseAnnotationsCsv(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headerCols = parseCSVLine(lines[0]);
  const hasTypeCol = headerCols[0].trim().toLowerCase() === 'type';
  const legacyWideFormat = hasTypeCol
    ? headerIncludes(headerCols, 'secondary')
    : headerCols.length >= 6;
  const rows = lines.slice(1);

  return rows.map((line, i) => {
    const cols = parseCSVLine(line);

    if (hasTypeCol) {
      const [type = 'state', col1 = '', col2 = '', col3 = '', col4 = '', col5 = '', col6 = ''] = cols;
      const rowType = type.trim().toLowerCase();

      if (rowType === 'event') {
        const eventLabel = col3.trim();
        const eventCode = eventLabel.split(/\s[—–-]\s/)[0].split(' ')[0].trim();
        return {
          id: `imported-${Date.now()}-${i}`,
          type: 'event',
          timestamp: col1.trim(),
          eventCode,
          eventLabel,
          comment: (legacyWideFormat ? col6 : col4).trim(),
        };
      }

      const primaryLabel = col3.trim();
      return {
        id: `imported-${Date.now()}-${i}`,
        timeStart: col1.trim(),
        timeEnd: col2.trim(),
        primaryCode: primaryLabel.split(' ')[0].trim(),
        primaryLabel,
        primaryCodeLabel: primaryLabel,
        comment: (legacyWideFormat ? col6 : col4).trim(),
      };
    }

    if (legacyWideFormat) {
      const [timeStart = '', timeEnd = '', primaryLabel = '', , , comment = ''] = cols;
      return {
        id: `imported-${Date.now()}-${i}`,
        timeStart: timeStart.trim(),
        timeEnd: timeEnd.trim(),
        primaryCode: primaryLabel.split(' ')[0].trim(),
        primaryLabel: primaryLabel.trim(),
        primaryCodeLabel: primaryLabel.trim(),
        comment: comment.trim(),
      };
    }

    const [timeStart = '', timeEnd = '', primaryLabel = '', comment = ''] = cols;
    return {
      id: `imported-${Date.now()}-${i}`,
      timeStart: timeStart.trim(),
      timeEnd: timeEnd.trim(),
      primaryCode: primaryLabel.split(' ')[0].trim(),
      primaryLabel: primaryLabel.trim(),
      primaryCodeLabel: primaryLabel.trim(),
      comment: comment.trim(),
    };
  }).filter(a => {
    if (a.type === 'event') return !!a.timestamp;
    return !!(a.timeStart && a.timeEnd);
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
