'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  X,
  Loader2,
  UserPlus,
  Users,
  AlertCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Jugador, jugadoresApi, POSICIONES } from '@/lib/api/jugadores'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey } from '@/lib/swr'
import {
  FICHA_ESTADO_LABELS,
  TIPO_JUGADOR_COLORS,
  TIPO_JUGADOR_LABELS,
  resolveFichaEstado,
  resolveTipoJugador,
} from '@/lib/jugadorTipo'
import type { TipoJugador } from '@/types'

type TipoExtra = Exclude<TipoJugador, 'plantilla'>

const TIPOS_EXTRA: { id: TipoExtra; label: string; hint: string }[] = [
  { id: 'juvenil', label: 'Juvenil', hint: 'Cantera / seguimiento con pre-ficha' },
  { id: 'prueba', label: 'Prueba', hint: 'Trial temporal con tracking de cargas' },
  { id: 'invitado', label: 'Invitado', hint: 'Solo identidad para sesiones' },
]

function ExtraModal({
  jugador,
  defaultTipo,
  equipos,
  onClose,
  onSave,
  saving,
}: {
  jugador?: Jugador
  defaultTipo: TipoExtra
  equipos: { id: string; nombre: string; categoria?: string }[]
  onClose: () => void
  onSave: (data: {
    nombre: string
    apellidos: string
    posicion_principal: string
    tipo_jugador: TipoExtra
    equipo_origen_id?: string
    notas?: string
    fecha_fin_prueba?: string
  }) => void
  saving: boolean
}) {
  const [nombre, setNombre] = useState(jugador?.nombre || '')
  const [apellidos, setApellidos] = useState(jugador?.apellidos || '')
  const [posicion, setPosicion] = useState(jugador?.posicion_principal || 'MC')
  const [tipo, setTipo] = useState<TipoExtra>(
    jugador ? (resolveTipoJugador(jugador) === 'plantilla' ? defaultTipo : (resolveTipoJugador(jugador) as TipoExtra)) : defaultTipo
  )
  const [equipoOrigenId, setEquipoOrigenId] = useState(jugador?.equipo_origen_id || '')
  const [notas, setNotas] = useState(jugador?.notas || '')
  const [fechaFinPrueba, setFechaFinPrueba] = useState(jugador?.fecha_fin_prueba || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !apellidos.trim()) return
    onSave({
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      posicion_principal: posicion,
      tipo_jugador: tipo,
      equipo_origen_id: equipoOrigenId || undefined,
      notas: notas.trim() || undefined,
      fecha_fin_prueba: tipo === 'prueba' ? fechaFinPrueba || undefined : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {jugador ? 'Editar jugador' : 'Alta rápida'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_EXTRA.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipo(t.id)}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium transition-colors ${
                    tipo === t.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{TIPOS_EXTRA.find((t) => t.id === tipo)?.hint}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Pablo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Garcia Lopez"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posicion *</label>
            <select
              value={posicion}
              onChange={(e) => setPosicion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              {Object.entries(POSICIONES).map(([code, pos]) => (
                <option key={code} value={code}>
                  {code} - {pos.nombre}
                </option>
              ))}
            </select>
          </div>

          {tipo === 'prueba' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin de prueba</label>
              <input
                type="date"
                value={fechaFinPrueba}
                onChange={(e) => setFechaFinPrueba(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipo de origen</label>
            <select
              value={equipoOrigenId}
              onChange={(e) => setEquipoOrigenId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-white"
            >
              <option value="">-- Sin especificar --</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} {eq.categoria ? `(${eq.categoria})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !nombre.trim() || !apellidos.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {jugador ? 'Guardar' : 'Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ExtraplantillaPage() {
  const { equipoActivo, equipos } = useEquipoStore()
  const [busqueda, setBusqueda] = useState('')
  const [tipoTab, setTipoTab] = useState<TipoExtra | 'todos'>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Jugador | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: jugadoresResponse, isLoading: loading } = useSWR<{ data: Jugador[]; total: number }>(
    apiKey('/jugadores', {
      equipo_id: equipoActivo?.id,
      organizacion_completa: true,
    }, ['equipo_id'])
  )

  const allJugadores = jugadoresResponse?.data || []
  const extras = useMemo(
    () => allJugadores.filter((j) => resolveTipoJugador(j) !== 'plantilla'),
    [allJugadores]
  )

  const counts = useMemo(() => {
    const c: Record<TipoExtra, number> = { juvenil: 0, prueba: 0, invitado: 0 }
    for (const j of extras) {
      const t = resolveTipoJugador(j) as TipoExtra
      if (t in c) c[t] += 1
    }
    return c
  }, [extras])

  const invalidate = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/jugadores'), undefined, { revalidate: true })
  }

  const handleAdd = async (data: {
    nombre: string
    apellidos: string
    posicion_principal: string
    tipo_jugador: TipoExtra
    equipo_origen_id?: string
    notas?: string
    fecha_fin_prueba?: string
  }) => {
    if (!equipoActivo) return
    setSaving(true)
    try {
      await jugadoresApi.create({
        equipo_id: equipoActivo.id,
        nombre: data.nombre,
        apellidos: data.apellidos,
        posicion_principal: data.posicion_principal,
        equipo_origen_id: data.equipo_origen_id,
        notas: data.notas,
        tipo_jugador: data.tipo_jugador,
        fecha_fin_prueba: data.fecha_fin_prueba,
        es_invitado: true,
        es_convocable: data.tipo_jugador !== 'invitado',
      })
      toast.success(`${TIPO_JUGADOR_LABELS[data.tipo_jugador]} creado`)
      setModalOpen(false)
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: {
    nombre: string
    apellidos: string
    posicion_principal: string
    tipo_jugador: TipoExtra
    equipo_origen_id?: string
    notas?: string
    fecha_fin_prueba?: string
  }) => {
    if (!editing) return
    setSaving(true)
    try {
      await jugadoresApi.update(editing.id, {
        nombre: data.nombre,
        apellidos: data.apellidos,
        posicion_principal: data.posicion_principal,
        equipo_origen_id: data.equipo_origen_id,
        notas: data.notas,
        tipo_jugador: data.tipo_jugador,
        fecha_fin_prueba: data.fecha_fin_prueba,
      })
      toast.success('Jugador actualizado')
      setEditing(null)
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este jugador?')) return
    try {
      await jugadoresApi.delete(id)
      toast.success('Jugador eliminado')
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    }
  }

  const handlePromover = async (jugador: Jugador) => {
    if (!confirm(`¿Promover a ${jugador.nombre} ${jugador.apellidos} a plantilla oficial?`)) return
    try {
      await jugadoresApi.promoverPlantilla(jugador.id)
      toast.success('Promovido a plantilla')
      invalidate()
    } catch (err: any) {
      toast.error(err?.message || 'Error al promover')
    }
  }

  const filtrados = extras.filter((i) => {
    const tipo = resolveTipoJugador(i)
    if (tipoTab !== 'todos' && tipo !== tipoTab) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    const fullName = `${i.nombre} ${i.apellidos}`.toLowerCase()
    return fullName.includes(q) || i.notas?.toLowerCase().includes(q)
  })

  if (!equipoActivo) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">Selecciona un equipo</h2>
        <p className="text-gray-500">Debes seleccionar un equipo para gestionar juveniles, pruebas e invitados</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/plantilla" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alta rápida</h1>
            <p className="text-gray-500">
              {extras.length} jugador{extras.length !== 1 ? 'es' : ''} fuera de plantilla oficial
            </p>
          </div>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Añadir
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <UserPlus className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900">Tipologías extraplantilla</h3>
            <p className="text-sm text-amber-700 mt-1">
              <strong>Juvenil</strong> (cantera, convocable en oficiales), <strong>Prueba</strong> (trial con cargas)
              e <strong>Invitado</strong> (solo sesiones). Puedes promoverlos a plantilla cuando corresponda.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTipoTab('todos')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
            tipoTab === 'todos' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          Todos ({extras.length})
        </button>
        {TIPOS_EXTRA.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTipoTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              tipoTab === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            {t.label} ({counts[t.id]})
          </button>
        ))}
      </div>

      {extras.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : extras.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nadie fuera de plantilla</h3>
          <p className="text-gray-500 mb-4">Añade juveniles, pruebas o invitados para entrenamientos</p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Añadir primero
          </button>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No se encontraron jugadores</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_90px_100px_1fr_100px_auto] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Jugador</span>
            <span>Tipo</span>
            <span>Posición</span>
            <span>Notas / ficha</span>
            <span>Origen</span>
            <span className="w-28" />
          </div>

          <div className="divide-y divide-gray-100">
            {filtrados.map((inv) => {
              const pos = POSICIONES[inv.posicion_principal as keyof typeof POSICIONES]
              const tipo = resolveTipoJugador(inv) as TipoExtra
              const ficha = resolveFichaEstado(inv)
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_90px_100px_1fr_100px_auto] gap-2 sm:gap-4 items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: pos?.color || '#6B7280' }}
                    >
                      {inv.nombre[0]}{inv.apellidos[0]}
                    </div>
                    <span className="font-medium text-gray-900 truncate">
                      {inv.nombre} {inv.apellidos}
                    </span>
                  </div>

                  <span className={`inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${TIPO_JUGADOR_COLORS[tipo]}`}>
                    {TIPO_JUGADOR_LABELS[tipo]}
                  </span>

                  <span
                    className="inline-flex w-fit items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: pos?.color || '#6B7280' }}
                  >
                    {inv.posicion_principal}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm text-gray-500 truncate">{inv.notas || '—'}</p>
                    <p className="text-[11px] text-gray-400">{FICHA_ESTADO_LABELS[ficha]}</p>
                  </div>

                  <span className="text-sm text-gray-500 truncate">{inv.equipos?.nombre || '—'}</span>

                  <div className="flex items-center gap-1 justify-end sm:w-28">
                    <button
                      onClick={() => handlePromover(inv)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Promover a plantilla"
                    >
                      <ArrowUpCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditing(inv)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(modalOpen || editing) && (
        <ExtraModal
          jugador={editing || undefined}
          defaultTipo={tipoTab === 'todos' ? 'juvenil' : tipoTab}
          equipos={equipos.filter((e) => e.id !== equipoActivo?.id)}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
          onSave={editing ? handleEdit : handleAdd}
          saving={saving}
        />
      )}
    </div>
  )
}
