'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, ImageDown, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { partidosApi } from '@/lib/api/partidos'
import { apiKey } from '@/lib/swr'
import { useClubStore } from '@/stores/clubStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { JerseyPreview } from '@/components/equipaciones/JerseyPreview'
import { KitFullPreview, Shorts, Sock } from '@/components/equipaciones/KitFullPreview'
import type { Equipacion, TipoEquipacion } from '@/lib/api/equipaciones'
import type { Convocatoria, Partido } from '@/types'
import {
  cleanEstadioNombre,
  defaultHoraCitacion,
  defaultLugarCitacion,
  isUniformKit,
  kitPiecesFromCombo,
  parseKitCombo,
  partidoLugarArbitro,
  serializeKitCombo,
  slugCartelFilename,
  sortConvocadosForCartel,
  uniformKitCombo,
  type KitCombo,
} from '@/lib/convocatoriaCartel'
import { ConvocatoriaCartel } from './ConvocatoriaCartel'

const CARTEL_FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=Oswald:wght@500;700&display=swap'

function ensureCartelFonts() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`link[data-cartel-fonts="1"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = CARTEL_FONTS
  link.setAttribute('data-cartel-fonts', '1')
  document.head.appendChild(link)
}

async function posterToCanvas(el: HTMLElement) {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined)
  }
  return html2canvas(el, {
    backgroundColor: '#0B1F17',
    scale: 2,
    useCORS: true,
    logging: false,
  })
}

export function ConvocatoriaCartelDialog({
  open,
  onOpenChange,
  partido,
  convocados,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  partido: Partido
  convocados: Convocatoria[]
}) {
  const posterRef = useRef<HTMLDivElement>(null)
  const club = useClubStore()
  const equipoNombre = useEquipoStore((s) => s.equipoActivo?.nombre)
  const { data: clubKits } = useSWR<Equipacion[]>(open ? apiKey('/organizacion/equipaciones') : null)

  const venue = useMemo(() => partidoLugarArbitro(partido), [
    partido.ubicacion,
    partido.arbitro,
    partido.rival?.estadio,
    partido.rival?.ciudad,
  ])

  const [horaCitacion, setHoraCitacion] = useState('')
  const [lugarCitacion, setLugarCitacion] = useState('')
  const [kitCombo, setKitCombo] = useState<KitCombo>(uniformKitCombo('local'))
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState<'jpeg' | 'pdf' | null>(null)

  useEffect(() => {
    if (!open) return
    ensureCartelFonts()
    setHoraCitacion((partido.hora_citacion || '').slice(0, 5) || defaultHoraCitacion(partido.hora))
    setLugarCitacion(
      defaultLugarCitacion({
        saved: partido.lugar_citacion,
        ubicacion: partido.ubicacion,
        estadio: partido.rival?.estadio,
        ciudad: partido.rival?.ciudad,
        arbitro: partido.arbitro,
      }),
    )
    setKitCombo(parseKitCombo(partido.kit_convocatoria, partido.localia))
  }, [
    open,
    partido.id,
    partido.hora,
    partido.hora_citacion,
    partido.lugar_citacion,
    partido.kit_convocatoria,
    partido.localia,
    partido.ubicacion,
    partido.arbitro,
    partido.rival?.estadio,
    partido.rival?.ciudad,
  ])

  const players = useMemo(() => sortConvocadosForCartel(convocados), [convocados])
  const kitsByTipo = useMemo(() => {
    const map: Partial<Record<TipoEquipacion, Equipacion>> = {}
    for (const k of clubKits || []) map[k.tipo] = k
    return map
  }, [clubKits])
  const kit = kitPiecesFromCombo(kitsByTipo, kitCombo)
  const uniformSide = isUniformKit(kitCombo)
  const filenameBase = slugCartelFilename(partido.rival?.nombre || 'rival', partido.fecha)
  const clubNombre = club.organizacion?.nombre || equipoNombre || 'Equipo'
  const clubLogoUrl = club.theme.logoUrl || club.organizacion?.logo_url || null
  const rivalNombre = partido.rival?.nombre || 'Rival'
  const lugarPartido = venue.lugar || 'Por confirmar'
  const arbitro = venue.arbitro

  const persist = useCallback(
    async (opts?: { silent?: boolean }) => {
      setSaving(true)
      try {
        await partidosApi.update(partido.id, {
          hora_citacion: horaCitacion.trim() || null,
          lugar_citacion: cleanEstadioNombre(lugarCitacion) || null,
          kit_convocatoria: serializeKitCombo(kitCombo),
        })
        await mutate(apiKey(`/partidos/${partido.id}`))
        if (!opts?.silent) toast.success('Citación guardada')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [partido.id, horaCitacion, lugarCitacion, kitCombo],
  )

  const handleSave = async () => {
    try {
      await persist()
    } catch {
      /* toast already shown */
    }
  }

  const handleJpeg = async () => {
    const el = posterRef.current
    if (!el) return
    setExporting('jpeg')
    try {
      await persist({ silent: true }).catch(() => undefined)
      const canvas = await posterToCanvas(el)
      const link = document.createElement('a')
      link.download = `${filenameBase}.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.92)
      link.click()
      toast.success('JPEG descargado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar el JPEG')
    } finally {
      setExporting(null)
    }
  }

  const handlePdf = async () => {
    const el = posterRef.current
    if (!el) return
    setExporting('pdf')
    try {
      await persist({ silent: true }).catch(() => undefined)
      const canvas = await posterToCanvas(el)
      const img = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height)
      const imgW = canvas.width * ratio
      const imgH = canvas.height * ratio
      pdf.addImage(img, 'JPEG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH)
      pdf.save(`${filenameBase}.pdf`)
      toast.success('PDF descargado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo exportar el PDF')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[min(1100px,96vw)] max-w-6xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle>Cartel de convocatoria</DialogTitle>
          <DialogDescription>
            Todos los convocados por dorsal. Elige la equipación completa o mezcla
            camiseta, calzonas y medias. Exporta JPEG o PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(260px,320px)_1fr]">
          <div className="space-y-4 overflow-y-auto border-b border-border p-5 lg:border-b-0 lg:border-r">
            <div className="space-y-1.5">
              <Label htmlFor="hora-citacion">Hora de citación</Label>
              <Input
                id="hora-citacion"
                type="time"
                value={horaCitacion}
                onChange={(e) => setHoraCitacion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Por defecto, 90 min antes del saque ({partido.hora || '—'}).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lugar-citacion">Lugar de citación</Label>
              <Input
                id="lugar-citacion"
                value={lugarCitacion}
                onChange={(e) => setLugarCitacion(e.target.value)}
                placeholder="Estadio, parking, bus…"
              />
            </div>
            <div className="space-y-3">
              <Label>Equipación</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['local', 'visitante'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setKitCombo(uniformKitCombo(side))}
                    className={`rounded-lg border px-2 py-2 text-center text-sm transition-colors ${
                      uniformSide === side
                        ? 'border-primary bg-primary/10 font-semibold'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    {kitsByTipo[side] ? (
                      <KitFullPreview
                        kit={kitsByTipo[side]}
                        size={72}
                        labels={false}
                        escudoUrl={clubLogoUrl}
                      />
                    ) : (
                      <span className="block py-4 text-xs text-muted-foreground">Sin kit</span>
                    )}
                    <span className="mt-1 block text-xs">
                      {side === 'local' ? 'Local completa' : 'Visitante completa'}
                    </span>
                  </button>
                ))}
              </div>
              {(
                [
                  ['camiseta', 'Camiseta'],
                  ['pantalon', 'Calzonas'],
                  ['medias', 'Medias'],
                ] as const
              ).map(([piece, label]) => (
                <div key={piece} className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['local', 'visitante'] as const).map((side) => {
                      const kitSide = kitsByTipo[side]
                      const selected = kitCombo[piece] === side
                      return (
                        <button
                          key={`${piece}-${side}`}
                          type="button"
                          onClick={() => setKitCombo((c) => ({ ...c, [piece]: side }))}
                          className={`flex min-h-[56px] items-center justify-center rounded-lg border px-2 py-2 transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/40'
                          }`}
                          aria-pressed={selected}
                          aria-label={`${label} ${side}`}
                        >
                          {!kitSide ? (
                            <span className="text-xs text-muted-foreground">Sin kit</span>
                          ) : piece === 'camiseta' ? (
                            <JerseyPreview
                              colorPrincipal={kitSide.color_camiseta_principal}
                              colorSecundario={kitSide.color_camiseta_secundario || undefined}
                              patron={kitSide.patron_camiseta}
                              size={48}
                              escudoUrl={clubLogoUrl}
                            />
                          ) : piece === 'pantalon' ? (
                            <Shorts color={kitSide.color_pantalon} width={52} height={28} />
                          ) : (
                            <div className="flex gap-1" aria-hidden>
                              <Sock color={kitSide.color_medias} width={18} height={40} lean={-5} />
                              <Sock color={kitSide.color_medias} width={18} height={40} lean={5} />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button type="button" variant="outline" className="gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar citación
              </Button>
              <Button type="button" className="gap-2" onClick={handleJpeg} disabled={!!exporting}>
                {exporting === 'jpeg' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImageDown className="h-4 w-4" />
                )}
                Descargar JPEG
              </Button>
              <Button type="button" variant="secondary" className="gap-2" onClick={handlePdf} disabled={!!exporting}>
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar PDF
              </Button>
            </div>
          </div>
          <div className="overflow-auto bg-muted/30 p-4">
            <div className="mx-auto w-fit origin-top scale-[0.72] sm:scale-90 lg:scale-100">
              <ConvocatoriaCartel
                posterRef={posterRef}
                clubNombre={clubNombre}
                clubLogoUrl={clubLogoUrl}
                rivalNombre={rivalNombre}
                rivalEscudoUrl={partido.rival?.escudo_url}
                fecha={partido.fecha}
                horaPartido={partido.hora}
                jornada={partido.jornada}
                competicion={partido.competicion}
                localia={partido.localia}
                lugarPartido={lugarPartido}
                arbitro={arbitro}
                horaCitacion={horaCitacion}
                lugarCitacion={lugarCitacion}
                kit={kit}
                players={players}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
