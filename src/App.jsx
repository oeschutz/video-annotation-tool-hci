import { useState, useCallback, useEffect, useRef } from 'react'
import { Sun, Moon, Upload, Download, Database, Layers } from 'lucide-react'
import VideoPlayer from './components/VideoPlayer'
import AnnotationTable from './components/AnnotationTable'
import EditAnnotationModal from './components/EditAnnotationModal'
import ShortcutLegend from './components/ShortcutLegend'
import SchemePanel from './components/SchemePanel'
import SessionPanel from './components/SessionPanel'
import { exportAnnotationsCsv } from './utils/exportCsv'
import { saveSession, loadSessionByVideo } from './utils/db'
import { parseAnnotationsCsv } from './utils/importCsv'
import { DEFAULT_SCHEME } from './utils/scheme'
import { buildQuickAnnotation } from './utils/shortcutCodes'
import { advanceOneFrame, timestampToSeconds, DEFAULT_FPS } from './utils/timecode'

function loadPersistedScheme() {
  try {
    const raw = localStorage.getItem('vat-scheme')
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_SCHEME
}

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function App() {
  const [annotations, setAnnotations] = useState([])
  const [segmentStart, setSegmentStart] = useState('0:00:00:00')
  const [videoFileName, setVideoFileName] = useState(null)
  const [seekToSeconds, setSeekToSeconds] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('vat-theme') || 'light')
  const [scheme, setScheme] = useState(loadPersistedScheme)
  const [sessionId, setSessionId] = useState(null)
  const [schemePanelOpen, setSchemePanelOpen] = useState(false)
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [editingAnnotation, setEditingAnnotation] = useState(null)
  const csvImportRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vat-theme', theme)
  }, [theme])

  // Auto-save to IndexedDB on state changes
  useEffect(() => {
    if (!videoFileName || !sessionId) return
    saveSession({
      id: sessionId,
      videoName: videoFileName,
      annotations,
      segmentStart,
      schemeId: scheme.name,
    }).catch(console.error)
  }, [annotations, segmentStart, videoFileName, sessionId])

  const handleVideoLoad = useCallback(async (file) => {
    setVideoFileName(file.name)

    // If a session is already loaded (from sessions panel) for this video, just seek
    if (sessionId) {
      const lastState = annotations.filter(a => a.type !== 'event').slice(-1)[0]
      if (lastState?.timeStart) {
        setSeekToSeconds(timestampToSeconds(lastState.timeStart, DEFAULT_FPS, videoDuration))
        setTimeout(() => setSeekToSeconds(null), 500)
      }
      return
    }

    const existing = await loadSessionByVideo(file.name).catch(() => null)
    if (existing && existing.annotations?.length > 0) {
      const resume = window.confirm(
        `Resume previous session for "${file.name}"?\n${existing.annotations.length} annotations saved.`
      )
      if (resume) {
        setSessionId(existing.id)
        setAnnotations(existing.annotations)
        setSegmentStart(existing.segmentStart || '0:00:00:00')
        const lastState = (existing.annotations || []).filter(a => a.type !== 'event').slice(-1)[0]
        if (lastState?.timeStart) {
          setSeekToSeconds(timestampToSeconds(lastState.timeStart, DEFAULT_FPS, videoDuration))
          setTimeout(() => setSeekToSeconds(null), 500)
        }
        return
      }
    }
    // Fresh session
    const newId = generateSessionId()
    setSessionId(newId)
    setAnnotations([])
    setSegmentStart('0:00:00:00')
  }, [sessionId, annotations])

  const handleQuickAnnotate = useCallback((timeEnd, shortcut) => {
    const annotation = buildQuickAnnotation({
      shortcut,
      timeStart: segmentStart,
      timeEnd,
    })
    setAnnotations((prev) => [...prev, annotation])
    setSegmentStart(advanceOneFrame(timeEnd))
  }, [segmentStart])

  const handleDelete = (id) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id))
  }

  const handleEdit = useCallback((annotation) => {
    setEditingAnnotation(annotation)
  }, [])

  const handleEditSave = useCallback((updated) => {
    setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setEditingAnnotation(null)
  }, [])

  const handleEditCancel = useCallback(() => {
    setEditingAnnotation(null)
  }, [])

  const handleExport = () => {
    if (annotations.length === 0) { alert('No annotations to export.'); return }
    const defaultName = videoFileName
      ? videoFileName.replace(/\.[^.]+$/, '') + '.csv'
      : 'annotations.csv'
    const name = window.prompt('Enter filename for CSV export:', defaultName)
    if (!name) return
    exportAnnotationsCsv(annotations, name.endsWith('.csv') ? name : name + '.csv')
  }

  const handleImportCsv = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseAnnotationsCsv(ev.target.result)
      if (parsed.length === 0) { alert('No valid annotations found in CSV.'); return }
      setAnnotations(parsed)
      const lastState = parsed.filter(a => a.type !== 'event').slice(-1)[0]
      if (lastState?.timeEnd) {
        setSegmentStart(advanceOneFrame(lastState.timeEnd))
      }
      if (lastState?.timeStart) {
        setSeekToSeconds(timestampToSeconds(lastState.timeStart, DEFAULT_FPS, videoDuration))
        setTimeout(() => setSeekToSeconds(null), 500)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSchemeLoad = useCallback((newScheme) => {
    setScheme(newScheme)
    try { localStorage.setItem('vat-scheme', JSON.stringify(newScheme)) } catch {}
  }, [])

  const handleSessionLoad = useCallback((session) => {
    setSessionId(session.id)
    setVideoFileName(session.videoName)
    setAnnotations(session.annotations || [])
    setSegmentStart(session.segmentStart || '0:00:00:00')
    setSessionPanelOpen(false)
    // Seek once user loads the video file (handled in handleVideoLoad)
  }, [])

  const handleSessionDelete = useCallback(() => {
    // If the deleted session was current, clear it
    setSessionId(null)
  }, [])

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="app-nav">
        <div className="app-brand">
          <div className="app-brand-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          Video Annotator
        </div>
        <div className="nav-actions">
          <div className="nav-shortcuts d-none d-md-flex">
            <span><kbd>E</kbd>–<kbd>X</kbd> annotate</span>
            <span><kbd>Space</kbd> play/pause</span>
          </div>
          <button
            className="btn-icon"
            onClick={() => setSchemePanelOpen(true)}
            title="Annotation Scheme"
          >
            <Layers size={15} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setSessionPanelOpen(true)}
            title="Sessions"
          >
            <Database size={15} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <input ref={csvImportRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
          <button className="btn btn-ghost" onClick={() => csvImportRef.current?.click()}>
            <Upload size={13} /> Import CSV
          </button>
          <button className="btn btn-success" onClick={handleExport}>
            <Download size={13} /> Export CSV
            {annotations.length > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.25)',
                borderRadius: '10px',
                padding: '0 6px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>{annotations.length}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Main layout */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '0.75rem',
        height: 'calc(100vh - 52px)',
        overflow: 'hidden',
        alignItems: 'flex-start',
      }}>
        <div style={{ flex: '0 0 75%', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <VideoPlayer
            onQuickAnnotate={handleQuickAnnotate}
            segmentStart={segmentStart}
            seekToSeconds={seekToSeconds}
            onVideoLoad={handleVideoLoad}
            onDurationChange={setVideoDuration}
            shortcutsEnabled={!editingAnnotation}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <ShortcutLegend />
          <AnnotationTable
            annotations={annotations}
            onDelete={handleDelete}
            onEdit={handleEdit}
            editingId={editingAnnotation?.id || null}
            videoDuration={videoDuration}
          />
        </div>
      </div>

      <EditAnnotationModal
        open={!!editingAnnotation}
        annotation={editingAnnotation}
        onSubmit={handleEditSave}
        onCancel={handleEditCancel}
      />

      <SchemePanel
        isOpen={schemePanelOpen}
        onClose={() => setSchemePanelOpen(false)}
        currentScheme={scheme}
        onSchemeLoad={handleSchemeLoad}
      />

      <SessionPanel
        isOpen={sessionPanelOpen}
        onClose={() => setSessionPanelOpen(false)}
        currentSessionId={sessionId}
        onSessionLoad={handleSessionLoad}
        onSessionDelete={handleSessionDelete}
      />
    </div>
  )
}

export default App

