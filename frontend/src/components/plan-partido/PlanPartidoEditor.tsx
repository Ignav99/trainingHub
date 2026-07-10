'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, Shield, Users, Clock, Swords, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { planPartidoApi } from '@/lib/api/planPartido'
import { useTrainingHubSocket } from '@/hooks/useTrainingHubSocket'
import { PlanVideoClipsSelector } from './PlanVideoClipsSelector'
import type { PlanPartido, FasePlan, FasePlanABP, Jugador, Emparejamiento, MovimientoClave, MomentoPartido, EscenarioPartido } from '@/types'

interface Props {
  microcicloId: string
  partidoId: string
  equipoId: string
  plan: PlanPartido | null
  jugadores: Jugador[]
  onSaved: (plan: PlanPartido) => void
}

const FASES_KEYS = [
  { key: 'fase_ataque_organizado', label: 'Ataque organizado', abp: false },
  { key: 'fase_defensa_organizada', label: 'Defensa organizada', abp: false },
  { key: 'fase_transicion_ofensiva', label: 'Transición ofensiva', abp: false },
  { key: 'fase_transicion_defensiva', label: 'Transición defensiva', abp: false },
  { key: 'fase_abp_ofensivo', label: 'ABP ofensivo', abp: true },
  { key: 'fase_abp_defensivo', label: 'ABP defensivo', abp: true },
] as const

const RANGOS_MOMENTO = ['0-15', '15-30', '30-45', '45-60', '60-75', '75-90']

const emptyFasePlan = (): FasePlan => ({
  nombre: '',
  altura_bloque: 'medio',
  tipo_presion: 'mixta',
  emparejamientos: [],
  movimientos_clave: [],
  espacios_a_atacar: [],
  espacios_a_proteger: [],
  referencias_visuales: [],
  triggers: [],
  video_clips: [],
})

const emptyFaseABP = (): FasePlanABP => ({
  nombre: '',
  sistema_marcaje: '',
  referencias: [],
  jugadores_area: [],
  jugadores_rechace: [],
  jugadores_contra: [],
  notas: '',
})

