'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { rivalesApi } from '@/lib/api/partidos'
import type { InformeRivalEnriquecido, RivalJugadorClave, RivalPartidoHistorico } from '@/types'

interface Props {
  rivalId: string
  informe: InformeRivalEnriquecido | null
  onSaved: (informe: InformeRivalEnriquecido) => void
}

const emptyJugadorClave = (): RivalJugadorClave => ({
  nombre: '',
  dorsal: undefined,
  posicion: '',
  fortalezas: [],
  debilidades: [],
  tipo: 'neutral',
  notas: '',
})

const emptyPartido = (): RivalPartidoHistorico => ({
  rival_nombre: '',
  fecha: '',
  resultado: '',
  goles_favor: undefined,
  goles_contra: undefined,
  sistema_rival: '',
  notas: '',
})

export function InformeRivalEnriquecidoEditor({ rivalId, informe, onSaved }: Props) {
  const [form, setForm] = useState<Partial<InformeRivalEnriquecido>>({
    sistema_juego: informe?.sistema_juego || '',
    sistema_variantes: informe?.sistema_variantes || [],
    estilo: informe?.estilo || '',
    fortalezas: informe?.fortalezas || [],
    debilidades: informe?.debilidades || [],
    jugadores_clave: informe?.jugadores_clave || [],
    lesionados_sancionados: informe?.lesionados_sancionados || [],
    ultimos_partidos: informe?.ultimos_partidos || [],
    abp_ofensivo: informe?.abp_ofensivo || '',
    abp_defensivo: informe?.abp_defensivo || '',
    mapa_presion: informe?.mapa_presion || { altura_bloque: 'medio', tipo_presion: 'mixta', zonas: [] },
    notas: informe?.notas || '',
  })
  const [saving, setSaving] = useState(false)

  const updateField = <K extends keyof InformeRivalEnriquecido>(key: K, value: InformeRivalEnriquecido[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const addListItem = (key: 'fortalezas' | 'debilidades' | 'lesionados_sancionados' | 'sistema_variantes', value: string = '') => {
    setForm(prev => ({ ...prev, [key]: [...(prev[key] || []), value] }))
  }

  const updateListItem = (key: 'fortalezas' | 'debilidades' | 'lesionados_sancionados' | 'sistema_variantes', idx: number, value: string) => {
    const arr = [...(form[key] || [])]
    arr[idx] = value
    setForm(prev => ({ ...prev, [key]: arr }))
  }

  const removeListItem = (key: 'fortalezas' | 'debilidades' | 'lesionados_sancionados' | 'sistema_variantes', idx: number) => {
    const arr = [...(form[key] || [])]
    arr.splice(idx, 1)
    setForm(prev => ({ ...prev, [key]: arr }))
  }

  const updateJugador = (idx: number, field: keyof RivalJugadorClave, value: any) => {
    const jugadores = [...(form.jugadores_clave || [])]
    jugadores[idx] = { ...jugadores[idx], [field]: value }
    updateField('jugadores_clave', jugadores)
  }

  const addJugador = () => updateField('jugadores_clave', [...(form.jugadores_clave || []), emptyJugadorClave()])
  const removeJugador = (idx: number) => {
    const jugadores = [...(form.jugadores_clave || [])]
    jugadores.splice(idx, 1)
    updateField('jugadores_clave', jugadores)
  }

  const updateJugadorList = (idx: number, list: 'fortalezas' | 'debilidades', value: string[]) => {
    updateJugador(idx, list, value)
  }

  const updatePartido = (idx: number, field: keyof RivalPartidoHistorico, value: any) => {
    const partidos = [...(form.ultimos_partidos || [])]
    partidos[idx] = { ...partidos[idx], [field]: value }
    updateField('ultimos_partidos', partidos)
  }

  const addPartido = () => updateField('ultimos_partidos', [...(form.ultimos_partidos || []), emptyPartido()])
  const removePartido = (idx: number) => {
    const partidos = [...(form.ultimos_partidos || [])]
    partidos.splice(idx, 1)
    updateField('ultimos_partidos', partidos)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await rivalesApi.createInforme(rivalId, {
        ...form,
        rival_id: rivalId,
      })
      toast.success('Informe de rival guardado')
      onSaved(saved)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar informe')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Informe de rival enriquecido</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Guardar informe
        </Button>
      </div>

      {/* Sistema y estilo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Sistema de juego</Label>
          <Input
            placeholder="Ej: 4-2-3-1"
            value={form.sistema_juego || ''}
            onChange={(e) => updateField('sistema_juego', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Estilo</Label>
          <Input
            placeholder="Ej: Posesión, directo..."
            value={form.estilo || ''}
            onChange={(e) => updateField('estilo', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Altura bloque</Label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.mapa_presion?.altura_bloque || 'medio'}
            onChange={(e) => updateField('mapa_presion', { ...form.mapa_presion, altura_bloque: e.target.value })}
          >
            <option value="alto">Alto</option>
            <option value="medio">Medio</option>
            <option value="bajo">Bajo</option>
          </select>
        </div>
      </div>

      {/* Fortalezas / Debilidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Puntos fuertes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(form.fortalezas || []).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={f}
                  onChange={(e) => updateListItem('fortalezas', i, e.target.value)}
                  placeholder="Ej: Transiciones rápidas"
                />
                <Button variant="ghost" size="icon" onClick={() => removeListItem('fortalezas', i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addListItem('fortalezas')}>
              <Plus className="h-4 w-4 mr-1" /> Añadir
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              Debilidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(form.debilidades || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={d}
                  onChange={(e) => updateListItem('debilidades', i, e.target.value)}
                  placeholder="Ej: Espacios entre líneas"
                />
                <Button variant="ghost" size="icon" onClick={() => removeListItem('debilidades', i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addListItem('debilidades')}>
              <Plus className="h-4 w-4 mr-1" /> Añadir
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Jugadores clave */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Jugadores clave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.jugadores_clave || []).map((j, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <Input
                    placeholder="Nombre"
                    value={j.nombre}
                    onChange={(e) => updateJugador(i, 'nombre', e.target.value)}
                  />
                  <Input
                    placeholder="Dorsal"
                    type="number"
                    value={j.dorsal || ''}
                    onChange={(e) => updateJugador(i, 'dorsal', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                  <Input
                    placeholder="Posición"
                    value={j.posicion || ''}
                    onChange={(e) => updateJugador(i, 'posicion', e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeJugador(i)} className="ml-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Fortalezas (separadas por coma)"
                  value={j.fortalezas.join(', ')}
                  onChange={(e) => updateJugadorList(i, 'fortalezas', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
                <Input
                  placeholder="Debilidades (separadas por coma)"
                  value={j.debilidades.join(', ')}
                  onChange={(e) => updateJugadorList(i, 'debilidades', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={j.tipo === 'peligroso' ? 'destructive' : j.tipo === 'debilidad' ? 'secondary' : 'outline'}>
                  {j.tipo}
                </Badge>
                <select
                  className="text-sm rounded border bg-background px-2 py-1"
                  value={j.tipo}
                  onChange={(e) => updateJugador(i, 'tipo', e.target.value as any)}
                >
                  <option value="peligroso">Peligroso</option>
                  <option value="debilidad">Debilidad</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addJugador}>
            <Plus className="h-4 w-4 mr-1" /> Añadir jugador
          </Button>
        </CardContent>
      </Card>

      {/* Últimos partidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Últimos partidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(form.ultimos_partidos || []).map((p, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <Input
                    placeholder="Rival"
                    value={p.rival_nombre}
                    onChange={(e) => updatePartido(i, 'rival_nombre', e.target.value)}
                  />
                  <Input
                    type="date"
                    value={p.fecha || ''}
                    onChange={(e) => updatePartido(i, 'fecha', e.target.value)}
                  />
                  <Input
                    placeholder="Resultado (ej: 2-1)"
                    value={p.resultado || ''}
                    onChange={(e) => updatePartido(i, 'resultado', e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removePartido(i)} className="ml-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Goles a favor"
                  value={p.goles_favor || ''}
                  onChange={(e) => updatePartido(i, 'goles_favor', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  type="number"
                  placeholder="Goles en contra"
                  value={p.goles_contra || ''}
                  onChange={(e) => updatePartido(i, 'goles_contra', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  placeholder="Sistema rival"
                  value={p.sistema_rival || ''}
                  onChange={(e) => updatePartido(i, 'sistema_rival', e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPartido}>
            <Plus className="h-4 w-4 mr-1" /> Añadir partido
          </Button>
        </CardContent>
      </Card>

      {/* ABP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ABP ofensivo</Label>
          <Textarea
            rows={3}
            value={form.abp_ofensivo || ''}
            onChange={(e) => updateField('abp_ofensivo', e.target.value)}
            placeholder="Córners, faltas, saques de banda..."
          />
        </div>
        <div className="space-y-2">
          <Label>ABP defensivo</Label>
          <Textarea
            rows={3}
            value={form.abp_defensivo || ''}
            onChange={(e) => updateField('abp_defensivo', e.target.value)}
            placeholder="Defensa de córners, faltas, saques de banda..."
          />
        </div>
      </div>

      {/* Lesionados / sancionados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lesionados / sancionados del rival</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(form.lesionados_sancionados || []).map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={l}
                onChange={(e) => updateListItem('lesionados_sancionados', i, e.target.value)}
                placeholder="Ej: Juan García (lesión)"
              />
              <Button variant="ghost" size="icon" onClick={() => removeListItem('lesionados_sancionados', i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addListItem('lesionados_sancionados')}>
            <Plus className="h-4 w-4 mr-1" /> Añadir
          </Button>
        </CardContent>
      </Card>

      {/* Notas */}
      <div className="space-y-2">
        <Label>Notas adicionales</Label>
        <Textarea
          rows={3}
          value={form.notas || ''}
          onChange={(e) => updateField('notas', e.target.value)}
          placeholder="Observaciones generales..."
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Save className="h-4 w-4 mr-2" />
          Guardar informe
        </Button>
      </div>
    </div>
  )
}
