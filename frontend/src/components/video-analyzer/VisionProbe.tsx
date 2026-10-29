'use client'

import { useEffect, useRef, useState } from 'react'
import { convocatoriasApi } from '@/lib/api/convocatorias'
import { partidosApi } from '@/lib/api/partidos'
import { parseNotasPre } from '@/lib/anotador'
import { advancePlayhead, dorsalsFromConvocatoria, formatDorsalList, normalizeHex, parseDorsalList, pitchDots, timeExtent, VISION_ORIGIN, visionFetch, WHISTLE_FIELDS, whistleProblem, type VisionDoc, type VisionHealth, type WhistleKey } from '@/lib/visionPreview'

type Props = {
  localFile?: File
  partidoId?: string
  currentTime: number
  onClose: () => void
}

type KitDraft = {
  ours: string
  rival: string
  oursDorsals: string
  rivalDorsals: string
}

const OURS_FALLBACK = '#f4f1e6'
const RIVAL_FALLBACK = '#1a365d'

const BLANK_KITS: KitDraft = {
  ours: OURS_FALLBACK,
  rival: RIVAL_FALLBACK,
  oursDorsals: '',
  rivalDorsals: '',
}

export function VisionProbe({ localFile, partidoId, currentTime, onClose }: Props) {
  const [health, setHealth] = useState<VisionHealth | null>(null)
  const [down, setDown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<VisionDoc | null>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const fileKey = localFile?.name || 'partido'
  const [marks, setMarks] = useState<Partial<Record<WhistleKey, number>>>(() => readMarks(fileKey))
  const [kits, setKits] = useState<KitDraft>(() => readKits(fileKey) ?? BLANK_KITS)
  const [acta, setActa] = useState<{ ours: number[]; rival: number[] } | null>(null)
  const [actaState, setActaState] = useState('')
  const [phase, setPhase] = useState('')
  const kitsTouched = useRef(false)

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
    const stored = readKits(fileKey)
    kitsTouched.current = stored != null
    setKits(stored ?? BLANK_KITS)
    setActa(null)
    setActaState('')
  }, [fileKey])

  useEffect(() => {
    if (!kitsTouched.current) return
    try {
      localStorage.setItem(`kabine-vision-kits:v1:${fileKey}`, JSON.stringify(kits))
    } catch {
      // El navegador puede negar el almacenamiento.
    }
  }, [fileKey, kits])

  useEffect(() => {
    if (!partidoId) return
    let cancel = false
    void (async () => {
      const [conv, colors, partido] = await Promise.all([
        convocatoriasApi.listByPartido(partidoId).catch(() => null),
        partidosApi.getEquipaciones(partidoId).catch(() => null),
        partidosApi.get(partidoId).catch(() => null),
      ])
      if (cancel) return
      const oursNumbers = dorsalsFromConvocatoria(conv?.data ?? [])
      const rivalNumbers = parseNotasPre(partido?.notas_pre).anotador?.rivalDorsals ?? []
      setActa({ ours: oursNumbers, rival: rivalNumbers })
      setActaState(
        oursNumbers.length || rivalNumbers.length
          ? 'Dorsales sacados del acta de este partido.'
          : 'Este partido no tiene dorsales en el acta. Puedes escribirlos.',
      )
      if (kitsTouched.current) return
      setKits({
        ours: normalizeHex(colors?.propia?.color_camiseta_principal, OURS_FALLBACK),
        rival: normalizeHex(colors?.rival?.color_camiseta_principal, RIVAL_FALLBACK),
        oursDorsals: formatDorsalList(oursNumbers),
        rivalDorsals: formatDorsalList(rivalNumbers),
      })
    })()
    return () => {
      cancel = true
    }
  }, [partidoId, fileKey])

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
    const oursColor = normalizeHex(kits.ours, OURS_FALLBACK)
    const rivalColor = normalizeHex(kits.rival, RIVAL_FALLBACK)
    if (oursColor === rivalColor) {
      setError('Las dos camisetas tienen que ser de distinto color.')
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
          kits: { ours: oursColor, rival: rivalColor },
          roster: {
            ours: parseDorsalList(kits.oursDorsals),
            rival: parseDorsalList(kits.rivalDorsals),
          },
        }),
      })
      const started = await res.json().catch(() => ({}))
      if (res.status === 404) throw new Error('El programa de este Mac es el de antes. Ciérralo y vuelve a arrancar python3 scripts/vision_server.py.')
      if (!res.ok) throw new Error(started.error || 'No se pudo guardar el tracking')
      const done = await waitForMatch(path, setPhase)
      if (done.status === 'error') throw new Error(done.error || 'No se pudo guardar el tracking')
      if (!done.document) throw new Error(done.error || 'El tracking está guardado al lado del vídeo, pero no pude abrirlo en el césped.')
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

  function editKits(patch: Partial<KitDraft>) {
    kitsTouched.current = true
    setKits((current) => ({ ...current, ...patch }))
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
          Marca los cuatro pitidos, el color de cada camiseta y los dorsales. Si el vídeo está abierto desde un partido, los dorsales salen del acta y el color de la equipación. El programa guarda el tracking a 10 fotogramas por segundo solo con el balón en juego, al lado del partido y dentro del programa.
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
        <div className="vd-vision-whistles">
          <div className="vd-vision-whistle">
            <span>Camiseta nuestra</span>
            <strong>{normalizeHex(kits.ours, OURS_FALLBACK)}</strong>
            <input
              type="color"
              aria-label="Camiseta nuestra"
              value={normalizeHex(kits.ours, OURS_FALLBACK)}
              onChange={(event) => editKits({ ours: event.target.value })}
            />
          </div>
          <div className="vd-vision-whistle">
            <span>Camiseta rival</span>
            <strong>{normalizeHex(kits.rival, RIVAL_FALLBACK)}</strong>
            <input
              type="color"
              aria-label="Camiseta rival"
              value={normalizeHex(kits.rival, RIVAL_FALLBACK)}
              onChange={(event) => editKits({ rival: event.target.value })}
            />
          </div>
        </div>
        <div className="vd-vision-dorsals">
          <label>
            Dorsales nuestros
            <input
              value={kits.oursDorsals}
              inputMode="numeric"
              placeholder="Del acta"
              onChange={(event) => editKits({ oursDorsals: event.target.value })}
            />
          </label>
          <label>
            Dorsales rivales
            <input
              value={kits.rivalDorsals}
              inputMode="numeric"
              placeholder="Del acta"
              onChange={(event) => editKits({ rivalDorsals: event.target.value })}
            />
          </label>
        </div>
        {partidoId ? (
          <p className="vd-vision-meta">
            {actaState || 'Leyendo el acta de este partido.'}
            {acta ? ` Nuestros: ${formatDorsalList(acta.ours) || '—'}. Rival: ${formatDorsalList(acta.rival) || '—'}.` : ''}
          </p>
        ) : (
          <p className="vd-vision-meta">Este vídeo no está abierto desde un partido. Escribe los dorsales a mano; si lo abres desde el partido, el acta entra sola.</p>
        )}
        {acta && (acta.ours.length > 0 || acta.rival.length > 0) ? (
          <div className="vd-modal-actions">
            <button
              type="button"
              className="vd-btn"
              onClick={() => editKits({
                oursDorsals: formatDorsalList(acta.ours),
                rivalDorsals: formatDorsalList(acta.rival),
              })}
            >
              Usar dorsales del acta
            </button>
          </div>
        ) : null}
        <div className="vd-modal-actions">
          <button type="button" className="vd-btn vd-btn-accent" disabled={busy} onClick={() => void saveMatch()}>
            {busy ? 'Guardando…' : 'Guardar tracking'}
          </button>
        </div>
        {phase ? <p className="vd-vision-meta">{phase}</p> : null}
        <p className="vd-vision-meta">La lectura usa el césped, las líneas blancas y el color de camiseta. Un dorsal solo se queda si está en el acta. En un partido de noche el detector de producto sigue haciendo falta para que cada punto sea un jugador de verdad.</p>
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
                  {dot.label ? (
                    <text className="vd-vision-number" x={dot.x * 105} y={dot.y * 68 - 2.6} textAnchor="middle">
                      {dot.label}
                    </text>
                  ) : null}
                </g>
              ))}
            </svg>
            <p>{doc.preview?.note}</p>
            {doc.preview?.stored_path ? <p className="vd-vision-meta">Al lado del vídeo: {doc.preview.stored_path}</p> : null}
            {doc.preview?.program_path ? <p className="vd-vision-meta">Dentro del programa: {doc.preview.program_path}</p> : null}
            <p className="vd-vision-meta">
              {doc.preview?.sample_fps ? `${doc.preview.sample_fps} fps · ` : ''}
              {doc.preview?.kept_frames ?? 0} fotogramas · {doc.preview?.players ?? doc.tracks.filter((track) => track.role === 'player').length} jugadores · {doc.preview?.with_metres ?? doc.physical?.length ?? 0} con metros visibles
              {doc.preview?.homography_accepted != null ? ` · ${doc.preview.homography_accepted} homografías válidas` : ''}
            </p>
            {doc.preview?.metrics ? (
              <p className="vd-vision-meta">
                Equipos con color: {doc.preview.metrics.teams_assigned ?? 0} de {doc.preview.metrics.players ?? 0}.
                {' '}Dorsales del acta: {doc.preview.metrics.dorsals_in_acta ?? 0}.
                {' '}Balón: {doc.preview.metrics.ball_samples ?? 0}.
                {' '}Homografía 1ª parte: {doc.preview.metrics.homography_primera ?? 0}. 2ª: {doc.preview.metrics.homography_segunda ?? 0}.
              </p>
            ) : null}
            {doc.preview?.bytes ? <p className="vd-vision-meta">{(doc.preview.bytes / (1024 * 1024)).toFixed(1)} MB en el disco. El césped es una comprobación de ese archivo.</p> : null}
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