export function PlanPartidoEditor({ microcicloId, partidoId, equipoId, plan, jugadores, onSaved }: Props) {
  const { connected, onlineUsers, lastCollabEvent, sendCollabEdit, currentUserId } = useTrainingHubSocket(equipoId)
  const [form, setForm] = useState<Partial<PlanPartido>>({
    sistema_juego: plan?.sistema_juego || '',
    estilo_previsto: plan?.estilo_previsto || '',
    once_inicial: plan?.once_inicial || {},
    suplentes: plan?.suplentes || [],
    descartados: plan?.descartados || [],
    capitan_id: plan?.capitan_id || '',
    fase_ataque_organizado: plan?.fase_ataque_organizado || emptyFasePlan(),
    fase_defensa_organizada: plan?.fase_defensa_organizada || emptyFasePlan(),
    fase_transicion_ofensiva: plan?.fase_transicion_ofensiva || emptyFasePlan(),
    fase_transicion_defensiva: plan?.fase_transicion_defensiva || emptyFasePlan(),
    fase_abp_ofensivo: plan?.fase_abp_ofensivo || emptyFaseABP(),
    fase_abp_defensivo: plan?.fase_abp_defensivo || emptyFaseABP(),
    momentos_partido: plan?.momentos_partido || [],
    escenarios: plan?.escenarios || [],
    notas: plan?.notas || '',
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('once')

  useEffect(() => {
    if (plan?.id) {
      sendCollabEdit(plan.id, `tab_${activeTab}`)
    }
  }, [activeTab, plan?.id, sendCollabEdit])

  const jugadoresMap = useMemo(() => {
    const map: Record<string, Jugador> = {}
    jugadores.forEach(j => map[j.id] = j)
    return map
  }, [jugadores])

  const disponibles = useMemo(() => jugadores.filter(j => j.estado === 'activo' || j.estado === 'en_recuperacion'), [jugadores])

  const updateField = <K extends keyof PlanPartido>(key: K, value: PlanPartido[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleOnceChange = (posicion: string, jugadorId: string) => {
    setForm(prev => ({
      ...prev,
      once_inicial: { ...(prev.once_inicial || {}), [posicion]: jugadorId },
    }))
  }

  const toggleSuplente = (jugadorId: string) => {
    const list = form.suplentes || []
    updateField('suplentes', list.includes(jugadorId) ? list.filter(id => id !== jugadorId) : [...list, jugadorId])
  }

  const toggleDescartado = (jugadorId: string) => {
    const list = form.descartados || []
    updateField('descartados', list.includes(jugadorId) ? list.filter(id => id !== jugadorId) : [...list, jugadorId])
  }

  const updateFase = (key: string, value: FasePlan | FasePlanABP) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const addEmparejamiento = (faseKey: string, fase: FasePlan) => {
    const emp: Emparejamiento = {
      nuestro_jugador_id: '',
      tipo: 'marca',
      notas: '',
    }
    updateFase(faseKey, { ...fase, emparejamientos: [...fase.emparejamientos, emp] })
  }

  const updateEmparejamiento = (faseKey: string, fase: FasePlan, idx: number, field: keyof Emparejamiento, value: any) => {
    const list = [...fase.emparejamientos]
    list[idx] = { ...list[idx], [field]: value }
    updateFase(faseKey, { ...fase, emparejamientos: list })
  }

  const removeEmparejamiento = (faseKey: string, fase: FasePlan, idx: number) => {
    const list = [...fase.emparejamientos]
    list.splice(idx, 1)
    updateFase(faseKey, { ...fase, emparejamientos: list })
  }

  const addMovimiento = (faseKey: string, fase: FasePlan) => {
    const mov: MovimientoClave = {
      titulo: '',
      descripcion: '',
      jugadores_involucrados: [],
    }
    updateFase(faseKey, { ...fase, movimientos_clave: [...fase.movimientos_clave, mov] })
  }

  const updateMovimiento = (faseKey: string, fase: FasePlan, idx: number, field: keyof MovimientoClave, value: any) => {
    const list = [...fase.movimientos_clave]
    list[idx] = { ...list[idx], [field]: value }
    updateFase(faseKey, { ...fase, movimientos_clave: list })
  }

  const removeMovimiento = (faseKey: string, fase: FasePlan, idx: number) => {
    const list = [...fase.movimientos_clave]
    list.splice(idx, 1)
    updateFase(faseKey, { ...fase, movimientos_clave: list })
  }

  const addListItem = (faseKey: string, fase: FasePlan | FasePlanABP, listKey: keyof FasePlan | keyof FasePlanABP, value: string = '') => {
    const list = [...((fase as any)[listKey] || [])]
    updateFase(faseKey, { ...fase, [listKey]: [...list, value] })
  }

  const updateListItem = (faseKey: string, fase: FasePlan | FasePlanABP, listKey: keyof FasePlan | keyof FasePlanABP, idx: number, value: string) => {
    const list = [...((fase as any)[listKey] || [])]
    list[idx] = value
    updateFase(faseKey, { ...fase, [listKey]: list })
  }

  const removeListItem = (faseKey: string, fase: FasePlan | FasePlanABP, listKey: keyof FasePlan | keyof FasePlanABP, idx: number) => {
    const list = [...((fase as any)[listKey] || [])]
    list.splice(idx, 1)
    updateFase(faseKey, { ...fase, [listKey]: list })
  }

  const addMomento = () => {
    const m: MomentoPartido = { rango: '0-15', cambios_previstos: [], estrategia: '', notas: '' }
    updateField('momentos_partido', [...(form.momentos_partido || []), m])
  }

  const updateMomento = (idx: number, field: keyof MomentoPartido, value: any) => {
    const list = [...(form.momentos_partido || [])]
    list[idx] = { ...list[idx], [field]: value }
    updateField('momentos_partido', list)
  }

  const removeMomento = (idx: number) => {
    const list = [...(form.momentos_partido || [])]
    list.splice(idx, 1)
    updateField('momentos_partido', list)
  }

  const addEscenario = () => {
    const e: EscenarioPartido = { condicion: '', cambios_jugadores: [], ajustes_tacticos: '' }
    updateField('escenarios', [...(form.escenarios || []), e])
  }

  const updateEscenario = (idx: number, field: keyof EscenarioPartido, value: any) => {
    const list = [...(form.escenarios || [])]
    list[idx] = { ...list[idx], [field]: value }
    updateField('escenarios', list)
  }

  const removeEscenario = (idx: number) => {
    const list = [...(form.escenarios || [])]
    list.splice(idx, 1)
    updateField('escenarios', list)
  }

  const handleSave = async () => {
    if (!form.sistema_juego) {
      toast.error('El sistema de juego es obligatorio')
      return
    }
    setSaving(true)
    try {
      let saved: PlanPartido
      if (plan) {
        saved = await planPartidoApi.update(plan.id, { ...form })
      } else {
        saved = await planPartidoApi.create(microcicloId, {
          ...form,
          partido_id: partidoId,
          microciclo_id: microcicloId,
          sistema_juego: form.sistema_juego,
        } as any)
      }
      toast.success('Plan de partido guardado')
      onSaved(saved)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar plan de partido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold">Editor del Plan de Partido</h2>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {connected ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-gray-400" />}
            {connected ? 'Colaboración activa' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onlineUsers.filter(uid => uid !== currentUserId).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Users className="h-3 w-3" />
              {onlineUsers.filter(uid => uid !== currentUserId).length} en línea
            </div>
          )}
          {lastCollabEvent && lastCollabEvent.user_id !== currentUserId && (
            <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              {lastCollabEvent.user_name} editó {lastCollabEvent.field}
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Guardar plan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="once">11 inicial</TabsTrigger>
          <TabsTrigger value="fases">Fases tácticas</TabsTrigger>
          <TabsTrigger value="momentos">Momentos</TabsTrigger>
          <TabsTrigger value="escenarios">Escenarios</TabsTrigger>
        </TabsList>

        {/* 11 INICIAL */}
        <TabsContent value="once" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alineación y convocatoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Sistema de juego</Label>
                  <Input
                    placeholder="Ej: 4-3-3"
                    value={form.sistema_juego || ''}
                    onChange={(e) => updateField('sistema_juego', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estilo previsto</Label>
                  <Input
                    placeholder="Ej: Posesión, directo..."
                    value={form.estilo_previsto || ''}
                    onChange={(e) => updateField('estilo_previsto', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capitán</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.capitan_id || ''}
                    onChange={(e) => updateField('capitan_id', e.target.value || undefined)}
                  >
                    <option value="">Sin capitán</option>
                    {disponibles.map(j => (
                      <option key={j.id} value={j.id}>{j.dorsal} {j.apellidos}, {j.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>11 inicial (posición → jugador)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['POR', 'LD', 'DFD', 'DFI', 'LI', 'MCD', 'MC', 'MCO', 'ED', 'DC', 'EI'].map(pos => (
                    <div key={pos} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-10">{pos}</span>
                      <select
                        className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                        value={form.once_inicial?.[pos] || ''}
                        onChange={(e) => handleOnceChange(pos, e.target.value)}
                      >
                        <option value="">—</option>
                        {disponibles.map(j => (
                          <option key={j.id} value={j.id}>{j.dorsal} {j.apellidos}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Suplentes</Label>
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {disponibles.map(j => (
                      <label key={j.id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.suplentes || []).includes(j.id)}
                          onChange={() => toggleSuplente(j.id)}
                        />
                        <span>{j.dorsal} {j.apellidos}, {j.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Descartados</Label>
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {jugadores.map(j => (
                      <label key={j.id} className="flex items-center gap-2 text-sm p-1 hover:bg-muted rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.descartados || []).includes(j.id)}
                          onChange={() => toggleDescartado(j.id)}
                        />
                        <span>{j.dorsal} {j.apellidos}, {j.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FASES TÁCTICAS */}
        <TabsContent value="fases" className="space-y-4">
          <Tabs defaultValue={FASES_KEYS[0].key}>
            <TabsList className="flex-wrap h-auto">
              {FASES_KEYS.map(f => (
                <TabsTrigger key={f.key} value={f.key}>{f.label}</TabsTrigger>
              ))}
            </TabsList>
            {FASES_KEYS.map(f => {
              const fase = (form as any)[f.key] as FasePlan | FasePlanABP
              if (!fase) return null
              if (f.abp) {
                const abp = fase as FasePlanABP
                return (
                  <TabsContent key={f.key} value={f.key} className="space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Sistema de marcaje</Label>
                          <Input
                            value={abp.sistema_marcaje || ''}
                            onChange={(e) => updateFase(f.key, { ...abp, sistema_marcaje: e.target.value })}
                            placeholder="Ej: Hombre a hombre en el área"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Notas</Label>
                          <Textarea
                            value={abp.notas || ''}
                            onChange={(e) => updateFase(f.key, { ...abp, notas: e.target.value })}
                            rows={3}
                          />
                        </div>
                        {(['referencias', 'jugadores_area', 'jugadores_rechace', 'jugadores_contra'] as const).map(listKey => (
                          <div key={listKey} className="space-y-2">
                            <Label className="capitalize">{listKey.replace('_', ' ')}</Label>
                            {(abp[listKey] || []).map((item, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <Input
                                  value={item}
                                  onChange={(e) => updateListItem(f.key, abp, listKey, i, e.target.value)}
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeListItem(f.key, abp, listKey, i)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={() => addListItem(f.key, abp, listKey)}>
                              <Plus className="h-4 w-4 mr-1" /> Añadir
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                )
              }
              const fp = fase as FasePlan
              return (
                <TabsContent key={f.key} value={f.key} className="space-y-4">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Altura de bloque</Label>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={fp.altura_bloque || 'medio'}
                            onChange={(e) => updateFase(f.key, { ...fp, altura_bloque: e.target.value as any })}
                          >
                            <option value="alto">Alto</option>
                            <option value="medio">Medio</option>
                            <option value="bajo">Bajo</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de presión</Label>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={fp.tipo_presion || 'mixta'}
                            onChange={(e) => updateFase(f.key, { ...fp, tipo_presion: e.target.value as any })}
                          >
                            <option value="hombre">Hombre</option>
                            <option value="zona">Zona</option>
                            <option value="mixta">Mixta</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre fase</Label>
                          <Input value={fp.nombre} onChange={(e) => updateFase(f.key, { ...fp, nombre: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Emparejamientos</Label>
                        {fp.emparejamientos.map((emp, i) => (
                          <div key={i} className="border rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                className="rounded-md border bg-background px-2 py-1 text-sm"
                                value={emp.nuestro_jugador_id}
                                onChange={(e) => updateEmparejamiento(f.key, fp, i, 'nuestro_jugador_id', e.target.value)}
                              >
                                <option value="">Nuestro jugador</option>
                                {disponibles.map(j => <option key={j.id} value={j.id}>{j.dorsal} {j.apellidos}</option>)}
                              </select>
                              <Input
                                placeholder="Rival (nombre o dorsal)"
                                value={emp.rival_nombre || ''}
                                onChange={(e) => updateEmparejamiento(f.key, fp, i, 'rival_nombre', e.target.value)}
                              />
                              <select
                                className="rounded-md border bg-background px-2 py-1 text-sm"
                                value={emp.tipo}
                                onChange={(e) => updateEmparejamiento(f.key, fp, i, 'tipo', e.target.value)}
                              >
                                <option value="marca">Marca</option>
                                <option value="presion">Presión</option>
                                <option value="cobertura">Cobertura</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Notas"
                                value={emp.notas || ''}
                                onChange={(e) => updateEmparejamiento(f.key, fp, i, 'notas', e.target.value)}
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeEmparejamiento(f.key, fp, i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addEmparejamiento(f.key, fp)}>
                          <Plus className="h-4 w-4 mr-1" /> Añadir emparejamiento
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Swords className="h-4 w-4" /> Movimientos clave</Label>
                        {fp.movimientos_clave.map((mov, i) => (
                          <div key={i} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Título del movimiento"
                                value={mov.titulo}
                                onChange={(e) => updateMovimiento(f.key, fp, i, 'titulo', e.target.value)}
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeMovimiento(f.key, fp, i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <Textarea
                              placeholder="Descripción"
                              value={mov.descripcion}
                              onChange={(e) => updateMovimiento(f.key, fp, i, 'descripcion', e.target.value)}
                              rows={2}
                            />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addMovimiento(f.key, fp)}>
                          <Plus className="h-4 w-4 mr-1" /> Añadir movimiento
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Triggers / disparadores tácticos</Label>
                        {fp.triggers.map((t, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={t}
                              onChange={(e) => updateListItem(f.key, fp, 'triggers', i, e.target.value)}
                              placeholder="Ej: Pérdida en campo rival"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeListItem(f.key, fp, 'triggers', i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addListItem(f.key, fp, 'triggers')}>
                          <Plus className="h-4 w-4 mr-1" /> Añadir trigger
                        </Button>
                      </div>

                      <PlanVideoClipsSelector
                        partidoId={partidoId}
                        equipoId={equipoId}
                        selectedIds={fp.video_clips || []}
                        onChange={(ids) => updateFase(f.key, { ...fp, video_clips: ids })}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        </TabsContent>

        {/* MOMENTOS */}
        <TabsContent value="momentos" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {(form.momentos_partido || []).map((m, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <select
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                        value={m.rango}
                        onChange={(e) => updateMomento(i, 'rango', e.target.value)}
                      >
                        {RANGOS_MOMENTO.map(r => <option key={r} value={r}>{r}'</option>)}
                      </select>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeMomento(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Estrategia para este tramo"
                    value={m.estrategia || ''}
                    onChange={(e) => updateMomento(i, 'estrategia', e.target.value)}
                    rows={2}
                  />
                  <Textarea
                    placeholder="Notas (cambios previstos, avisos...)"
                    value={m.notas || ''}
                    onChange={(e) => updateMomento(i, 'notas', e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addMomento}>
                <Plus className="h-4 w-4 mr-1" /> Añadir momento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESCENARIOS */}
        <TabsContent value="escenarios" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {(form.escenarios || []).map((e, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Condición (ej: 0-1 en contra min 60)"
                      value={e.condicion}
                      onChange={(ev) => updateEscenario(i, 'condicion', ev.target.value)}
                      className="flex-1 mr-2"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeEscenario(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Cambios de sistema (opcional)"
                    value={e.cambios_sistema || ''}
                    onChange={(ev) => updateEscenario(i, 'cambios_sistema', ev.target.value)}
                  />
                  <Textarea
                    placeholder="Ajustes tácticos"
                    value={e.ajustes_tacticos || ''}
                    onChange={(ev) => updateEscenario(i, 'ajustes_tacticos', ev.target.value)}
                    rows={2}
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addEscenario}>
                <Plus className="h-4 w-4 mr-1" /> Añadir escenario
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
