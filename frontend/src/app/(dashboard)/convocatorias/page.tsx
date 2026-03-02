'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Plus,
  Loader2,
  Check,
  X,
  Trophy,
  Calendar,
  ChevronRight,
  UserPlus,
  Shirt,
  Goal,
  Timer,
  ClipboardList,
  FileText,
  ArrowRightLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useEquipoStore } from '@/stores/equipoStore'
import { convocatoriasApi, CreateConvocatoriaData, UpdateConvocatoriaData } from '@/lib/api/convocatorias'
import { partidosApi } from '@/lib/api/partidos'
import { jugadoresApi, Jugador } from '@/lib/api/jugadores'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { formatDate } from '@/lib/utils'
import type { Convocatoria, Partido } from '@/types'

// Position coords for pitch diagram
const POSITION_COORDS: Record<string, { top: string; left: string }> = {
  POR: { top: '88%', left: '50%' },
  DFC: { top: '72%', left: '40%' },
  DFC2: { top: '72%', left: '60%' },
  LTD: { top: '68%', left: '82%' },
  LTI: { top: '68%', left: '18%' },
  CAD: { top: '68%', left: '82%' },
  CAI: { top: '68%', left: '18%' },
  MCD: { top: '52%', left: '50%' },
  MC: { top: '48%', left: '38%' },
  MCO: { top: '40%', left: '50%' },
  MID: { top: '42%', left: '78%' },
  MII: { top: '42%', left: '22%' },
  EXD: { top: '22%', left: '78%' },
  EXI: { top: '22%', left: '22%' },
  MP: { top: '25%', left: '50%' },
  DC: { top: '18%', left: '50%' },
  SD: { top: '30%', left: '50%' },
}

// Get player data from convocatoria (backend returns as "jugadores" from join)
function getPlayerData(conv: Convocatoria) {
  return conv.jugador || conv.jugadores || null
}

function getPlayerDisplayName(conv: Convocatoria) {
  const p = getPlayerData(conv)
  if (!p) return `#${conv.dorsal || '?'}`
  return p.apodo || p.apellidos || p.nombre || `#${conv.dorsal || '?'}`
}

function getPlayerFullName(conv: Convocatoria) {
  const p = getPlayerData(conv)
  if (!p) return 'Jugador'
  return `${p.nombre || ''} ${p.apellidos || ''}`.trim() || 'Jugador'
}

