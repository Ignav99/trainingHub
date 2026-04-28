'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Save,
  Loader2,
  Plus,
  X,
  Crosshair,
  Swords,
  Shield,
  Zap,
  ArrowRightLeft,
  Target,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEquipoStore } from '@/stores/equipoStore'
import { apiKey } from '@/lib/swr'
import { gameModelsApi } from '@/lib/api/gameModels'
import type { GameModel } from '@/types'

const FASES_TABS = [
  { key: 'principios_ataque_organizado', label: 'Ataque Organizado', icon: Swords, color: 'text-blue-600' },
  { key: 'principios_defensa_organizada', label: 'Defensa Organizada', icon: Shield, color: 'text-red-600' },
  { key: 'principios_transicion_of', label: 'Trans. Ofensiva', icon: Zap, color: 'text-green-600' },
  { key: 'principios_transicion_def', label: 'Trans. Defensiva', icon: ArrowRightLeft, color: 'text-orange-600' },
  { key: 'principios_balon_parado', label: 'Balon Parado', icon: Target, color: 'text-purple-600' },
] as const

type PrincipioKey = typeof FASES_TABS[number]['key']

const ESTILOS = ['Posicional', 'Directo', 'Contraataque', 'Mixto', 'Pressing alto', 'Pressing medio']
const PRESSING_TIPOS = ['Alto', 'Medio', 'Bajo']
const SALIDA_BALON = ['Corta', 'Larga', 'Mixta']

export default function ModeloJuegoPage() {
  const { equipoActivo } = useEquipoStore()
  const eid = equipoActivo?.id

  const { data: response, isLoading } = useSWR<{ data: GameModel[] }>(
    eid ? apiKey('/game-models', { equipo_id: eid }) : null
  )

  const gameModel = response?.data?.[0] || null

  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<PrincipioKey>('principios_ataque_organizado')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form state
  const [nombre, setNombre] = useState('Modelo de Juego')
  const [sistemaJuego, setSistemaJuego] = useState('')
  const [estilo, setEstilo] = useState('')
  const [descripcionGeneral, setDescripcionGeneral] = useState('')
  const [pressingTipo, setPressingTipo] = useState('')
  const [salidaBalon, setSalidaBalon] = useState('')

  const [principios, setPrincipios] = useState<Record<PrincipioKey, string[]>>({
    principios_ataque_organizado: [],
    principios_defensa_organizada: [],
    principios_transicion_of: [],
    principios_transicion_def: [],
    principios_balon_parado: [],
  })

  const [rolesPos, setRolesPos] = useState<Record<string, string>>({})

  // Load existing data
  useEffect(() => {
    if (gameModel) {
      setNombre(gameModel.nombre || 'Modelo de Juego')
      setSistemaJuego(gameModel.sistema_juego || '')
      setEstilo(gameModel.estilo || '')
      setDescripcionGeneral(gameModel.descripcion_general || '')
      setPressingTipo(gameModel.pressing_tipo || '')
      setSalidaBalon(gameModel.salida_balon || '')
      setPrincipios({
        principios_ataque_organizado: gameModel.principios_ataque_organizado || [],
        principios_defensa_organizada: gameModel.principios_defensa_organizada || [],
        principios_transicion_of: gameModel.principios_transicion_of || [],
        principios_transicion_def: gameModel.principios_transicion_def || [],
        principios_balon_parado: gameModel.principios_balon_parado || [],
      })
      setRolesPos(gameModel.roles_posicionales || {})
    }
  }, [gameModel])

  const addPrincipio = useCallback((fase: PrincipioKey) => {
    setPrincipios(prev => ({
      ...prev,
      [fase]: [...prev[fase], ''],
    }))
  }, [])

  const updatePrincipio = useCallback((fase: PrincipioKey, index: number, value: string) => {
    setPrincipios(prev => ({
      ...prev,
      [fase]: prev[fase].map((p, i) => i === index ? value : p),
    }))
  }, [])

  const removePrincipio = useCallback((fase: PrincipioKey, index: number) => {
    setPrincipios(prev => ({
      ...prev,
      [fase]: prev[fase].filter((_, i) => i !== index),
    }))
  }, [])

  const handleSave = async () => {
    if (!eid) return
    setSaving(true)
    setSaveSuccess(false)
    try {
      const payload = {
        nombre,
        sistema_juego: sistemaJuego || undefined,
        estilo: estilo || undefined,
        descripcion_general: descripcionGeneral || undefined,
        pressing_tipo: pressingTipo || undefined,
        salida_balon: salidaBalon || undefined,
        ...principios,
        roles_posicionales: Object.keys(rolesPos).length > 0 ? rolesPos : undefined,
      }

      if (gameModel) {
        await gameModelsApi.update(gameModel.id, payload)
      } else {
        await gameModelsApi.create({ equipo_id: eid, ...payload })
      }

      mutate((key: string) => typeof key === 'string' && key.includes('/game-models'), undefined, { revalidate: true })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      console.error('Error saving game model:', err)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Crosshair className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Modelo de Juego</h1>
            <p className="text-sm text-muted-foreground">{equipoActivo?.nombre}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* General info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Informacion General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Juego</label>
              <input
                type="text"
                value={sistemaJuego}
                onChange={e => setSistemaJuego(e.target.value)}
                placeholder="Ej: 1-4-3-3, 1-4-4-2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estilo de Juego</label>
              <select
                value={estilo}
                onChange={e => setEstilo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Seleccionar...</option>
                {ESTILOS.map(e => (
                  <option key={e} value={e.toLowerCase()}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pressing</label>
              <select
                value={pressingTipo}
                onChange={e => setPressingTipo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Seleccionar...</option>
                {PRESSING_TIPOS.map(p => (
                  <option key={p} value={p.toLowerCase()}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salida de Balon</label>
              <select
                value={salidaBalon}
                onChange={e => setSalidaBalon(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white"
              >
                <option value="">Seleccionar...</option>
                {SALIDA_BALON.map(s => (
                  <option key={s} value={s.toLowerCase()}>{s}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion General</label>
              <textarea
                value={descripcionGeneral}
                onChange={e => setDescripcionGeneral(e.target.value)}
                placeholder="Describe la filosofia de juego del equipo..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Principles by phase */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Principios por Fase</h2>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 border-b pb-3">
            {FASES_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Active tab content */}
          <div className="space-y-2">
            {principios[activeTab].map((principio, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6 text-right">{index + 1}.</span>
                <input
                  type="text"
                  value={principio}
                  onChange={e => updatePrincipio(activeTab, index, e.target.value)}
                  placeholder="Escribe un principio..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
                <button
                  onClick={() => removePrincipio(activeTab, index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addPrincipio(activeTab)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 mt-2"
            >
              <Plus className="h-4 w-4" />
              Anadir principio
            </button>
          </div>
        </div>

        {/* Positional roles */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Roles Posicionales</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Define las funciones especificas de cada posicion en tu modelo de juego.
          </p>
          <div className="space-y-3">
            {[
              'Portero', 'Lateral Derecho', 'Central Derecho', 'Central Izquierdo',
              'Lateral Izquierdo', 'Pivote', 'Interior Derecho', 'Interior Izquierdo',
              'Extremo Derecho', 'Extremo Izquierdo', 'Delantero Centro',
            ].map(pos => {
              const key = pos.toLowerCase().replace(/ /g, '_')
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{pos}</label>
                  <input
                    type="text"
                    value={rolesPos[key] || ''}
                    onChange={e => setRolesPos(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`Funciones del ${pos.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
