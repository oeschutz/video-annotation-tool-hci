import { X, FileText, Flag } from 'lucide-react';
import { timestampToSeconds, DEFAULT_FPS } from '../utils/timecode';

function calcDuration(start, end, durationSeconds = null) {
  const diff = timestampToSeconds(end, DEFAULT_FPS, durationSeconds) - timestampToSeconds(start, DEFAULT_FPS, durationSeconds);
  const fps = DEFAULT_FPS;
  if (diff <= 0) return '—';
  const totalFrames = Math.round(diff * fps);
  const h = Math.floor(totalFrames / (fps * 3600));
  const rem = totalFrames % (fps * 3600);
  const m = Math.floor(rem / (fps * 60));
  const rem2 = rem % (fps * 60);
  const s = Math.floor(rem2 / fps);
  const f = rem2 % fps;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

export default function AnnotationTable({ annotations, onDelete, onEdit, editingId, videoDuration = 0 }) {
  const displayRows = [...annotations].reverse();
  const stateCount = annotations.filter(a => a.type !== 'event').length;
  const eventCount = annotations.filter(a => a.type === 'event').length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 0.25rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ fontSize:'0.72rem', color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            Annotations
          </span>
          <span style={{ fontSize:'0.67rem', color:'var(--text-3)', fontStyle:'italic' }}>
            · click a row to edit
          </span>
        </div>
        <div style={{ display:'flex', gap:'0.3rem' }}>
          {eventCount > 0 && (
            <span style={{
              fontSize:'0.72rem', fontWeight:600,
              background:'rgba(245,158,11,0.12)', color:'#d97706',
              padding:'1px 8px', borderRadius:20,
              border:'1px solid rgba(245,158,11,0.25)',
            }}>{eventCount} evt</span>
          )}
          <span style={{
            fontSize:'0.72rem', fontWeight:600,
            background:'var(--accent-dim)', color:'var(--accent)',
            padding:'1px 8px', borderRadius:20,
            border:'1px solid rgba(99,102,241,0.2)',
          }}>{stateCount}</span>
        </div>
      </div>

      {annotations.length === 0 ? (
        <div className="empty-state">
          <FileText size={28} strokeWidth={1.5} style={{ opacity:0.3, marginBottom:'0.4rem' }} />
          <div className="empty-text">No annotations yet.<br />Load a video and press a shortcut key to annotate.</div>
        </div>
      ) : (
        <div className="tbl-wrap">
          <div className="tbl-scroll">
            <table className="ann-tbl">
              <thead>
                <tr>
                  <th style={{ width:36 }}>#</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Dur</th>
                  <th>Code</th>
                  <th>Comment</th>
                  <th style={{ width:32 }}></th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((ann, i) => {
                  const num = annotations.length - i;
                  const isEvent = ann.type === 'event';

                  if (isEvent) {
                    return (
                      <tr
                        key={ann.id}
                        className={`event-row${editingId === ann.id ? ' editing-row' : ''}`}
                        onClick={() => onEdit?.(ann)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="muted">{num}</td>
                        <td className="mono">{ann.timestamp}</td>
                        <td className="muted">—</td>
                        <td className="muted">—</td>
                        <td>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem' }}>
                            <Flag size={10} color="#d97706" />
                            <span className="badge badge-event">{ann.eventCode}</span>
                          </span>
                        </td>
                        <td className="muted" style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={ann.comment}>
                          {ann.comment || '—'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="tbl-del-btn"
                            onClick={() => window.confirm('Delete this event?') && onDelete(ann.id)}
                            title="Delete"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={ann.id}
                      className={editingId === ann.id ? 'editing-row' : ''}
                      onClick={() => onEdit?.(ann)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="muted">{num}</td>
                      <td className="mono">{ann.timeStart}</td>
                      <td className="mono">{ann.timeEnd}</td>
                      <td className="muted">{calcDuration(ann.timeStart, ann.timeEnd, videoDuration)}</td>
                      <td><span className="badge badge-p">{ann.primaryCode}</span></td>
                      <td className="muted" style={{ maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={ann.comment}>
                        {ann.comment || '—'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          className="tbl-del-btn"
                          onClick={() => window.confirm('Delete this annotation?') && onDelete(ann.id)}
                          title="Delete"
                        >
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