function readKits(fileKey: string): KitDraft | null {
  try {
    const raw = localStorage.getItem(`kabine-vision-kits:v1:${fileKey}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<KitDraft>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      ours: normalizeHex(parsed.ours, OURS_FALLBACK),
      rival: normalizeHex(parsed.rival, RIVAL_FALLBACK),
      oursDorsals: typeof parsed.oursDorsals === 'string' ? parsed.oursDorsals : '',
      rivalDorsals: typeof parsed.rivalDorsals === 'string' ? parsed.rivalDorsals : '',
    }
  } catch {
    return null
  }
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
    let body: { status: string; error?: string; document?: VisionDoc; phase?: string; kept_frames?: number }
    try {
      body = await res.json()
    } catch {
      throw new Error('El navegador no ha podido leer la respuesta. Si el proceso había terminado, el archivo está al lado del vídeo: mismo nombre y extensión .kabine-vision.json.')
    }
    if (!res.ok) throw new Error(body.error || 'No se pudo leer el tracking')
    const part = body.phase === 'segunda' ? 'segunda parte' : 'primera parte'
    const running =
      body.phase === 'calibrando'
        ? 'Calibrando la cámara y las camisetas con fotogramas de todo el partido. Tarda unos 10–15 minutos.'
        : `Leyendo la ${part}. ${body.kept_frames ?? 0} fotogramas. Puedes dejar esta ventana abierta.`
    onPhase(body.status === 'running' ? running : '')
    if (body.status === 'done' || body.status === 'error') return body
    await new Promise((resolve) => window.setTimeout(resolve, 800))
  }
  throw new Error('El tracking sigue en este Mac. El archivo se escribe al lado del partido.')
}
