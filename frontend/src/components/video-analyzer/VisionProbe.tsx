'use client'

import { useEffect, useState } from 'react'
import { advancePlayhead, pitchDots, timeExtent, VISION_ORIGIN, visionFetch, WHISTLE_FIELDS, whistleProblem, type VisionDoc, type VisionHealth, type WhistleKey } from '@/lib/visionPreview'

type Props = {
  localFile?: File
  currentTime: number
  onClose: () => void
}

export function VisionProbe({ localFile, currentTime, onClose }: Props) {
  const [health, setHealth] = useState<VisionHealth | null>(null)
  const [down, setDown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<VisionDoc | null>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const fileKey = localFile?.name || 'partido'
  const [marks, setMarks] = useState<Partial<Record<WhistleKey, number>>>(() => readMarks(fileKey))
  const [phase, setPhase] = useState('')

  async function ensureServer() {
    try {
      const res = await visionFetch(`${VISION_ORIGIN}/health`)
      if (!res.ok) throw new Error('off')
      const body = (await res.json()) as VisionHealth
      setHealth(body)
      setDown(false)
      return true
    } catch {
      setHealth(null)
      setDown(true)
      return false
    }
  }

  useEffect(() => {
    setMarks(readMarks(fileKey))
  }, [fileKey])

  useEffect(() => {
    try {
      localStorage.setItem(`kabine-vision-whistles:v1:${fileKey}`, JSON.stringify(marks))
    } catch {
      // El navegador puede negar el almacenamiento.
    }
  }, [fileKey, marks])

  useEffect(() => {
    if (!playing || !doc) return
    const id = window.setInterval(() => {
      setT((current) => advancePlayhead(current, doc))
    }, 120)
    return () => window.clearInterval(id)
  }, [playing, doc])

  async function saveMatch() {
    const problem = whistleProblem(marks)
    if (problem) {
      setError(problem)
      return
    }
    if (!localFile) {
      setError('Abre el partido en la mesa antes de guardar el tracking.')
      return
    }
    setBusy(true)
    setError('')
    setPlaying(false)
    setPhase('')
    const ready = await ensureServer()
    if (!ready) {
      setBusy(false)
      return
    }
    try {
      const path = await resolveVideoPath(localFile, setPhase)
      const res = await visionFetch(`${VISION_ORIGIN}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path,
          sample_fps: 10,
          whistles: {
            inicio_1: marks.inicio_1,
            final_1: marks.final_1,
            inicio_2: marks.inicio_2,
            final_partido: marks.final_partido,
          },
        }),
      })
      const started = await res.json().catch(() => ({}))
      if (res.status === 404) throw new Error('El programa de este Mac es el de antes. Ciérralo y vuelve a arrancar python3 scripts/vision_server.py.')
      if (!res.ok) throw new Error(started.error || 'No se pudo guardar el tracking')
      const done = await waitForMatch(path, setPhase)
      if (done.status === 'error') throw new Error(done.error || 'No se pudo guardar el tracking')
      if (!done.document) throw new Error('El tracking se guardó, pero no pude abrirlo en el césped.')
      setDoc(done.document)
      setT(done.document.spans?.[0]?.start_s ?? timeExtent(done.document).start)
      setPlaying(true)
      setPhase('')
    } catch (err) {
      setDoc(null)
      setError(err instanceof Error ? err.message : 'No se pudo guardar el tracking')
    } finally {
      setBusy(false)
    }
  }

  async function runExample() {
    setBusy(true)
    setError('')
    setPlaying(false)
    const ready = await ensureServer()
    if (!ready) {
      setBusy(false)
      return
    }
    try {
      const res = await visionFetch(`${VISION_ORIGIN}/fixture`, { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'No se pudo leer el tramo')
      const next = body as VisionDoc
      setDoc(next)
      setT(timeExtent(next).start)
      setPlaying(true)
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
      className="vd-modal-back vd-vision-back"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="vd-modal vd-vision" onMouseDown={(e) => e.stopPropagation()}>
        <div className="vd-vision-head">
          <h2>Visión</h2>
          <button type="button" className="vd-btn" onClick={onClose}>Cerrar</button>
        </div>
        {doc ? null : (
        <p>
          Marca los cuatro pitidos sobre el vídeo que tienes abierto. El programa guarda el tracking a 10 fotogramas por segundo solo con el balón en juego. Lo deja al lado del partido y también dentro del programa, en este Mac. No hace falta escribir la ruta.
        </p>
        )}

        {down ? <OfflineHelp /> : health ? null : (
          <p className="vd-vision-meta">Al pulsar, el navegador puede pedir permiso para la red local de este PC. Acéptalo.</p>
        )}

        {health && !doc ? (
          <p>
            {health.note} El detector del producto todavía no está en este PC: el ejemplo de abajo es un césped dibujado.
          </p>
        ) : null}

        {doc ? null : (
        <>
        <div className="vd-vision-whistles">
          {WHISTLE_FIELDS.map(([key, label]) => (
            <div className="vd-vision-whistle" key={key}>
              <span>{label}</span>
              <strong>{marks[key] == null ? 'sin marcar' : clock(marks[key] as number)}</strong>
              <button type="button" className="vd-btn" onClick={() => setMarks((current) => ({ ...current, [key]: Math.round(currentTime * 10) / 10 }))}>
                Marcar aquí
              </button>
            </div>
          ))}
        </div>
        <div className="vd-modal-actions">
          <button type="button" className="vd-btn vd-btn-accent" disabled={busy} onClick={() => void saveMatch()}>
            {busy ? 'Guardando…' : 'Guardar tracking'}
          </button>
        </div>
        {phase ? <p className="vd-vision-meta">{phase}</p> : null}
        <p className="vd-vision-meta">Hasta que el detector de jugadores esté en este Mac, las posiciones salen de una lectura de colores. El dato ya se guarda con la forma que usarán los módulos siguientes.</p>
        {localFile ? <p className="vd-vision-meta">Vídeo abierto: {localFile.name}. La primera vez el Mac abre una ventana para señalar ese mismo archivo. Después lo recuerda.</p> : null}
        <div className="vd-modal-actions">
          <button type="button" className="vd-btn" disabled={busy} onClick={() => void runExample()}>
            {busy ? 'Leyendo…' : 'Ver césped de prueba'}
          </button>
        </div>
        </>
        )}

        {error ? <p className="vd-vision-warn">{error}</p> : null}

        {doc ? (
          <div className="vd-vision-result">
            <div className="vd-vision-play">
              <button type="button" className="vd-btn vd-btn-accent" onClick={() => setPlaying((on) => !on)}>
                {playing ? 'Pausa' : 'Reproducir'}
              </button>
              <input
                type="range"
                min={extent.start}
                max={Math.max(extent.start + 0.1, extent.end)}
                step={0.1}
                value={Math.min(extent.end, Math.max(extent.start, t))}
                onChange={(e) => {
                  setPlaying(false)
                  setT(Number(e.target.value))
                }}
              />
              <span className="vd-vision-meta">{t.toFixed(1)} s</span>
            </div>
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
            <p>{doc.preview?.note}</p>
            {doc.preview?.stored_path ? <p className="vd-vision-meta">Al lado del vídeo: {doc.preview.stored_path}</p> : null}
            {doc.preview?.program_path ? <p className="vd-vision-meta">Dentro del programa: {doc.preview.program_path}</p> : null}
            <p className="vd-vision-meta">
              {doc.preview?.sample_fps ? `${doc.preview.sample_fps} fps · ` : ''}
              {doc.preview?.kept_frames ?? 0} fotogramas · {doc.tracks.filter((track) => track.role === 'player').length} jugadores · {doc.physical?.length ?? 0} con metros visibles
            </p>
            <div className="vd-modal-actions">
              <button type="button" className="vd-btn" onClick={() => { setDoc(null); setPlaying(false) }}>
                Volver a los pitidos
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </form>
  )
}

function OfflineHelp() {
  return (
    <p className="vd-vision-warn">
      No llego al programa de este PC. La Terminal tiene que seguir abierta y decir «Visión escuchando en http://127.0.0.1:8765». Si ya volvió el cursor, el programa se paró: arráncalo otra vez y no cierres esa ventana. Luego{' '}
      <a href="http://127.0.0.1:8765/health" target="_blank" rel="noreferrer">abre esta comprobación</a>
      . Si ves {`"ok": true`}, en el candado de Kabine pon Acceso a la red local en Permitir, recarga la página y pulsa otra vez.
    </p>
  )
}

async function resolveVideoPath(file: File, onPhase: (text: string) => void): Promise<string> {
  onPhase('Busco el partido en este Mac.')
  const recall = await visionFetch(`${VISION_ORIGIN}/recall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size }),
  })
  const recalled = await recall.json().catch(() => ({}))
  if (recall.status === 404) throw new Error('El programa de este Mac es el de antes. Ciérralo, actualiza el repo y vuelve a arrancar python3 scripts/vision_server.py.')
  if (!recall.ok) throw new Error(recalled.error || 'No pude buscar el partido en este Mac')
  if (recalled.found && recalled.path) return String(recalled.path)
  onPhase(`Elige «${file.name}» en la ventana del Mac.`)
  await new Promise((resolve) => window.setTimeout(resolve, 30))
  const chosen = await visionFetch(`${VISION_ORIGIN}/choose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size }),
  })
  const picked = await chosen.json().catch(() => ({}))
  if (chosen.status === 404) throw new Error('El programa de este Mac es el de antes. Ciérralo, actualiza el repo y vuelve a arrancar python3 scripts/vision_server.py.')
  if (!chosen.ok) throw new Error(picked.error || 'No pude elegir el partido')
  if (!picked.path) throw new Error('No encuentro ese partido en este Mac.')
  return String(picked.path)
}

function readMarks(fileKey: string): Partial<Record<WhistleKey, number>> {
  try {
    const raw = localStorage.getItem(`kabine-vision-whistles:v1:${fileKey}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<Record<WhistleKey, number>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function clock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

async function waitForMatch(
  videoPath: string,
  onPhase: (text: string) => void,
): Promise<{ status: string; error?: string; document?: VisionDoc }> {
  const deadline = Date.now() + 6 * 60 * 60 * 1000
  while (Date.now() < deadline) {
    const res = await visionFetch(`${VISION_ORIGIN}/match?path=${encodeURIComponent(videoPath)}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'No se pudo leer el tracking')
    const part = body.phase === 'segunda' ? 'segunda parte' : 'primera parte'
    onPhase(body.status === 'running' ? `Leyendo la ${part}. ${body.kept_frames ?? 0} fotogramas. Puedes dejar esta ventana abierta.` : '')
    if (body.status === 'done' || body.status === 'error') return body
    await new Promise((resolve) => window.setTimeout(resolve, 800))
  }
  throw new Error('El tracking sigue en este Mac. El archivo se escribe al lado del partido.')
}
