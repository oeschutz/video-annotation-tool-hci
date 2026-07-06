import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, Volume1, VolumeX,
  FolderOpen, Maximize, Minimize,
  Film,
} from 'lucide-react';

import {
  DEFAULT_FPS,
  formatTimecodeShort,
  frameToSeconds,
  secondsToFrame,
  secondsToTimestamp,
  skipSeconds,
  timestampToSeconds,
} from '../utils/timecode';
import { getShortcutByKey } from '../utils/shortcutCodes';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const IBtn = ({ onClick, children, title, style }) => (
  <button title={title} onClick={onClick} style={{
    background:'none', border:'none', color:'#fff', cursor:'pointer',
    lineHeight:1, padding:'3px 5px', display:'flex', alignItems:'center',
    ...style
  }}>{children}</button>
);

export default function VideoPlayer({ onQuickAnnotate, segmentStart, seekToSeconds, onVideoLoad, onDurationChange, shortcutsEnabled = true }) {
  const videoRef   = useRef(null);
  const fileRef    = useRef(null);
  const theaterRef = useRef(null);
  const hideTimer  = useRef(null);
  const quickAnnotateRef = useRef(null);
  const shortcutsEnabledRef = useRef(shortcutsEnabled);
  const timeInputRef     = useRef(null);
  const skipBlurCommit   = useRef(false);

  const [src, setSrc]             = useState(null);
  const [playing, setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration]   = useState(0);
  const [volume, setVolume]       = useState(1);
  const [muted, setMuted]         = useState(false);
  const [rate, setRate]           = useState(1);
  const [showCtrl, setShowCtrl]   = useState(true);
  const [flash, setFlash]         = useState(null);
  const [fileDrag, setFileDrag]   = useState(false);
  const [speedMenu, setSpeedMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoverPct, setHoverPct]   = useState(null);
  const [editingTime, setEditingTime] = useState(false);
  const [timeInput, setTimeInput] = useState('');

  const loadFile = (file) => {
    if (!file || !file.type.startsWith('video/')) return;
    if (src) URL.revokeObjectURL(src);
    setSrc(URL.createObjectURL(file));
    setCurrentTime(0); setDuration(0);
    onDurationChange?.(0);
    if (onVideoLoad) onVideoLoad(file);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = null;
    const onTime  = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setCurrentTime(v.currentTime);
        raf = null;
      });
    };
    const onMeta  = () => {
      setDuration(v.duration);
      onDurationChange?.(v.duration);
      v.playbackRate = rate;
    };
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onVol   = () => { setVolume(v.volume); setMuted(v.muted); };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('volumechange', onVol);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('volumechange', onVol);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [src, onDurationChange]);

  useEffect(() => {
    const onFS = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);

  useEffect(() => {
    if (seekToSeconds != null && videoRef.current) videoRef.current.currentTime = seekToSeconds;
  }, [seekToSeconds]);

  const showControls = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  const keepControls = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setFlash('play'); } else { v.pause(); setFlash('pause'); }
    setTimeout(() => setFlash(null), 400);
    showControls();
  }, [showControls]);

  const stepFrame = useCallback((direction) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    if (!v.paused) v.pause();
    const frame = secondsToFrame(v.currentTime, DEFAULT_FPS);
    const maxFrame = secondsToFrame(v.duration, DEFAULT_FPS);
    const newFrame = Math.max(0, Math.min(maxFrame, frame + direction));
    const t = frameToSeconds(newFrame, DEFAULT_FPS);
    v.currentTime = t;
    setCurrentTime(t);
    showControls();
  }, [showControls]);

  const doQuickAnnotate = useCallback((shortcutKey) => {
    const v = videoRef.current;
    if (!v || !onQuickAnnotate) return;
    const shortcut = getShortcutByKey(shortcutKey);
    if (!shortcut) return;
    v.pause();
    const timeEnd = secondsToTimestamp(v.currentTime, DEFAULT_FPS);
    onQuickAnnotate(timeEnd, shortcut);
    setFlash(shortcut.label);
    setTimeout(() => setFlash(null), 500);
    showControls();
  }, [onQuickAnnotate, showControls]);

  useEffect(() => {
    quickAnnotateRef.current = doQuickAnnotate;
    shortcutsEnabledRef.current = shortcutsEnabled;
  });

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (!shortcutsEnabledRef.current) return;
      const shortcut = getShortcutByKey(e.key);
      if (shortcut) { e.preventDefault(); quickAnnotateRef.current(e.key); return; }
      if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepFrame(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepFrame(1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [togglePlay, stepFrame]);

  const skip = (secs) => {
    const v = videoRef.current;
    if (!v) return;
    const t = skipSeconds(v.currentTime, secs, DEFAULT_FPS, v.duration || 0);
    v.currentTime = t;
    setCurrentTime(t);
    showControls();
  };

  const seekToTimestamp = useCallback((ts) => {
    const v = videoRef.current;
    if (!v || !ts.trim()) return;
    const t = Math.max(0, Math.min(v.duration || 0, timestampToSeconds(ts.trim(), DEFAULT_FPS, v.duration)));
    v.pause();
    v.currentTime = t;
    setCurrentTime(t);
    showControls();
  }, [showControls]);

  const startTimeEdit = (e) => {
    e.stopPropagation();
    keepControls();
    setTimeInput(formatTimecodeShort(currentTime, DEFAULT_FPS));
    setEditingTime(true);
  };

  const commitTimeEdit = useCallback(() => {
    if (timeInput.trim()) seekToTimestamp(timeInput);
    setEditingTime(false);
  }, [timeInput, seekToTimestamp]);

  const cancelTimeEdit = () => {
    skipBlurCommit.current = true;
    setEditingTime(false);
  };

  useEffect(() => {
    if (editingTime) timeInputRef.current?.select();
  }, [editingTime]);

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  /* ── Drop zone ── */
  if (!src) return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', height:'100%' }}>
      <input ref={fileRef} type="file" accept="video/mp4,video/*" style={{display:'none'}} onChange={e=>loadFile(e.target.files[0])} />
      <div
        className={`drop-zone${fileDrag?' dragging':''}`}
        style={{ flex:1, aspectRatio:'unset' }}
        onDragOver={e=>{e.preventDefault();setFileDrag(true);}}
        onDragLeave={()=>setFileDrag(false)}
        onDrop={e=>{e.preventDefault();setFileDrag(false);loadFile(e.dataTransfer.files[0]);}}
        onClick={()=>fileRef.current?.click()}
      >
        <Film size={40} strokeWidth={1.5} style={{ marginBottom:'0.5rem', opacity:0.5 }} />
        <div className="dz-title">Drop video to begin</div>
        <div className="dz-hint">or click to browse</div>
        <button className="btn btn-primary" style={{marginTop:'0.75rem'}} onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>
          <FolderOpen size={13} /> Load Video
        </button>
      </div>
    </div>
  );

  /* ── YouTube-style player ── */
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#000', borderRadius:8, overflow:'hidden' }}>
      <input ref={fileRef} type="file" accept="video/mp4,video/*" style={{display:'none'}} onChange={e=>loadFile(e.target.files[0])} />

      <div
        ref={theaterRef}
        style={{ flex:1, position:'relative', background:'#000', cursor: showCtrl?'default':'none' }}
        onMouseMove={showControls}
        onMouseLeave={() => playing && setShowCtrl(false)}
        onDragOver={e=>{e.preventDefault();setFileDrag(true);}}
        onDragLeave={()=>setFileDrag(false)}
        onDrop={e=>{e.preventDefault();setFileDrag(false);loadFile(e.dataTransfer.files[0]);}}
      >
        <video
          ref={videoRef} src={src} preload="auto" playsInline
          onClick={togglePlay}
          style={{ width:'100%', height:'100%', display:'block', objectFit:'contain', cursor:'pointer' }}
        />

        {/* Flash */}
        {flash && (
          <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
            <div className={flash === 'play' || flash === 'pause' ? 'yt-flash' : 'yt-flash-label'}>
              {flash === 'play' ? <Play size={28} fill="#fff" /> :
               flash === 'pause' ? <Pause size={28} fill="#fff" /> :
               flash}
            </div>
          </div>
        )}

        {/* File drag overlay */}
        {fileDrag && (
          <div style={{ position:'absolute',inset:0,background:'rgba(99,102,241,0.45)',display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none',fontWeight:600,color:'#fff',fontSize:'1rem' }}>
            Drop to replace video
          </div>
        )}

        {/* Controls overlay */}
        <div
          className="yt-controls"
          style={{ opacity: showCtrl ? 1 : 0, pointerEvents: showCtrl ? 'auto' : 'none' }}
          onMouseEnter={keepControls}
        >
          {/* Progress bar */}
          <div
            className="yt-progress-wrap"
            onClick={seek}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverPct(Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))*100);
            }}
            onMouseLeave={() => setHoverPct(null)}
          >
            <div className="yt-progress-track">
              <div className="yt-progress-fill" style={{ width:`${progress}%` }} />
              {hoverPct !== null && <div className="yt-progress-hover" style={{ width:`${hoverPct}%` }} />}
              <div className="yt-progress-thumb" style={{ left:`${progress}%` }} />
            </div>
          </div>

          {/* Bar */}
          <div className="yt-bar">
            <div style={{ display:'flex',alignItems:'center',gap:2 }}>
              <IBtn onClick={togglePlay} title={playing?'Pause (Space)':'Play (Space)'}>
                {playing ? <Pause size={20} fill="#fff" /> : <Play size={20} fill="#fff" />}
              </IBtn>
              <IBtn onClick={()=>skip(-10)} title="−10s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 5px'}}>
                <span style={{fontSize:11}}>−10s</span>
              </IBtn>
              <IBtn onClick={()=>skip(-5)} title="−5s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 4px'}}>
                <span style={{fontSize:11}}>−5s</span>
              </IBtn>
              <IBtn onClick={()=>skip(-1)} title="−1s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 4px'}}>
                <span style={{fontSize:11}}>−1s</span>
              </IBtn>
              <IBtn onClick={()=>skip(1)} title="+1s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 4px'}}>
                <span style={{fontSize:11}}>+1s</span>
              </IBtn>
              <IBtn onClick={()=>skip(5)} title="+5s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 4px'}}>
                <span style={{fontSize:11}}>+5s</span>
              </IBtn>
              <IBtn onClick={()=>skip(10)} title="+10s" style={{fontSize:11,color:'rgba(255,255,255,0.75)',padding:'3px 5px'}}>
                <span style={{fontSize:11}}>+10s</span>
              </IBtn>
              <IBtn onClick={()=>{const v=videoRef.current;if(v)v.muted=!v.muted;}} title="Toggle mute">
                <VolIcon size={17} />
              </IBtn>
              <input
                type="range" min={0} max={1} step={0.02}
                value={muted ? 0 : volume}
                onChange={e=>{ const v=videoRef.current; const val=parseFloat(e.target.value); if(v){v.volume=val;v.muted=val===0;} }}
                className="yt-vol-slider"
              />
              <span className="yt-time">
                {editingTime ? (
                  <input
                    ref={timeInputRef}
                    className="yt-time-input"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') { e.preventDefault(); commitTimeEdit(); }
                      if (e.key === 'Escape') { e.preventDefault(); cancelTimeEdit(); }
                    }}
                    onBlur={() => {
                      if (skipBlurCommit.current) { skipBlurCommit.current = false; return; }
                      commitTimeEdit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    title="M:SS:FF or H:MM:SS:FF — press Enter"
                  />
                ) : (
                  <button type="button" className="yt-time-btn" onClick={startTimeEdit} title="Click to seek to timestamp">
                    {formatTimecodeShort(currentTime, DEFAULT_FPS)}
                  </button>
                )}
                {' / '}
                {formatTimecodeShort(duration, DEFAULT_FPS)}
              </span>
            </div>

            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <span className="yt-seg-badge">{segmentStart}</span>

              {/* Speed */}
              <div style={{ position:'relative' }}>
                <button className="yt-pill-btn" onClick={()=>{ setSpeedMenu(s=>!s); keepControls(); }}>
                  {rate}×
                </button>
                {speedMenu && (
                  <div className="yt-speed-menu" onMouseEnter={keepControls}>
                    <div className="yt-speed-label">Playback speed</div>
                    {SPEEDS.map(r=>(
                      <button key={r} className={`yt-speed-opt${r===rate?' active':''}`}
                        onClick={()=>{setRate(r);if(videoRef.current)videoRef.current.playbackRate=r;setSpeedMenu(false);}}>
                        {r === 1 ? 'Normal' : `${r}×`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <IBtn onClick={()=>fileRef.current?.click()} title="Load video">
                <FolderOpen size={16} />
              </IBtn>
              <IBtn onClick={()=>{ const el=theaterRef.current; if(!document.fullscreenElement)el?.requestFullscreen();else document.exitFullscreen(); }} title="Fullscreen">
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </IBtn>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
