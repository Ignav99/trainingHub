'use client'

import { useEffect, useState } from 'react'
import { fileFitsPreview, pitchDots, spanLabel, timeExtent, VISION_ORIGIN, type VisionDoc, type VisionHealth } from '@/lib/visionPreview'

type Props = {
  localFile?: File
  currentTime: number
  onClose: () => void
}

export function VisionProbe({ localFile, currentTime, onClose }: Props) {
  const [health, setHealth] = useState<VisionHealth | null>(null)
  const [down, setDown] = useState(false)
  const [seconds, setSeconds] = useState(5)
  const [frames, setFrames] = useState('')
  const [stride, setStride] = useState(6)
  const [startS, setStartS] = useState(() => Math.max(0, Math.round(currentTime * 10) / 10))
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<VisionDoc | null>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`${VISION_ORIGIN}/health`)
      .then((res) => res.json())
      .then((body: VisionHealth) => {
        if (!cancelled) setHealth(body)
      })
      .catch(() => {
        if (!cancelled) setDown(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!playing || !doc) return
    const extent = timeExtent(doc)
    const id = window.setInterval(() => {
      setT((current) => (current + 0.1 >= extent.end ? extent.start : Math.round((current + 0.1) * 10) / 10))
    }, 120)
    return () => window.clearInterval(id)
  }, [playing, doc])

  const frameCap = frames.trim() === '' ? null : Number(frames)
  const tooBig = Boolean(localFile && !fileFitsPreview(localFile.size))

  async function run(kind: 'fixture' | 'file' | 'path') {
    setBusy(true)
    setError('')
    setPlaying(false)
    try {
      const res = await requestPreview(kind, {
        startS,
        seconds,
        frames: frameCap,
        stride,
        file: localFile,
        path,
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo leer el tramo')
      const next = body as VisionDoc
      setDoc(next)
      setT(timeExtent(next).start)
    } catch (err) {
      setDoc(null)
      setError(err instanceof Error ? err.message : 'No se pudo leer el tramo')
    } finally {
      setBusy(false)
    }
  }

  const dots = doc ? pitchDots(doc, t) : []
  const extent = doc ? timeExtent(doc) : { start: 0, end: 0 }

  return (
    <form
      className="vd-modal-back"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="vd-modal vd-vision" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Probar Visión</h2>
        <p>
          Elige unos segundos, unos fotogramas, o un vídeo de hasta 40 MB. El programa corre en este PC y el partido no se sube.
        </p>

        {down ? (
          <p className="vd-vision-warn">
            En este PC todavía no está arrancado. Desde la carpeta del proyecto: python3 scripts/vision_server.py. Antes, si falta la librería de vídeo: python3 -m pip install --only-binary=:all: opencv-python-headless numpy
          </p>
        ) : null}

        {health ? (
          <p>
            {health.note} El detector del producto todavía no está en este PC: el ejemplo de abajo es un césped dibujado.
          </p>
        ) : null}

        <div className="vd-vision-grid">
          <label>
            Desde (s)
            <input type="number" min={0} step={0.1} value={startS} onChange={(e) => setStartS(Number(e.target.value))} />
          </label>
          <label>
            Segundos
            <input type="number" min={0.2} step={0.5} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
          </label>
          <label>
            Fotogramas
            <input
              inputMode="numeric"
              placeholder="opcional"
              value={frames}
              onChange={(e) => setFrames(e.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
          <label>
            Uno de cada
            <input type="number" min={1} step={1} value={stride} onChange={(e) => setStride(Number(e.target.value))} />
          </label>
        </div>
        <p className="vd-vision-meta">{spanLabel(seconds, frameCap != null && frameCap > 0 ? frameCap : null, stride)}</p>

        <div className="vd-modal-actions">
          <button type="button" className="vd-btn" onClick={onClose}>Cerrar</button>
          <button type="button" className="vd-btn vd-btn-accent" disabled={busy || down} onClick={() => void run('fixture')}>
            {busy ? 'Leyendo…' : 'Ver ejemplo de 2 s'}
          </button>
          <button
            type="button"
            className="vd-btn"
            disabled={busy || down || !localFile || tooBig}
            title={tooBig ? 'Pasa de 40 MB. Recorta un trozo o usa un vídeo de pocos megas.' : 'Lee el vídeo que tienes abierto, si pesa 40 MB como mucho.'}
            onClick={() => void run('file')}
          >
            Analizar este vídeo
          </button>
        </div>

        {tooBig ? <p className="vd-vision-warn">Este archivo pasa de 40 MB. Para la prueba usa un recorte de pocos megas, o limita los segundos cuando el vídeo ya está en el disco.</p> : null}

        <label>
          Ruta en este PC
          <input
            value={path}
            placeholder="~/Desktop/prueba2.mp4"
            onChange={(e) => setPath(e.target.value)}
          />
        </label>
        <div className="vd-modal-actions">
          <button type="button" className="vd-btn" disabled={busy || down || path.trim() === ''} onClick={() => void run('path')}>
            Analizar esa ruta
          </button>
        </div>

        {error ? <p className="vd-vision-warn">{error}</p> : null}

        {doc ? (
          <div className="vd-vision-result">
            <p>{doc.preview?.note}</p>
            <p className="vd-vision-meta">
              {doc.preview?.kept_frames ?? 0} fotogramas · {doc.tracks.filter((track) => track.role === 'player').length} jugadores · {doc.physical?.length ?? 0} con metros visibles
            </p>
            <svg className="vd-vision-pitch" viewBox="0 0 105 68" role="img" aria-label="Césped del tramo">
              <rect className="vd-vision-grass" x="0" y="0" width="105" height="68" />
              <line x1="52.5" y1="0" x2="52.5" y2="68" />
              <circle cx="52.5" cy="34" r="9" fill="none" />
              <rect x="0" y="14" width="16" height="40" fill="none" />
              <rect x="89" y="14" width="16" height="40" fill="none" />
              {dots.map((dot) => (
                <g key={dot.id} className={`vd-vision-dot vd-vision-dot-${dot.kind}`}>
                  <circle cx={dot.x * 105} cy={dot.y * 68} r={dot.kind === 'ball' ? 1.3 : 1.8} />
                </g>
              ))}
            </svg>
            <div className="vd-vision-play">
              <button type="button" className="vd-btn" onClick={() => setPlaying((on) => !on)}>
                {playing ? 'Pausa' : 'Reproducir'}
              </button>
              <input
                type="range"
                min={extent.start}
                max={extent.end}
                step={0.1}
                value={Math.min(extent.end, Math.max(extent.start, t))}
                onChange={(e) => {
                  setPlaying(false)
                  setT(Number(e.target.value))
                }}
              />
              <span className="vd-vision-meta">{t.toFixed(1)} s</span>
            </div>
            <ul className="vd-vision-metres">
              {(doc.physical ?? []).map((row) => (
                <li key={row.track_id}>
                  Jugador {row.track_id}: {row.visible_m.toFixed(2)} m · {row.note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </form>
  )
}

async function requestPreview(
  kind: 'fixture' | 'file' | 'path',
  input: { startS: number; seconds: number; frames: number | null; stride: number; file?: File; path: string },
): Promise<Response> {
  if (kind === 'fixture') return fetch(`${VISION_ORIGIN}/fixture`, { method: 'POST' })
  if (kind === 'file' && input.file) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Start-S': String(input.startS),
      'X-Seconds': String(input.seconds),
      'X-Stride': String(Math.max(1, input.stride)),
    }
    if (input.frames != null && input.frames > 0) headers['X-Frames'] = String(input.frames)
    return fetch(`${VISION_ORIGIN}/preview-file`, { method: 'POST', headers, body: input.file })
  }
  return fetch(`${VISION_ORIGIN}/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: input.path,
      start_s: input.startS,
      seconds: input.seconds,
      frames: input.frames != null && input.frames > 0 ? input.frames : null,
      stride: input.stride,
    }),
  })
}
