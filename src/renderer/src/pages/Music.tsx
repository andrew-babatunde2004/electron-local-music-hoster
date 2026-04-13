import './Music.css'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

interface Song {
  id: string
  title: string
  artist: string
  src: string
}

type SourceMode = 'api' | 'local'

function Music(): React.JSX.Element {
  const [mode, setMode] = useState<SourceMode>('api')
  const [apiUrl, setApiUrl] = useState('')
  const [apiInput, setApiInput] = useState('')
  const [folderName, setFolderName] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [durations, setDurations] = useState<Record<string, number>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Play/pause on state change
  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch(console.error)
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, currentSong])

  const connectApi = async (): Promise<void> => {
    const url = apiInput.trim()
    if (!url) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(url)
      const raw: { id?: string; title?: string; artist?: string; audioUrl?: string }[] = res.data
      const mapped: Song[] = raw.map((s, i) => ({
        id: s.id ?? String(i),
        title: s.title ?? `Track ${i + 1}`,
        artist: s.artist ?? 'Unknown Artist',
        src: s.audioUrl ?? ''
      }))
      setSongs(mapped)
      setApiUrl(url)
      setMode('api')
      setCurrentSong(null)
      setIsPlaying(false)
    } catch {
      setError('Could not connect. Check the URL and that your server is running.')
    } finally {
      setLoading(false)
    }
  }

  const openLocalFolder = async (): Promise<void> => {
    const folderPath = await window.api.openFolder()
    if (!folderPath) return
    setLoading(true)
    setError('')
    const parts = folderPath.replace(/\\/g, '/').split('/')
    setFolderName(parts[parts.length - 1])
    const files = await window.api.getMusicFiles(folderPath)
    const mapped: Song[] = files.map((f) => ({
      id: f.id,
      title: f.title,
      artist: f.artist,
      src: toFileUrl(f.path)
    }))
    setSongs(mapped)
    setMode('local')
    setCurrentSong(null)
    setIsPlaying(false)
    setDurations({})
    setLoading(false)
  }

  const toFileUrl = (path: string): string => {
    const p = path.replace(/\\/g, '/')
    return p.startsWith('/') ? `file://${p}` : `file:///${p}`
  }

  const handleSongSelect = (song: Song): void => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying)
    } else {
      setCurrentSong(song)
      setIsPlaying(true)
      setCurrentTime(0)
    }
  }

  const handleTimeUpdate = (): void => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
    const d = audioRef.current.duration
    if (!isNaN(d) && d > 0) {
      setDuration(d)
      if (currentSong) setDurations((p) => ({ ...p, [currentSong.id]: d }))
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const t = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = t
      setCurrentTime(t)
    }
  }

  const fmt = (s: number): string => {
    if (!s || isNaN(s)) return '--:--'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  const handlePrev = (): void => {
    if (!currentSong) return
    const i = songs.findIndex((s) => s.id === currentSong.id)
    setCurrentSong(songs[i > 0 ? i - 1 : songs.length - 1])
    setIsPlaying(true)
    setCurrentTime(0)
  }

  const handleNext = (): void => {
    if (!currentSong) return
    if (repeat && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(console.error)
      return
    }
    const i = songs.findIndex((s) => s.id === currentSong.id)
    const next = shuffle
      ? Math.floor(Math.random() * songs.length)
      : i < songs.length - 1 ? i + 1 : 0
    setCurrentSong(songs[next])
    setIsPlaying(true)
    setCurrentTime(0)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const initial = (name: string): string => name.trim().charAt(0).toUpperCase() || '♪'

  const sourceLabel = mode === 'api'
    ? (apiUrl ? new URL(apiUrl).host : '')
    : folderName

  return (
    <div className="ml-layout">

      {/* ── SIDEBAR ── */}
      <aside className="ml-sidebar">

        {/* Source switcher */}
        <div className="ml-source-panel">
          <div className="ml-tabs">
            <button
              className={`ml-tab ${mode === 'api' ? 'ml-tab--on' : ''}`}
              onClick={() => setMode('api')}
            >
              Network
            </button>
            <button
              className={`ml-tab ${mode === 'local' ? 'ml-tab--on' : ''}`}
              onClick={() => setMode('local')}
            >
              Local
            </button>
          </div>

          {mode === 'api' ? (
            <div className="ml-api-form">
              <input
                className="ml-api-input"
                type="text"
                placeholder="http://192.168.x.x:PORT/songs"
                value={apiInput}
                onChange={(e) => setApiInput(e.target.value)}
                onPaste={(e) => setApiInput(e.clipboardData.getData('text'))}
                onKeyDown={(e) => e.key === 'Enter' && connectApi()}
              />
              <button
                className="ml-connect-btn"
                onClick={connectApi}
                disabled={loading}
              >
                {loading ? '…' : 'Connect'}
              </button>
              {error && <p className="ml-error">{error}</p>}
            </div>
          ) : (
            <button className="ml-local-btn" onClick={openLocalFolder}>
              Browse folder
            </button>
          )}
        </div>

        {/* Now playing */}
        <div className="ml-nowplaying">
          <AnimatePresence mode="wait">
            {currentSong ? (
              <motion.div
                key={currentSong.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.25 }}
                className="ml-np"
              >
                <div className={`ml-np-art ${isPlaying ? 'ml-np-art--pulse' : ''}`}>
                  <span>{initial(currentSong.title)}</span>
                </div>
                <p className="ml-np-title">{currentSong.title}</p>
                <p className="ml-np-artist">{currentSong.artist}</p>
                {isPlaying && (
                  <div className="ml-bars">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="ml-bar" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-np ml-np--idle"
              >
                <div className="ml-np-art ml-np-art--empty">
                  <span>♪</span>
                </div>
                <p className="ml-np-hint">Nothing playing</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </aside>

      {/* ── MAIN ── */}
      <main className="ml-main">
        <div className="ml-header">
          <div>
            <h1 className="ml-title">
              {sourceLabel || 'Library'}
            </h1>
            {songs.length > 0 && (
              <span className="ml-count">{songs.length} tracks</span>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="ml-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="ml-spinner" />
            </motion.div>
          ) : songs.length === 0 ? (
            <motion.div key="empty" className="ml-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <p className="ml-state-text">
                {mode === 'api'
                  ? 'Enter your server URL and hit Connect'
                  : 'Select a folder to load tracks'}
              </p>
            </motion.div>
          ) : (
            <motion.div key="list" className="ml-list-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="ml-list-head">
                <span className="ml-lh ml-lh--num">#</span>
                <span className="ml-lh">Title</span>
                <span className="ml-lh">Artist</span>
                <span className="ml-lh ml-lh--dur">Duration</span>
              </div>
              <div className="ml-list">
                {songs.map((song, idx) => {
                  const active = currentSong?.id === song.id
                  const playing = active && isPlaying
                  return (
                    <motion.div
                      key={song.id}
                      className={`ml-row ${active ? 'ml-row--active' : ''}`}
                      onClick={() => handleSongSelect(song)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.5) }}
                    >
                      <span className="ml-row-num">
                        {playing
                          ? <span className="ml-dot" />
                          : idx + 1}
                      </span>
                      <span className="ml-row-title">{song.title}</span>
                      <span className="ml-row-artist">{song.artist}</span>
                      <span className="ml-row-dur">
                        {durations[song.id] ? fmt(durations[song.id]) : '--:--'}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── PLAYER ── */}
      <AnimatePresence>
        {currentSong && (
          <motion.footer
            className="ml-player"
            initial={{ y: 90 }}
            animate={{ y: 0 }}
            exit={{ y: 90 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <audio
              ref={audioRef}
              src={currentSong.src}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleTimeUpdate}
              onEnded={handleNext}
            />

            <div className="ml-player-info">
              <div className="ml-player-art">{initial(currentSong.title)}</div>
              <div className="ml-player-meta">
                <p className="ml-player-song">{currentSong.title}</p>
                <p className="ml-player-artist">{currentSong.artist}</p>
              </div>
            </div>

            <div className="ml-player-center">
              <div className="ml-controls">
                <button className={`ml-ctrl ${shuffle ? 'ml-ctrl--on' : ''}`} onClick={() => setShuffle(!shuffle)} title="Shuffle">⇄</button>
                <button className="ml-ctrl" onClick={handlePrev} title="Previous">⏮</button>
                <button className="ml-ctrl ml-ctrl--play" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button className="ml-ctrl" onClick={handleNext} title="Next">⏭</button>
                <button className={`ml-ctrl ${repeat ? 'ml-ctrl--on' : ''}`} onClick={() => setRepeat(!repeat)} title="Repeat">↻</button>
              </div>
              <div className="ml-progress">
                <span className="ml-time">{fmt(currentTime)}</span>
                <div className="ml-bar-track">
                  <div className="ml-bar-fill" style={{ width: `${progress}%` }} />
                  <input
                    type="range"
                    className="ml-seek"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                  />
                </div>
                <span className="ml-time">{fmt(duration)}</span>
              </div>
            </div>

            <div className="ml-vol">
              <span className="ml-vol-icon">🔊</span>
              <div className="ml-vol-track">
                <div className="ml-vol-fill" style={{ width: `${volume * 100}%` }} />
                <input
                  type="range"
                  className="ml-seek"
                  min={0} max={1} step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                />
              </div>
              <span className="ml-vol-pct">{Math.round(volume * 100)}</span>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Music