export default function ConvocatoriasPage() {
  const { equipoActivo } = useEquipoStore()

  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPartido, setSelectedPartido] = useState<Partido | null>(null)

  // Convocatoria for selected partido
  const [convocados, setConvocados] = useState<Convocatoria[]>([])
  const [loadingConv, setLoadingConv] = useState(false)

  // Add players dialog
  const [showAdd, setShowAdd] = useState(false)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loadingJug, setLoadingJug] = useState(false)
  const [selected, setSelected] = useState<Record<string, { titular: boolean; dorsal?: number; posicion?: string }>>({})
  const [saving, setSaving] = useState(false)

  // Stats dialog
  const [editingConv, setEditingConv] = useState<Convocatoria | null>(null)
  const [statsForm, setStatsForm] = useState<UpdateConvocatoriaData>({})
  const [savingStats, setSavingStats] = useState(false)

  // PDF
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // View toggle
  const [showPitch, setShowPitch] = useState(true)

  usePageReady(loading)

  // Load partidos
  useEffect(() => {
    if (!equipoActivo?.id) return
    setLoading(true)
    partidosApi
      .list({ equipo_id: equipoActivo.id, limit: 20 })
      .then((res) => setPartidos(res?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [equipoActivo?.id])

  // Load convocatoria when partido selected
  useEffect(() => {
    if (!selectedPartido) {
      setConvocados([])
      return
    }
    setLoadingConv(true)
    convocatoriasApi
      .listByPartido(selectedPartido.id)
      .then((res) => setConvocados(res?.data || []))
      .catch(console.error)
      .finally(() => setLoadingConv(false))
  }, [selectedPartido?.id])

  // Load jugadores when opening add dialog
  const openAddDialog = () => {
    if (!equipoActivo?.id) return
    setShowAdd(true)
    setSelected({})
    setLoadingJug(true)
    jugadoresApi
      .list({ equipo_id: equipoActivo.id, estado: 'activo' })
      .then((res) => setJugadores(res?.data || []))
      .catch(console.error)
      .finally(() => setLoadingJug(false))
  }

  const togglePlayer = (jugador: Jugador) => {
    setSelected((prev) => {
      const copy = { ...prev }
      if (copy[jugador.id]) {
        delete copy[jugador.id]
      } else {
        copy[jugador.id] = { titular: false, dorsal: jugador.dorsal || undefined, posicion: jugador.posicion_principal }
      }
      return copy
    })
  }

  const handleBatchCreate = async () => {
    if (!selectedPartido) return
    const entries = Object.entries(selected)
    if (entries.length === 0) return
    setSaving(true)
    try {
      const batch: CreateConvocatoriaData[] = entries.map(([jugadorId, info]) => ({
        partido_id: selectedPartido.id,
        jugador_id: jugadorId,
        titular: info.titular,
        dorsal: info.dorsal,
        posicion_asignada: info.posicion,
      }))
      await convocatoriasApi.createBatch(batch)
      setShowAdd(false)
      // Refresh
      const res = await convocatoriasApi.listByPartido(selectedPartido.id)
      setConvocados(res?.data || [])
    } catch (err: any) {
      alert(err.message || 'Error al crear convocatoria')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleTitular = async (conv: Convocatoria) => {
    try {
      await convocatoriasApi.update(conv.id, { titular: !conv.titular })
      setConvocados((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, titular: !c.titular } : c))
      )
    } catch (err) {
      console.error('Error toggling titular:', err)
    }
  }

  const openStatsEdit = (conv: Convocatoria) => {
    setEditingConv(conv)
    setStatsForm({
      minutos_jugados: conv.minutos_jugados || 0,
      goles: conv.goles || 0,
      asistencias: conv.asistencias || 0,
      tarjeta_amarilla: conv.tarjeta_amarilla || false,
      tarjeta_roja: conv.tarjeta_roja || false,
      notas: conv.notas || '',
    })
  }

  const handleSaveStats = async () => {
    if (!editingConv) return
    setSavingStats(true)
    try {
      const updated = await convocatoriasApi.update(editingConv.id, statsForm)
      setConvocados((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setEditingConv(null)
    } catch (err: any) {
      alert(err.message || 'Error al guardar estadisticas')
    } finally {
      setSavingStats(false)
    }
  }

  const handleRemove = async (convId: string) => {
    try {
      await convocatoriasApi.delete(convId)
      setConvocados((prev) => prev.filter((c) => c.id !== convId))
    } catch (err) {
      console.error(err)
    }
  }

  const handleGeneratePdf = async () => {
    if (!selectedPartido) return
    setGeneratingPdf(true)
    try {
      const blob = await convocatoriasApi.generatePdf(selectedPartido.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('Error generating PDF:', err)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const titulares = convocados.filter((c) => c.titular)
  const suplentes = convocados.filter((c) => !c.titular)

  const RESULTADO_COLORS: Record<string, string> = {
    victoria: 'bg-emerald-100 text-emerald-800',
    empate: 'bg-amber-100 text-amber-800',
    derrota: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Convocatorias
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestiona la convocatoria y estadísticas de cada partido
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Partido list */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Partidos
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : partidos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sin partidos programados
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1">
              {partidos.map((partido) => (
                <button
                  key={partido.id}
                  onClick={() => setSelectedPartido(partido)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedPartido?.id === partido.id
                      ? 'border-primary bg-primary/5'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {partido.localia === 'local' ? 'vs' : '@'}{' '}
                        {(partido as any).rival?.nombre || 'Rival'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(partido.fecha)}
                        </span>
                        {partido.competicion && (
                          <Badge variant="outline" className="text-[9px]">
                            {partido.competicion}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {partido.resultado && (
                        <Badge className={`text-[10px] ${RESULTADO_COLORS[partido.resultado] || ''}`}>
                          {partido.goles_favor}-{partido.goles_contra}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Convocatoria detail */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedPartido ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">Selecciona un partido</h3>
                <p className="text-sm text-muted-foreground">
                  Elige un partido de la lista para ver o gestionar su convocatoria
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Partido header */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    {selectedPartido.localia === 'local' ? 'vs' : '@'}{' '}
                    {(selectedPartido as any).rival?.nombre || 'Rival'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedPartido.fecha)}
                    {selectedPartido.competicion && ` · ${selectedPartido.competicion}`}
                    {selectedPartido.jornada && ` · J${selectedPartido.jornada}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/partidos/${selectedPartido.id}/plan`}>
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Plan
                    </Link>
                  </Button>
                  {convocados.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={generatingPdf}>
                      {generatingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                      PDF
                    </Button>
                  )}
                  <Button onClick={openAddDialog} size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convocar
                  </Button>
                </div>
              </div>

              {loadingConv ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : convocados.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium mb-1">Sin convocados</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Añade jugadores a la convocatoria de este partido
                    </p>
                    <Button onClick={openAddDialog} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Convocar jugadores
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* Stats summary */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-lg font-bold text-primary">{convocados.length}</p>
                      <p className="text-[10px] text-muted-foreground">Convocados</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{titulares.length}</p>
                      <p className="text-[10px] text-muted-foreground">Titulares</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">
                        {convocados.reduce((s, c) => s + (c.goles || 0), 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Goles</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">
                        {convocados.reduce((s, c) => s + (c.asistencias || 0), 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Asistencias</p>
                    </div>
                  </div>

                  {/* Pitch formation for titulares */}
                  {showPitch && titulares.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shirt className="h-4 w-4 text-primary" />
                          Alineación
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="relative bg-emerald-600/90 rounded-xl overflow-hidden mx-auto max-w-sm" style={{ aspectRatio: '3/4' }}>
                          {/* Pitch lines */}
                          <div className="absolute inset-4">
                            <div className="absolute inset-0 border-2 border-white/30 rounded" />
                            <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-t-0 border-white/30" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-b-0 border-white/30" />
                          </div>
                          {titulares.map((conv) => {
                            const pos = conv.posicion_asignada || getPlayerData(conv)?.posicion_principal || 'MC'
                            const coords = POSITION_COORDS[pos] || { top: '50%', left: '50%' }
                            return (
                              <div
                                key={conv.id}
                                className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                                style={{ top: coords.top, left: coords.left }}
                              >
                                <div className="w-8 h-8 rounded-full bg-white text-primary font-bold text-xs flex items-center justify-center shadow-md">
                                  {conv.dorsal || getPlayerData(conv)?.dorsal || '?'}
                                </div>
                                <span className="block text-[9px] text-white font-medium mt-0.5 max-w-[60px] truncate drop-shadow">
                                  {getPlayerDisplayName(conv)}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Titulares list */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Shirt className="h-4 w-4 text-primary" />
                        Titulares ({titulares.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <PlayerTable
                        convocados={titulares}
                        onEdit={openStatsEdit}
                        onRemove={handleRemove}
                        onToggleTitular={handleToggleTitular}
                      />
                    </CardContent>
                  </Card>

                  {/* Suplentes list */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        Suplentes ({suplentes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {suplentes.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">Sin suplentes</p>
                      ) : (
                        <PlayerTable
                          convocados={suplentes}
                          onEdit={openStatsEdit}
                          onRemove={handleRemove}
                          onToggleTitular={handleToggleTitular}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add players dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Convocar jugadores</DialogTitle>
            <DialogDescription>
              Selecciona los jugadores para la convocatoria. Puedes marcar titulares.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {loadingJug ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {jugadores
                  .filter((j) => !convocados.some((c) => c.jugador_id === j.id))
                  .map((jugador) => {
                    const isSelected = !!selected[jugador.id]
                    const info = selected[jugador.id]
                    return (
                      <div
                        key={jugador.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'
                        }`}
                      >
                        <button
                          onClick={() => togglePlayer(jugador)}
                          className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {jugador.dorsal || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}
                            </span>
                            <Badge variant="outline" className="text-[9px]">
                              {jugador.posicion_principal}
                            </Badge>
                          </div>
                          {jugador.apodo && (
                            <p className="text-[10px] text-muted-foreground">
                              {jugador.nombre} {jugador.apellidos}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <button
                            onClick={() =>
                              setSelected((prev) => ({
                                ...prev,
                                [jugador.id]: { ...prev[jugador.id], titular: !prev[jugador.id].titular },
                              }))
                            }
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                              info?.titular
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {info?.titular ? 'Titular' : 'Suplente'}
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {Object.keys(selected).length} seleccionados
                {Object.values(selected).filter((s) => s.titular).length > 0 &&
                  ` (${Object.values(selected).filter((s) => s.titular).length} titulares)`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleBatchCreate}
                  disabled={saving || Object.keys(selected).length === 0}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Convocar ({Object.keys(selected).length})
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit stats dialog */}
      <Dialog open={editingConv !== null} onOpenChange={(open) => !open && setEditingConv(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Estadísticas del jugador</DialogTitle>
            <DialogDescription>
              Registra las estadísticas post-partido
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Minutos</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={statsForm.minutos_jugados || 0}
                  onChange={(e) =>
                    setStatsForm({ ...statsForm, minutos_jugados: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Goles</Label>
                <Input
                  type="number"
                  min={0}
                  value={statsForm.goles || 0}
                  onChange={(e) =>
                    setStatsForm({ ...statsForm, goles: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Asistencias</Label>
                <Input
                  type="number"
                  min={0}
                  value={statsForm.asistencias || 0}
                  onChange={(e) =>
                    setStatsForm({ ...statsForm, asistencias: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statsForm.tarjeta_amarilla || false}
                  onChange={(e) =>
                    setStatsForm({ ...statsForm, tarjeta_amarilla: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">Tarjeta amarilla</span>
                <div className="w-4 h-5 rounded-sm bg-yellow-400" />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={statsForm.tarjeta_roja || false}
                  onChange={(e) =>
                    setStatsForm({ ...statsForm, tarjeta_roja: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">Tarjeta roja</span>
                <div className="w-4 h-5 rounded-sm bg-red-500" />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConv(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStats} disabled={savingStats}>
              {savingStats ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Player Table Component ============

function PlayerTable({
  convocados,
  onEdit,
  onRemove,
  onToggleTitular,
}: {
  convocados: Convocatoria[]
  onEdit: (c: Convocatoria) => void
  onRemove: (id: string) => void
  onToggleTitular: (c: Convocatoria) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-4 pb-2 font-medium">#</th>
            <th className="px-2 pb-2 font-medium">Jugador</th>
            <th className="px-2 pb-2 font-medium text-center">Pos</th>
            <th className="px-2 pb-2 font-medium text-center">Min</th>
            <th className="px-2 pb-2 font-medium text-center">
              <Goal className="h-3.5 w-3.5 mx-auto" />
            </th>
            <th className="px-2 pb-2 font-medium text-center">Ast</th>
            <th className="px-2 pb-2 font-medium text-center">TC</th>
            <th className="px-2 pb-2 font-medium w-24" />
          </tr>
        </thead>
        <tbody>
          {convocados.map((conv) => {
            const player = getPlayerData(conv)
            return (
              <tr key={conv.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {conv.dorsal || player?.dorsal || '-'}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <p className="font-medium text-sm">
                    {player?.apodo || getPlayerFullName(conv)}
                  </p>
                  {player?.apodo && (
                    <p className="text-[10px] text-muted-foreground">
                      {player.nombre} {player.apellidos}
                    </p>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <Badge variant="outline" className="text-[9px]">
                    {conv.posicion_asignada || player?.posicion_principal || '—'}
                  </Badge>
                </td>
                <td className="px-2 py-2.5 text-center text-muted-foreground">
                  {conv.minutos_jugados || '-'}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {conv.goles ? (
                    <span className="font-bold">{conv.goles}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center text-muted-foreground">
                  {conv.asistencias || '-'}
                </td>
                <td className="px-2 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {conv.tarjeta_amarilla && <div className="w-3 h-4 rounded-sm bg-yellow-400" />}
                    {conv.tarjeta_roja && <div className="w-3 h-4 rounded-sm bg-red-500" />}
                    {!conv.tarjeta_amarilla && !conv.tarjeta_roja && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => onToggleTitular(conv)}
                      className={`p-1 rounded text-[9px] font-medium transition-colors ${
                        conv.titular
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                      title={conv.titular ? 'Mover a suplente' : 'Mover a titular'}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onEdit(conv)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Editar estadísticas"
                    >
                      <Timer className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRemove(conv.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Quitar de convocatoria"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
