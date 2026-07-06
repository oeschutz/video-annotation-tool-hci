export const DEFAULT_FPS = 30;

export function frameDuration(fps = DEFAULT_FPS) {
  return 1 / fps;
}

export function secondsToFrame(totalSeconds, fps = DEFAULT_FPS) {
  return Math.max(0, Math.round(totalSeconds * fps));
}

export function frameToSeconds(frame, fps = DEFAULT_FPS) {
  return frame / fps;
}

export function skipSeconds(totalSeconds, deltaSeconds, fps = DEFAULT_FPS, maxSeconds = Infinity) {
  const currentFrame = secondsToFrame(totalSeconds, fps);
  const maxFrame = Number.isFinite(maxSeconds) ? secondsToFrame(maxSeconds, fps) : Infinity;
  const newFrame = Math.max(0, Math.min(maxFrame, currentFrame + deltaSeconds * fps));
  return frameToSeconds(newFrame, fps);
}

export function secondsToTimestamp(totalSeconds, fps = DEFAULT_FPS) {
  const totalFrames = secondsToFrame(totalSeconds, fps);
  const h = Math.floor(totalFrames / (fps * 3600));
  const rem = totalFrames % (fps * 3600);
  const m = Math.floor(rem / (fps * 60));
  const rem2 = rem % (fps * 60);
  const s = Math.floor(rem2 / fps);
  const f = rem2 % fps;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export function timestampToSeconds(ts, fps = DEFAULT_FPS, durationSeconds = null) {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 4) {
    const [h, m, s, f] = parts;
    return (h * 3600 * fps + m * 60 * fps + s * fps + f) / fps;
  }
  if (parts.length === 3) {
    const useHourFormat = durationSeconds != null && durationSeconds >= 3600;
    if (useHourFormat) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    const [m, s, f] = parts;
    return (m * 60 * fps + s * fps + f) / fps;
  }
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(ts) || 0;
}

export function formatTimecodeShort(totalSeconds, fps = DEFAULT_FPS) {
  const full = secondsToTimestamp(totalSeconds, fps);
  const [h, ...rest] = full.split(':');
  return h === '0' ? rest.join(':') : full;
}

export function advanceOneFrame(timestamp, fps = DEFAULT_FPS) {
  return secondsToTimestamp(timestampToSeconds(timestamp, fps) + frameDuration(fps), fps);
}
