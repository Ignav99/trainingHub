'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
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
  FileText,
  Save,
  Swords,
  MapPin,
  Trash2,
  BarChart3,
  MessageSquare,
  Target,
  Shield,
  Flag,
  ArrowRightLeft,
  Eye,
  AlertTriangle,
  Zap,
  CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useEquipoStore } from '@/stores/equipoStore'
import { convocatoriasApi, CreateConvocatoriaData } from '@/lib/api/convocatorias'
import { estadisticasPartidoApi, EstadisticaPartidoUpdateData } from '@/lib/api/estadisticasPartido'
import { partidosApi } from '@/lib/api/partidos'
import { jugadoresApi, Jugador, POSICIONES } from '@/lib/api/jugadores'
import { FORMATIONS, Formation, FormationSlot } from '@/lib/formations'
import { apiKey } from '@/lib/swr'
import { formatDate } from '@/lib/utils'
import type { Convocatoria, Partido, PaginatedResponse, EstadisticaPartido } from '@/types'

// ============ Constants ============

const RESULTADO_COLORS: Record<string, string> = {
  victoria: 'bg-emerald-100 text-emerald-800',
  empate: 'bg-amber-100 text-amber-800',
  derrota: 'bg-red-100 text-red-800',
}

const RESULTADO_LABELS: Record<string, { label: string; color: string }> = {
  victoria: { label: 'Victoria', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  empate: { label: 'Empate', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  derrota: { label: 'Derrota', color: 'bg-red-100 text-red-800 border-red-300' },
}

const ZONA_ORDER: Record<string, number> = { porteria: 0, defensa: 1, mediocampo: 2, ataque: 3 }

const TEAM_STAT_FIELDS = [
  { key: 'tiros_a_puerta', label: 'Tiros a puerta' },
  { key: 'ocasiones_gol', label: 'Ocasiones de gol' },
  { key: 'saques_esquina', label: 'Saques de esquina' },
  { key: 'penaltis', label: 'Penaltis' },
  { key: 'fueras_juego', label: 'Fueras de juego' },
  { key: 'faltas_cometidas', label: 'Faltas cometidas' },
  { key: 'tarjetas_amarillas', label: 'T. Amarillas' },
  { key: 'tarjetas_rojas', label: 'T. Rojas' },
  { key: 'balones_perdidos', label: 'Balones perdidos' },
  { key: 'balones_recuperados', label: 'Balones recuperados' },
] as const

// Pre-partido default data
const DEFAULT_PRE_PARTIDO = {
  sistema_rival: '',
  info_rival: { posicion_liga: '', goles_favor: '', goles_contra: '', racha: ['', '', '', '', ''] },
  fase_ofensiva: {
    salida: { observaciones: '' },
    construccion: { observaciones: '' },
    finalizacion: { observaciones: '' },
  },
  fase_defensiva: {
    pressing: { observaciones: '' },
    bloque_medio: { observaciones: '' },
    bloque_bajo: { observaciones: '' },
  },
  transiciones: {
    ellos_recuperan: { observaciones: '' },
    ellos_pierden: { observaciones: '' },
  },
  abp: {
    atacan_corners: { observaciones: '' },
    defienden_corners: { observaciones: '' },
  },
  jugadores_clave: [] as { dorsal: string; nombre: string; posicion: string; notas: string; tipo: 'peligroso' | 'debilidad' }[],
  plan_partido: {
    enfoque_tactico: '',
    plan_ataque: '',
    plan_defensa: '',
    balon_parado: '',
    plan_sustituciones: '',
  },
}

// ============ Helpers ============

function getPositionColor(pos: string): string {
  const info = POSICIONES[pos as keyof typeof POSICIONES]
  if (!info) return 'bg-gray-100 text-gray-800'
  switch (info.zona) {
    case 'porteria': return 'bg-amber-100 text-amber-800'
    case 'defensa': return 'bg-blue-100 text-blue-800'
    case 'mediocampo': return 'bg-emerald-100 text-emerald-800'
    case 'ataque': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

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

// ============ Main Page ============

export default function PartidosPage() {
  const { equipoActivo } = useEquipoStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const matchParam = searchParams.get('match')
  const tabParam = searchParams.get('tab') || 'convocatoria'

  // ---- Data: partidos list ----
  const { data: partidosData, isLoading: loading } = useSWR<PaginatedResponse<Partido>>(
    apiKey('/partidos', {
      equipo_id: equipoActivo?.id,
      orden: 'fecha',
      direccion: 'desc',
      limit: 50,
    }, ['equipo_id'])
  )
  const allPartidos = partidosData?.data || []

  // Chronology split
  const { proximos, jugados } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const prox: Partido[] = []
    const past: Partido[] = []
    for (const p of allPartidos) {
      const fecha = new Date(p.fecha)
      fecha.setHours(0, 0, 0, 0)
      if (fecha >= today) prox.push(p)
      else past.push(p)
    }
    prox.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    past.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    return { proximos: prox, jugados: past }
  }, [allPartidos])

  // Selected match
  const [selectedId, setSelectedId] = useState<string | null>(matchParam)

  const selectedPartido = useMemo(
    () => allPartidos.find((p) => p.id === selectedId) || null,
    [allPartidos, selectedId]
  )

  // Auto-select next match on load
  useEffect(() => {
    if (matchParam) {
      setSelectedId(matchParam)
      return
    }
    if (!selectedId && proximos.length > 0) {
      setSelectedId(proximos[0].id)
    } else if (!selectedId && jugados.length > 0) {
      setSelectedId(jugados[0].id)
    }
  }, [matchParam, proximos, jugados]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectMatch = (id: string) => {
    setSelectedId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('match', id)
    router.replace(`/partidos?${params.toString()}`, { scroll: false })
  }

  const setTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedId) params.set('match', selectedId)
    if (tab === 'convocatoria') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/partidos?${params.toString()}`, { scroll: false })
  }

  // ---- Data: convocatoria for selected match ----
  const { data: convocadosData, isLoading: loadingConv } = useSWR<{ data: Convocatoria[]; total: number }>(
    selectedId ? apiKey(`/convocatorias/partido/${selectedId}`) : null
  )
  const convocados = convocadosData?.data || []
  const titulares = convocados.filter((c) => c.titular)
  const suplentes = convocados.filter((c) => !c.titular)

  // ---- Data: estadisticas for selected match ----
  const { data: estadisticasData } = useSWR<EstadisticaPartido>(
    selectedId ? apiKey(`/estadisticas-partido/${selectedId}`) : null
  )

  // ---- Convocatoria state ----
  const [showAdd, setShowAdd] = useState(false)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [loadingJug, setLoadingJug] = useState(false)
  const [selected, setSelected] = useState<Record<string, { titular: boolean; dorsal?: number; posicion?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddPos, setQuickAddPos] = useState('MC')
  const [quickAddSaving, setQuickAddSaving] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Formation builder state
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null)
  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>({})
  const [pickingSlot, setPickingSlot] = useState<string | null>(null)
  const [swapSource, setSwapSource] = useState<string | null>(null)
  const [savingLineup, setSavingLineup] = useState(false)

  // ---- Informe state ----
  const [showResult, setShowResult] = useState(false)
  const [resultForm, setResultForm] = useState({ goles_favor: 0, goles_contra: 0, notas_post: '' })
  const [savingResult, setSavingResult] = useState(false)
  const [generatingInforme, setGeneratingInforme] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Team stats local state (for post-partido tab)
  const [teamStats, setTeamStats] = useState<Record<string, number>>({})
  const [comentarioTactico, setComentarioTactico] = useState('')
  const [playerStats, setPlayerStats] = useState<Record<string, { minutos_jugados: number; goles: number; asistencias: number; tarjeta_amarilla: boolean; tarjeta_roja: boolean }>>({})
  const [savingInforme, setSavingInforme] = useState(false)
  const [informeInitialized, setInformeInitialized] = useState<string | null>(null)

  // ---- Pre-partido state ----
  const [prePartido, setPrePartido] = useState(structuredClone(DEFAULT_PRE_PARTIDO))
  const [savingPre, setSavingPre] = useState(false)
  const [preInitialized, setPreInitialized] = useState<string | null>(null)

  // Initialize pre-partido data from partido.notas_pre
  useEffect(() => {
    if (!selectedPartido) return
    if (preInitialized === selectedPartido.id) return

    if (selectedPartido.notas_pre) {
      try {
        const parsed = JSON.parse(selectedPartido.notas_pre)
        setPrePartido({
          sistema_rival: parsed.sistema_rival || selectedPartido.rival?.sistema_juego || '',
          info_rival: {
            posicion_liga: parsed.info_rival?.posicion_liga || '',
            goles_favor: parsed.info_rival?.goles_favor || '',
            goles_contra: parsed.info_rival?.goles_contra || '',
            racha: parsed.info_rival?.racha || ['', '', '', '', ''],
          },
          fase_ofensiva: parsed.fase_ofensiva || DEFAULT_PRE_PARTIDO.fase_ofensiva,
          fase_defensiva: parsed.fase_defensiva || DEFAULT_PRE_PARTIDO.fase_defensiva,
          transiciones: parsed.transiciones || DEFAULT_PRE_PARTIDO.transiciones,
          abp: parsed.abp || DEFAULT_PRE_PARTIDO.abp,
          jugadores_clave: parsed.jugadores_clave || [],
          plan_partido: parsed.plan_partido || DEFAULT_PRE_PARTIDO.plan_partido,
        })
      } catch {
        setPrePartido({
          ...structuredClone(DEFAULT_PRE_PARTIDO),
          sistema_rival: selectedPartido.rival?.sistema_juego || '',
        })
      }
    } else {
      setPrePartido({
        ...structuredClone(DEFAULT_PRE_PARTIDO),
        sistema_rival: selectedPartido.rival?.sistema_juego || '',
      })
    }
    setPreInitialized(selectedPartido.id)
  }, [selectedPartido?.id, selectedPartido?.notas_pre]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pre init when match changes
  useEffect(() => {
    setPreInitialized(null)
  }, [selectedId])

  // Initialize informe data from fetched stats + convocados
  useEffect(() => {
    if (!selectedId) return
    if (informeInitialized === selectedId) return

    // Team stats
    if (estadisticasData) {
      const stats: Record<string, number> = {}
      for (const field of TEAM_STAT_FIELDS) {
        stats[field.key] = (estadisticasData as any)[field.key] || 0
        stats[`rival_${field.key}`] = (estadisticasData as any)[`rival_${field.key}`] || 0
      }
      setTeamStats(stats)
      setComentarioTactico(estadisticasData.comentario_tactico || '')
    } else {
      setTeamStats({})
      setComentarioTactico('')
    }

    // Player stats from convocados
    if (convocados.length > 0) {
      const ps: Record<string, { minutos_jugados: number; goles: number; asistencias: number; tarjeta_amarilla: boolean; tarjeta_roja: boolean }> = {}
      for (const c of convocados) {
        ps[c.id] = {
          minutos_jugados: c.minutos_jugados || 0,
          goles: c.goles || 0,
          asistencias: c.asistencias || 0,
          tarjeta_amarilla: c.tarjeta_amarilla || false,
          tarjeta_roja: c.tarjeta_roja || false,
        }
      }
      setPlayerStats(ps)
    }

    setInformeInitialized(selectedId)
  }, [selectedId, estadisticasData, convocados]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset informe init when match changes
  useEffect(() => {
    setInformeInitialized(null)
  }, [selectedId])

  // Load saved formation from partido.notas_pre
  useEffect(() => {
    if (!selectedPartido) {
      setSelectedFormation(null)
      setSlotAssignments({})
      return
    }
    if (selectedPartido.notas_pre) {
      try {
        const parsed = JSON.parse(selectedPartido.notas_pre)
        if (parsed.formacion) {
          setSelectedFormation(parsed.formacion)
          setSlotAssignments(parsed.formacion_slots || {})
        } else {
          setSelectedFormation(null)
          setSlotAssignments({})
        }
      } catch {
        setSelectedFormation(null)
        setSlotAssignments({})
      }
    } else {
      setSelectedFormation(null)
      setSlotAssignments({})
    }
  }, [selectedPartido?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeFormation = FORMATIONS.find((f) => f.name === selectedFormation) || null

  const autoPopulateSlots = (formation: Formation) => {
    const assignments: Record<string, string> = {}
    const usedConvIds = new Set<string>()
    for (const slot of formation.slots) {
      const match = convocados.find((c) => {
        if (usedConvIds.has(c.id)) return false
        const p = getPlayerData(c)
        const pos = c.posicion_asignada || p?.posicion_principal || ''
        return pos === slot.position
      })
      if (match) {
        assignments[slot.id] = match.id
        usedConvIds.add(match.id)
      }
    }
    return assignments
  }

  const sortJugadoresByPosition = (list: Jugador[]) => {
    return [...list].sort((a, b) => {
      const posA = POSICIONES[a.posicion_principal as keyof typeof POSICIONES]
      const posB = POSICIONES[b.posicion_principal as keyof typeof POSICIONES]
      const zA = posA ? (ZONA_ORDER[posA.zona] ?? 99) : 99
      const zB = posB ? (ZONA_ORDER[posB.zona] ?? 99) : 99
      if (zA !== zB) return zA - zB
      return (a.dorsal || 99) - (b.dorsal || 99)
    })
  }

  // ============ Handlers: Convocatoria ============

  const openAddDialog = () => {
    if (!equipoActivo?.id) return
    setShowAdd(true)
    setSelected({})
    setLoadingJug(true)
    jugadoresApi
      .list({ equipo_id: equipoActivo.id, estado: 'activo', organizacion_completa: true })
      .then((res) => setJugadores(res?.data || []))
      .catch(console.error)
      .finally(() => setLoadingJug(false))
  }

  const ownJugadores = useMemo(
    () => sortJugadoresByPosition(jugadores.filter((j) => j.equipo_id === equipoActivo?.id && !j.es_invitado)),
    [jugadores, equipoActivo?.id] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const invitadoJugadores = useMemo(
    () => sortJugadoresByPosition(jugadores.filter((j) => j.es_invitado)),
    [jugadores] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const crossTeamJugadores = useMemo(
    () => sortJugadoresByPosition(jugadores.filter((j) => j.equipo_id !== equipoActivo?.id && !j.es_invitado)),
    [jugadores, equipoActivo?.id] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleQuickAddInvitado = async () => {
    if (!equipoActivo?.id || !quickAddName.trim()) return
    setQuickAddSaving(true)
    try {
      const parts = quickAddName.trim().split(' ')
      const nombre = parts[0]
      const apellidos = parts.slice(1).join(' ') || ''
      const created = await jugadoresApi.create({
        equipo_id: equipoActivo.id,
        nombre,
        apellidos,
        posicion_principal: quickAddPos,
        es_invitado: true,
        es_convocable: true,
        nivel_tecnico: 5,
        nivel_tactico: 5,
        nivel_fisico: 5,
        nivel_mental: 5,
      })
      setJugadores((prev) => [...prev, created])
      setSelected((prev) => ({
        ...prev,
        [created.id]: { titular: false, dorsal: undefined, posicion: quickAddPos },
      }))
      setQuickAddName('')
      setQuickAddPos('MC')
      setShowQuickAdd(false)
    } catch (err) {
      console.error('Error creating invitado:', err)
    } finally {
      setQuickAddSaving(false)
    }
  }

  const togglePlayer = (jugador: Jugador) => {
    setSelected((prev) => {
      const copy = { ...prev }
      if (copy[jugador.id]) delete copy[jugador.id]
      else copy[jugador.id] = { titular: false, dorsal: jugador.dorsal || undefined, posicion: jugador.posicion_principal }
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
      mutate((key: string) => typeof key === 'string' && key.includes('/convocatorias'), undefined, { revalidate: true })
    } catch (err: any) {
      alert(err.message || 'Error al crear convocatoria')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveConvocado = async (convId: string) => {
    setSlotAssignments((prev) => {
      const copy = { ...prev }
      for (const [slotId, cId] of Object.entries(copy)) {
        if (cId === convId) delete copy[slotId]
      }
      return copy
    })
    try {
      await convocatoriasApi.delete(convId)
      mutate((key: string) => typeof key === 'string' && key.includes('/convocatorias'), undefined, { revalidate: true })
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

  // Formation builder handlers
  const handleSlotClick = (slot: FormationSlot) => {
    const assignedConvId = slotAssignments[slot.id]
    if (assignedConvId) {
      if (swapSource) {
        if (swapSource === slot.id) {
          setSwapSource(null)
        } else {
          setSlotAssignments((prev) => {
            const copy = { ...prev }
            const temp = copy[swapSource]
            copy[swapSource] = copy[slot.id]
            copy[slot.id] = temp
            return copy
          })
          setSwapSource(null)
        }
      } else {
        setSwapSource(slot.id)
      }
    } else {
      if (swapSource) {
        setSlotAssignments((prev) => {
          const copy = { ...prev }
          copy[slot.id] = copy[swapSource]
          delete copy[swapSource]
          return copy
        })
        setSwapSource(null)
      } else {
        setPickingSlot(slot.id)
      }
    }
  }

  const handlePickPlayer = (convId: string) => {
    if (!pickingSlot) return
    setSlotAssignments((prev) => {
      const copy = { ...prev }
      for (const [slotId, cId] of Object.entries(copy)) {
        if (cId === convId) delete copy[slotId]
      }
      copy[pickingSlot] = convId
      return copy
    })
    setPickingSlot(null)
  }

  const handleRemoveFromSlot = (slotId: string) => {
    setSlotAssignments((prev) => {
      const copy = { ...prev }
      delete copy[slotId]
      return copy
    })
    setSwapSource(null)
  }

  const handleSaveLineup = async () => {
    if (!selectedPartido || !activeFormation) return
    setSavingLineup(true)
    try {
      const updatePromises: Promise<any>[] = []
      for (const slot of activeFormation.slots) {
        const convId = slotAssignments[slot.id]
        if (convId) {
          updatePromises.push(
            convocatoriasApi.update(convId, { posicion_asignada: slot.position, titular: true })
          )
        }
      }
      await Promise.all(updatePromises)

      let existingData: Record<string, any> = {}
      if (selectedPartido.notas_pre) {
        try { existingData = JSON.parse(selectedPartido.notas_pre) } catch { existingData = {} }
      }
      const merged = { ...existingData, formacion: selectedFormation, formacion_slots: slotAssignments }
      await partidosApi.update(selectedPartido.id, { notas_pre: JSON.stringify(merged) })

      mutate((key: string) => typeof key === 'string' && (key.includes('/convocatorias') || key.includes('/partidos')), undefined, { revalidate: true })
    } catch (err) {
      console.error('Error saving lineup:', err)
      alert('Error al guardar la alineacion')
    } finally {
      setSavingLineup(false)
    }
  }

  // Player picker helpers
  const assignedConvIds = new Set(Object.values(slotAssignments))
  const pickingSlotData = activeFormation?.slots.find((s) => s.id === pickingSlot)
  const sortedForPicker = [...convocados].sort((a, b) => {
    if (!pickingSlotData) return 0
    const aPos = a.posicion_asignada || getPlayerData(a)?.posicion_principal || ''
    const bPos = b.posicion_asignada || getPlayerData(b)?.posicion_principal || ''
    return (aPos === pickingSlotData.position ? 0 : 1) - (bPos === pickingSlotData.position ? 0 : 1)
  })

  // ============ Handlers: Pre-partido ============

  const handleSavePrePartido = async () => {
    if (!selectedPartido) return
    setSavingPre(true)
    try {
      let existingData: Record<string, any> = {}
      if (selectedPartido.notas_pre) {
        try { existingData = JSON.parse(selectedPartido.notas_pre) } catch { existingData = {} }
      }
      const merged = {
        ...existingData,
        sistema_rival: prePartido.sistema_rival,
        info_rival: prePartido.info_rival,
        fase_ofensiva: prePartido.fase_ofensiva,
        fase_defensiva: prePartido.fase_defensiva,
        transiciones: prePartido.transiciones,
        abp: prePartido.abp,
        jugadores_clave: prePartido.jugadores_clave,
        plan_partido: prePartido.plan_partido,
      }
      await partidosApi.update(selectedPartido.id, { notas_pre: JSON.stringify(merged) })
      mutate((key: string) => typeof key === 'string' && key.includes('/partidos'), undefined, { revalidate: true })
    } catch (err: any) {
      alert(err.message || 'Error al guardar pre-partido')
    } finally {
      setSavingPre(false)
    }
  }

  // ============ Handlers: Post-partido ============

  const handleSaveResult = async () => {
    if (!selectedId) return
    setSavingResult(true)
    try {
      await partidosApi.registrarResultado(selectedId, resultForm.goles_favor, resultForm.goles_contra, resultForm.notas_post || undefined)
      mutate((key: string) => typeof key === 'string' && key.includes('/partidos'), undefined, { revalidate: true })
      setShowResult(false)
    } catch (err: any) {
      alert(err.message || 'Error al registrar resultado')
    } finally {
      setSavingResult(false)
    }
  }

  const handleGenerarInforme = async () => {
    if (!selectedId) return
    setGeneratingInforme(true)
    try {
      const result = await partidosApi.generarInforme(selectedId)
      if (result.informe_url) {
        window.open(result.informe_url, '_blank')
        mutate((key: string) => typeof key === 'string' && key.includes('/partidos'), undefined, { revalidate: true })
      }
    } catch (err: any) {
      alert(err.message || 'Error al generar el informe')
    } finally {
      setGeneratingInforme(false)
    }
  }

  const handleDeletePartido = async () => {
    if (!selectedId) return
    setDeleting(true)
    try {
      await partidosApi.delete(selectedId)
      mutate((key: string) => typeof key === 'string' && key.includes('/partidos'), undefined, { revalidate: true })
      setSelectedId(null)
      setShowDelete(false)
      router.replace('/partidos')
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveInforme = async () => {
    if (!selectedId) return
    setSavingInforme(true)
    try {
      // 1. Save team stats
      const statsPayload: EstadisticaPartidoUpdateData = {
        comentario_tactico: comentarioTactico,
      }
      for (const field of TEAM_STAT_FIELDS) {
        (statsPayload as any)[field.key] = teamStats[field.key] || 0;
        (statsPayload as any)[`rival_${field.key}`] = teamStats[`rival_${field.key}`] || 0
      }
      await estadisticasPartidoApi.upsert(selectedId, statsPayload)

      // 2. Batch update player stats
      const updates = Object.entries(playerStats).map(([convId, stats]) => ({
        id: convId,
        ...stats,
      }))
      if (updates.length > 0) {
        await convocatoriasApi.batchUpdateStats(updates)
      }

      // Revalidate
      mutate((key: string) => typeof key === 'string' && (key.includes('/estadisticas-partido') || key.includes('/convocatorias')), undefined, { revalidate: true })
    } catch (err: any) {
      alert(err.message || 'Error al guardar informe')
    } finally {
      setSavingInforme(false)
    }
  }

  // ============ Render: Left panel partido button ============

  const renderPartidoButton = (partido: Partido, isNext?: boolean) => (
    <button
      key={partido.id}
      onClick={() => selectMatch(partido.id)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selectedId === partido.id
          ? 'border-primary bg-primary/5'
          : isNext
            ? 'border-primary/30 bg-primary/[0.02] hover:bg-primary/5'
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
  )

  // ============ Render ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" />
            Partidos
          </h1>
          <p className="text-muted-foreground mt-1">Pre-partido, convocatoria y post-partido</p>
        </div>
        <Button asChild>
          <Link href="/partidos/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Partido
          </Link>
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: match list */}
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : allPartidos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Swords className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">Sin partidos</p>
                <Button asChild size="sm">
                  <Link href="/partidos/nuevo">
                    <Plus className="h-4 w-4 mr-2" /> Nuevo Partido
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {proximos.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-1.5 text-primary flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Proximos ({proximos.length})
                  </h2>
                  <div className="space-y-1">
                    {proximos.map((p, i) => renderPartidoButton(p, i === 0))}
                  </div>
                </div>
              )}
              {jugados.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-1.5 text-muted-foreground flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" />
                    Jugados ({jugados.length})
                  </h2>
                  <div className="space-y-1">
                    {jugados.map((p) => renderPartidoButton(p))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: tabbed content */}
        <div className="lg:col-span-3">
          {!selectedPartido ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">Selecciona un partido</h3>
                <p className="text-sm text-muted-foreground">
                  Elige un partido de la lista para gestionar
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Match header */}
              <div className="mb-4">
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

              <Tabs value={tabParam} onValueChange={setTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="pre-partido" className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    Pre-partido
                  </TabsTrigger>
                  <TabsTrigger value="convocatoria" className="gap-1.5">
                    <Users className="h-4 w-4" />
                    Convocatoria
                  </TabsTrigger>
                  <TabsTrigger value="post-partido" className="gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    Post-partido
                  </TabsTrigger>
                </TabsList>

                {/* ==================== TAB: PRE-PARTIDO ==================== */}
                <TabsContent value="pre-partido" className="space-y-6">
                  {/* Header info rival */}
                  <Card className="bg-slate-900 text-white border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-700 text-white text-sm">{selectedPartido.rival?.nombre || 'Rival'}</Badge>
                          <Input
                            value={prePartido.sistema_rival}
                            onChange={(e) => setPrePartido((p) => ({ ...p, sistema_rival: e.target.value }))}
                            placeholder="Sistema (ej: 4-2-3-1)"
                            className="w-36 h-8 text-sm bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Pos:</span>
                          <Input
                            value={prePartido.info_rival.posicion_liga}
                            onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, posicion_liga: e.target.value } }))}
                            placeholder="#"
                            className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">GF:</span>
                          <Input
                            value={prePartido.info_rival.goles_favor}
                            onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, goles_favor: e.target.value } }))}
                            placeholder="0"
                            className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                          />
                          <span className="text-xs text-slate-400">GC:</span>
                          <Input
                            value={prePartido.info_rival.goles_contra}
                            onChange={(e) => setPrePartido((p) => ({ ...p, info_rival: { ...p.info_rival, goles_contra: e.target.value } }))}
                            placeholder="0"
                            className="w-14 h-8 text-sm bg-slate-800 border-slate-600 text-white text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 mr-1">Racha:</span>
                          {prePartido.info_rival.racha.map((r, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                const next = r === 'V' ? 'E' : r === 'E' ? 'D' : r === 'D' ? '' : 'V'
                                setPrePartido((p) => {
                                  const racha = [...p.info_rival.racha]
                                  racha[i] = next
                                  return { ...p, info_rival: { ...p.info_rival, racha } }
                                })
                              }}
                              className={`w-7 h-7 rounded text-xs font-bold flex items-center justify-center transition-colors ${
                                r === 'V' ? 'bg-emerald-600 text-white' :
                                r === 'E' ? 'bg-amber-500 text-white' :
                                r === 'D' ? 'bg-red-600 text-white' :
                                'bg-slate-700 text-slate-400 hover:bg-slate-600'
                              }`}
                            >
                              {r || '-'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 1: Fase Ofensiva */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                      <h3 className="font-bold text-sm">Fase Ofensiva</h3>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Ataque</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <PrePartidoCard
                        title="VS Bloque Alto — Salida"
                        value={prePartido.fase_ofensiva.salida.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, salida: { observaciones: v } } }))}
                        color="emerald"
                      />
                      <PrePartidoCard
                        title="VS Bloque Medio — Construccion"
                        value={prePartido.fase_ofensiva.construccion.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, construccion: { observaciones: v } } }))}
                        color="emerald"
                      />
                      <PrePartidoCard
                        title="VS Bloque Bajo — Finalizacion"
                        value={prePartido.fase_ofensiva.finalizacion.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_ofensiva: { ...p.fase_ofensiva, finalizacion: { observaciones: v } } }))}
                        color="emerald"
                      />
                    </div>
                  </div>

                  {/* Section 2: Fase Defensiva */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                      <h3 className="font-bold text-sm">Fase Defensiva</h3>
                      <Badge className="bg-red-100 text-red-800 text-[10px]">Defensa</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <PrePartidoCard
                        title="Pressing Alto"
                        value={prePartido.fase_defensiva.pressing.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, pressing: { observaciones: v } } }))}
                        color="red"
                      />
                      <PrePartidoCard
                        title="Bloque Medio"
                        value={prePartido.fase_defensiva.bloque_medio.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, bloque_medio: { observaciones: v } } }))}
                        color="red"
                      />
                      <PrePartidoCard
                        title="Bloque Bajo"
                        value={prePartido.fase_defensiva.bloque_bajo.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, fase_defensiva: { ...p.fase_defensiva, bloque_bajo: { observaciones: v } } }))}
                        color="red"
                      />
                    </div>

                    {/* Transiciones */}
                    <div className="flex items-center gap-2 mt-4 mb-3">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">Transiciones</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PrePartidoCard
                        title="Ellos recuperan — DEF→ATQ"
                        value={prePartido.transiciones.ellos_recuperan.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, transiciones: { ...p.transiciones, ellos_recuperan: { observaciones: v } } }))}
                        color="red"
                        icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                      />
                      <PrePartidoCard
                        title="Ellos pierden — ATQ→DEF"
                        value={prePartido.transiciones.ellos_pierden.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, transiciones: { ...p.transiciones, ellos_pierden: { observaciones: v } } }))}
                        color="emerald"
                        icon={<Zap className="h-3.5 w-3.5 text-emerald-500" />}
                      />
                    </div>
                  </div>

                  {/* Section 3: ABP */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                      <h3 className="font-bold text-sm">Acciones a Balon Parado</h3>
                      <Badge className="bg-purple-100 text-purple-800 text-[10px]">ABP</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PrePartidoCard
                        title="Como atacan corners"
                        value={prePartido.abp.atacan_corners.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, abp: { ...p.abp, atacan_corners: { observaciones: v } } }))}
                        color="purple"
                      />
                      <PrePartidoCard
                        title="Como defienden corners"
                        value={prePartido.abp.defienden_corners.observaciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, abp: { ...p.abp, defienden_corners: { observaciones: v } } }))}
                        color="purple"
                      />
                    </div>
                  </div>

                  {/* Section: Jugadores Clave */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                        <Users className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="font-bold text-sm">Jugadores Clave del Rival</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {prePartido.jugadores_clave.map((jc, idx) => (
                        <Card key={idx} className={`border ${jc.tipo === 'peligroso' ? 'border-amber-400/50 bg-amber-50/50' : 'border-emerald-400/50 bg-emerald-50/50'}`}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={jc.dorsal}
                                onChange={(e) => {
                                  const jcs = [...prePartido.jugadores_clave]
                                  jcs[idx] = { ...jcs[idx], dorsal: e.target.value }
                                  setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                                }}
                                placeholder="#"
                                className="w-12 h-7 text-xs text-center"
                              />
                              <Input
                                value={jc.nombre}
                                onChange={(e) => {
                                  const jcs = [...prePartido.jugadores_clave]
                                  jcs[idx] = { ...jcs[idx], nombre: e.target.value }
                                  setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                                }}
                                placeholder="Nombre"
                                className="flex-1 h-7 text-xs"
                              />
                              <Input
                                value={jc.posicion}
                                onChange={(e) => {
                                  const jcs = [...prePartido.jugadores_clave]
                                  jcs[idx] = { ...jcs[idx], posicion: e.target.value }
                                  setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                                }}
                                placeholder="Pos"
                                className="w-14 h-7 text-xs text-center"
                              />
                              <button
                                onClick={() => {
                                  const jcs = [...prePartido.jugadores_clave]
                                  jcs[idx] = { ...jcs[idx], tipo: jcs[idx].tipo === 'peligroso' ? 'debilidad' : 'peligroso' }
                                  setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${jc.tipo === 'peligroso' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}
                              >
                                {jc.tipo === 'peligroso' ? 'Peligro' : 'Debil'}
                              </button>
                              <button
                                onClick={() => {
                                  const jcs = prePartido.jugadores_clave.filter((_, i) => i !== idx)
                                  setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                                }}
                                className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <Textarea
                              value={jc.notas}
                              onChange={(e) => {
                                const jcs = [...prePartido.jugadores_clave]
                                jcs[idx] = { ...jcs[idx], notas: e.target.value }
                                setPrePartido((p) => ({ ...p, jugadores_clave: jcs }))
                              }}
                              placeholder="Caracteristicas, puntos fuertes/debiles..."
                              rows={2}
                              className="text-xs resize-none"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    {prePartido.jugadores_clave.length < 4 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setPrePartido((p) => ({
                          ...p,
                          jugadores_clave: [...p.jugadores_clave, { dorsal: '', nombre: '', posicion: '', notas: '', tipo: 'peligroso' }],
                        }))}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Jugador clave
                      </Button>
                    )}
                  </div>

                  {/* Section: Nuestro Plan */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        <Target className="h-3.5 w-3.5" />
                      </span>
                      <h3 className="font-bold text-sm">Nuestro Plan</h3>
                      <Badge className="bg-blue-100 text-blue-800 text-[10px]">Plan</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <PlanField
                        icon={<Target className="h-4 w-4 text-blue-500" />}
                        label="Enfoque Tactico"
                        value={prePartido.plan_partido.enfoque_tactico}
                        onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, enfoque_tactico: v } }))}
                      />
                      <PlanField
                        icon={<Swords className="h-4 w-4 text-red-500" />}
                        label="Plan de Ataque"
                        value={prePartido.plan_partido.plan_ataque}
                        onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_ataque: v } }))}
                      />
                      <PlanField
                        icon={<Shield className="h-4 w-4 text-blue-500" />}
                        label="Plan Defensivo"
                        value={prePartido.plan_partido.plan_defensa}
                        onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_defensa: v } }))}
                      />
                      <PlanField
                        icon={<Flag className="h-4 w-4 text-purple-500" />}
                        label="Balon Parado"
                        value={prePartido.plan_partido.balon_parado}
                        onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, balon_parado: v } }))}
                      />
                      <PlanField
                        icon={<ArrowRightLeft className="h-4 w-4 text-amber-500" />}
                        label="Plan de Sustituciones"
                        value={prePartido.plan_partido.plan_sustituciones}
                        onChange={(v) => setPrePartido((p) => ({ ...p, plan_partido: { ...p.plan_partido, plan_sustituciones: v } }))}
                        className="md:col-span-2"
                      />
                    </div>
                  </div>

                  {/* Save button */}
                  <Button onClick={handleSavePrePartido} disabled={savingPre} className="w-full">
                    {savingPre ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Pre-partido
                  </Button>
                </TabsContent>

                {/* ==================== TAB: CONVOCATORIA ==================== */}
                <TabsContent value="convocatoria" className="space-y-4">
                  {/* Actions bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={openAddDialog} size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convocar
                    </Button>
                    {convocados.length > 0 && (
                      <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={generatingPdf}>
                        {generatingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                        PDF
                      </Button>
                    )}
                  </div>

                  {loadingConv ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                    </div>
                  ) : convocados.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <h3 className="font-medium mb-1">Sin convocados</h3>
                        <p className="text-sm text-muted-foreground mb-4">Anade jugadores a la convocatoria</p>
                        <Button onClick={openAddDialog} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Convocar jugadores
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {/* Formation selector */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Shirt className="h-4 w-4 text-primary" />
                            Alineacion
                            {selectedFormation && (
                              <Badge className="bg-primary/10 text-primary text-[10px]">{selectedFormation}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {FORMATIONS.map((f) => (
                              <button
                                key={f.name}
                                onClick={() => {
                                  if (selectedFormation === f.name) {
                                    setSelectedFormation(null)
                                    setSlotAssignments({})
                                    setSwapSource(null)
                                  } else {
                                    setSelectedFormation(f.name)
                                    setSlotAssignments(autoPopulateSlots(f))
                                    setSwapSource(null)
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                  selectedFormation === f.name
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>

                          {/* Main layout: pitch + suplentes sidebar */}
                          {activeFormation ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {/* Pitch (3/4) */}
                              <div className="md:col-span-3">
                                <div className="relative bg-emerald-600/90 rounded-xl overflow-hidden mx-auto" style={{ aspectRatio: '3/4' }}>
                                  <div className="absolute inset-4">
                                    <div className="absolute inset-0 border-2 border-white/30 rounded" />
                                    <div className="absolute top-1/2 left-0 right-0 border-t-2 border-white/30" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/30 rounded-full" />
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-t-0 border-white/30" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-[18%] border-2 border-b-0 border-white/30" />
                                  </div>
                                  {activeFormation.slots.map((slot) => {
                                    const convId = slotAssignments[slot.id]
                                    const conv = convId ? convocados.find((c) => c.id === convId) : null
                                    const posInfo = POSICIONES[slot.position as keyof typeof POSICIONES]
                                    const bgColor = posInfo?.color || '#9CA3AF'
                                    const isSwapActive = swapSource === slot.id

                                    if (conv) {
                                      return (
                                        <button
                                          key={slot.id}
                                          className={`absolute -translate-x-1/2 -translate-y-1/2 text-center group cursor-pointer ${isSwapActive ? 'z-10' : ''}`}
                                          style={{ top: slot.top, left: slot.left }}
                                          onClick={() => handleSlotClick(slot)}
                                          title={isSwapActive ? 'Click otro jugador para intercambiar' : 'Click para intercambiar'}
                                        >
                                          <div
                                            className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shadow-md text-white transition-all ${
                                              isSwapActive ? 'ring-2 ring-yellow-400 ring-offset-1 scale-110' : ''
                                            }`}
                                            style={{ backgroundColor: bgColor }}
                                          >
                                            {conv.dorsal || getPlayerData(conv)?.dorsal || '?'}
                                          </div>
                                          <span className="block text-[9px] text-white font-medium mt-0.5 max-w-[60px] truncate drop-shadow">
                                            {getPlayerDisplayName(conv)}
                                          </span>
                                          <button
                                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveFromSlot(slot.id) }}
                                            title="Quitar del puesto"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        </button>
                                      )
                                    } else {
                                      return (
                                        <button
                                          key={slot.id}
                                          className="absolute -translate-x-1/2 -translate-y-1/2 text-center cursor-pointer"
                                          style={{ top: slot.top, left: slot.left }}
                                          onClick={() => handleSlotClick(slot)}
                                          title={`Anadir jugador: ${slot.label}`}
                                        >
                                          <div className="w-9 h-9 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors">
                                            <Plus className="h-3.5 w-3.5 text-white/70" />
                                          </div>
                                          <span className="block text-[9px] text-white/60 font-medium mt-0.5">
                                            {slot.label}
                                          </span>
                                        </button>
                                      )
                                    }
                                  })}
                                </div>
                              </div>

                              {/* Suplentes sidebar (1/4) */}
                              <div className="md:col-span-1">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                  <Shirt className="h-3.5 w-3.5" />
                                  Banquillo ({suplentes.length})
                                </h4>
                                <div className="space-y-1.5">
                                  {suplentes.map((conv) => {
                                    const player = getPlayerData(conv)
                                    const pos = conv.posicion_asignada || player?.posicion_principal || ''
                                    const posColor = getPositionColor(pos)
                                    return (
                                      <div key={conv.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 group">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                          {conv.dorsal || player?.dorsal || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium truncate">{getPlayerDisplayName(conv)}</p>
                                        </div>
                                        <Badge className={`text-[8px] border-0 ${posColor}`}>{pos || '-'}</Badge>
                                        <button
                                          onClick={() => handleRemoveConvocado(conv.id)}
                                          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )
                                  })}
                                  {suplentes.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">Sin suplentes</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Selecciona una formacion para construir tu alineacion
                            </p>
                          )}

                          {activeFormation && Object.keys(slotAssignments).length > 0 && (
                            <Button onClick={handleSaveLineup} disabled={savingLineup} className="w-full" size="sm">
                              {savingLineup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              Guardar alineacion
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* ==================== TAB: POST-PARTIDO ==================== */}
                <TabsContent value="post-partido" className="space-y-4">
                  {/* Result card */}
                  {(() => {
                    const resInfo = selectedPartido.resultado ? RESULTADO_LABELS[selectedPartido.resultado] : null
                    return (
                      <Card className={resInfo ? `border-2 ${resInfo.color.split(' ')[0].replace('bg-', 'border-')}` : ''}>
                        <CardContent className="p-6">
                          <div className="text-center space-y-3">
                            <div className="flex items-center justify-center gap-2">
                              <Badge variant="outline">{selectedPartido.competicion}</Badge>
                              {selectedPartido.jornada && <span className="text-sm text-muted-foreground">Jornada {selectedPartido.jornada}</span>}
                            </div>
                            <div className="flex items-center justify-center gap-6">
                              <div className="text-right flex-1">
                                <p className="text-lg font-bold">{equipoActivo?.nombre || 'Mi equipo'}</p>
                                <p className="text-xs text-muted-foreground uppercase">
                                  {selectedPartido.localia === 'local' ? 'Local' : 'Visitante'}
                                </p>
                              </div>
                              {selectedPartido.resultado ? (
                                <div className="text-center px-4">
                                  <p className="text-4xl font-black">{selectedPartido.goles_favor} - {selectedPartido.goles_contra}</p>
                                  <Badge className={resInfo?.color || ''}>{resInfo?.label}</Badge>
                                </div>
                              ) : (
                                <div className="text-center px-4">
                                  <Button onClick={() => setShowResult(true)} size="sm">
                                    <Trophy className="h-4 w-4 mr-2" />
                                    Registrar resultado
                                  </Button>
                                </div>
                              )}
                              <div className="text-left flex-1">
                                <p className="text-lg font-bold">{selectedPartido.rival?.nombre || 'Rival'}</p>
                                <p className="text-xs text-muted-foreground uppercase">
                                  {selectedPartido.localia === 'local' ? 'Visitante' : 'Local'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(selectedPartido.fecha)}
                              </span>
                              {selectedPartido.hora && <span>{selectedPartido.hora}h</span>}
                              {selectedPartido.ubicacion && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {selectedPartido.ubicacion}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {/* Team stats */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Estadisticas de equipo
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-center">
                              <th className="px-3 pb-2 text-left font-medium">Estadistica</th>
                              <th className="px-3 pb-2 font-medium text-primary">{equipoActivo?.nombre || 'Nosotros'}</th>
                              <th className="px-3 pb-2 font-medium text-destructive">{selectedPartido.rival?.nombre || 'Rival'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {TEAM_STAT_FIELDS.map((field) => (
                              <tr key={field.key} className="border-b last:border-0">
                                <td className="px-3 py-2 text-muted-foreground">{field.label}</td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="w-16 mx-auto text-center h-8 text-sm"
                                    value={teamStats[field.key] || 0}
                                    onChange={(e) => setTeamStats((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    className="w-16 mx-auto text-center h-8 text-sm"
                                    value={teamStats[`rival_${field.key}`] || 0}
                                    onChange={(e) => setTeamStats((prev) => ({ ...prev, [`rival_${field.key}`]: parseInt(e.target.value) || 0 }))}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Player stats (inline editable - no toggle titular column) */}
                  {convocados.length > 0 && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Rendimiento jugadores
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left">
                                <th className="px-4 pb-2 font-medium">#</th>
                                <th className="px-2 pb-2 font-medium">Jugador</th>
                                <th className="px-2 pb-2 font-medium text-center">Pos</th>
                                <th className="px-2 pb-2 font-medium text-center">Min</th>
                                <th className="px-2 pb-2 font-medium text-center"><Goal className="h-3.5 w-3.5 mx-auto" /></th>
                                <th className="px-2 pb-2 font-medium text-center">Ast</th>
                                <th className="px-1 pb-2 font-medium text-center"><div className="w-3.5 h-4.5 rounded-sm bg-yellow-400 mx-auto" /></th>
                                <th className="px-1 pb-2 font-medium text-center"><div className="w-3.5 h-4.5 rounded-sm bg-red-500 mx-auto" /></th>
                              </tr>
                            </thead>
                            <tbody>
                              {convocados.map((conv) => {
                                const player = getPlayerData(conv)
                                const pos = conv.posicion_asignada || player?.posicion_principal || ''
                                const posColor = getPositionColor(pos)
                                const ps = playerStats[conv.id] || { minutos_jugados: 0, goles: 0, asistencias: 0, tarjeta_amarilla: false, tarjeta_roja: false }
                                const updatePS = (field: string, value: any) => {
                                  setPlayerStats((prev) => ({ ...prev, [conv.id]: { ...ps, [field]: value } }))
                                }
                                return (
                                  <tr key={conv.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="px-4 py-2">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {conv.dorsal || player?.dorsal || '-'}
                                      </div>
                                    </td>
                                    <td className="px-2 py-2">
                                      <p className="font-medium text-sm">{player?.apodo || getPlayerFullName(conv)}</p>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <Badge className={`text-[9px] border-0 ${posColor}`}>{pos || '—'}</Badge>
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <Input type="number" min={0} max={120} className="w-14 mx-auto text-center h-7 text-xs" value={ps.minutos_jugados} onChange={(e) => updatePS('minutos_jugados', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <Input type="number" min={0} className="w-12 mx-auto text-center h-7 text-xs" value={ps.goles} onChange={(e) => updatePS('goles', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <Input type="number" min={0} className="w-12 mx-auto text-center h-7 text-xs" value={ps.asistencias} onChange={(e) => updatePS('asistencias', parseInt(e.target.value) || 0)} />
                                    </td>
                                    <td className="px-1 py-2 text-center">
                                      <button
                                        onClick={() => updatePS('tarjeta_amarilla', !ps.tarjeta_amarilla)}
                                        className={`w-5 h-6 rounded-sm mx-auto transition-all ${ps.tarjeta_amarilla ? 'bg-yellow-400 shadow-md scale-110' : 'bg-yellow-400/20 hover:bg-yellow-400/40'}`}
                                      />
                                    </td>
                                    <td className="px-1 py-2 text-center">
                                      <button
                                        onClick={() => updatePS('tarjeta_roja', !ps.tarjeta_roja)}
                                        className={`w-5 h-6 rounded-sm mx-auto transition-all ${ps.tarjeta_roja ? 'bg-red-500 shadow-md scale-110' : 'bg-red-500/20 hover:bg-red-500/40'}`}
                                      />
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Comentario tactico */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Comentario tactico
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={comentarioTactico}
                        onChange={(e) => setComentarioTactico(e.target.value)}
                        placeholder="Analisis del partido, aspectos a mejorar, puntos fuertes..."
                        rows={4}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>

                  {/* Save + Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleSaveInforme} disabled={savingInforme}>
                      {savingInforme ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Guardar informe
                    </Button>
                    <Button variant="outline" onClick={handleGenerarInforme} disabled={generatingInforme}>
                      {generatingInforme ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                      Generar PDF
                    </Button>
                    {selectedPartido.resultado && (
                      <Button variant="outline" size="sm" onClick={() => setShowResult(true)}>
                        <Trophy className="h-4 w-4 mr-1" />
                        Editar resultado
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => setShowDelete(true)} className="text-destructive ml-auto">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Links */}
                  {(selectedPartido.video_url || selectedPartido.informe_url) && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedPartido.video_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedPartido.video_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-1" /> Video
                          </a>
                        </Button>
                      )}
                      {selectedPartido.informe_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedPartido.informe_url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-4 w-4 mr-1" /> Informe
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ==================== DIALOGS ==================== */}

      {/* Add players dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Convocar jugadores</DialogTitle>
            <DialogDescription>Selecciona los jugadores para la convocatoria. Puedes marcar titulares.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {loadingJug ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : (
              <div className="space-y-1 py-2">
                {ownJugadores.filter((j) => !convocados.some((c) => c.jugador_id === j.id)).map((jugador) => (
                  <PlayerSelectRow key={jugador.id} jugador={jugador} selected={selected} onToggle={togglePlayer} onToggleTitular={(id) => setSelected((prev) => ({ ...prev, [id]: { ...prev[id], titular: !prev[id].titular } }))} />
                ))}
                {invitadoJugadores.filter((j) => !convocados.some((c) => c.jugador_id === j.id)).length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-3 pb-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Invitados</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {invitadoJugadores.filter((j) => !convocados.some((c) => c.jugador_id === j.id)).map((jugador) => (
                      <PlayerSelectRow key={jugador.id} jugador={jugador} selected={selected} onToggle={togglePlayer} onToggleTitular={(id) => setSelected((prev) => ({ ...prev, [id]: { ...prev[id], titular: !prev[id].titular } }))} isInvitado />
                    ))}
                  </>
                )}
                {crossTeamJugadores.filter((j) => !convocados.some((c) => c.jugador_id === j.id)).length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-3 pb-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Otros equipos</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {crossTeamJugadores.filter((j) => !convocados.some((c) => c.jugador_id === j.id)).map((jugador) => (
                      <PlayerSelectRow key={jugador.id} jugador={jugador} selected={selected} onToggle={togglePlayer} onToggleTitular={(id) => setSelected((prev) => ({ ...prev, [id]: { ...prev[id], titular: !prev[id].titular } }))} crossTeam />
                    ))}
                  </>
                )}
                <div className="pt-3 border-t mt-2">
                  {showQuickAdd ? (
                    <div className="space-y-2 p-2 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground">Nuevo invitado</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={quickAddName}
                          onChange={(e) => setQuickAddName(e.target.value)}
                          placeholder="Nombre Apellidos"
                          className="flex-1 px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary outline-none"
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickAddInvitado()}
                        />
                        <select value={quickAddPos} onChange={(e) => setQuickAddPos(e.target.value)} className="px-2 py-1.5 text-sm border rounded-md bg-white">
                          {Object.entries(POSICIONES).map(([code]) => (
                            <option key={code} value={code}>{code}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setShowQuickAdd(false); setQuickAddName('') }}>Cancelar</Button>
                        <Button size="sm" onClick={handleQuickAddInvitado} disabled={quickAddSaving || !quickAddName.trim()}>
                          {quickAddSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                          Crear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowQuickAdd(true)} className="w-full flex items-center justify-center gap-1.5 p-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                      <UserPlus className="h-4 w-4" />
                      Anadir invitado
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {Object.keys(selected).length} seleccionados
                {Object.values(selected).filter((s) => s.titular).length > 0 && ` (${Object.values(selected).filter((s) => s.titular).length} titulares)`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
                <Button onClick={handleBatchCreate} disabled={saving || Object.keys(selected).length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Convocar ({Object.keys(selected).length})
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player picker dialog (for formation slots) */}
      <Dialog open={pickingSlot !== null} onOpenChange={(open) => !open && setPickingSlot(null)}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Seleccionar jugador
              {pickingSlotData && (
                <Badge className={`ml-2 text-[10px] ${getPositionColor(pickingSlotData.position)}`}>
                  {pickingSlotData.label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>Elige un jugador para esta posicion</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-1 py-2">
              {sortedForPicker.map((conv) => {
                const player = getPlayerData(conv)
                const isAssigned = assignedConvIds.has(conv.id)
                const pos = conv.posicion_asignada || player?.posicion_principal || ''
                const posColor = getPositionColor(pos)
                const isMatch = pickingSlotData && pos === pickingSlotData.position
                return (
                  <button
                    key={conv.id}
                    onClick={() => handlePickPlayer(conv.id)}
                    disabled={isAssigned}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${isAssigned ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary/5'}`}
                  >
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {conv.dorsal || player?.dorsal || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{player?.apodo || getPlayerFullName(conv)}</span>
                    </div>
                    <Badge className={`text-[9px] border-0 ${posColor}`}>{pos || '—'}</Badge>
                    {isMatch && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {isAssigned && <span className="text-[9px] text-muted-foreground">En campo</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar resultado</DialogTitle>
            <DialogDescription>
              {selectedPartido ? `${selectedPartido.localia === 'local' ? 'vs' : '@'} ${selectedPartido.rival?.nombre}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goles a favor</Label>
                <Input type="number" min={0} value={resultForm.goles_favor} onChange={(e) => setResultForm({ ...resultForm, goles_favor: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Goles en contra</Label>
                <Input type="number" min={0} value={resultForm.goles_contra} onChange={(e) => setResultForm({ ...resultForm, goles_contra: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas post-partido</Label>
              <Textarea placeholder="Observaciones del partido..." rows={3} value={resultForm.notas_post} onChange={(e) => setResultForm({ ...resultForm, notas_post: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResult(false)}>Cancelar</Button>
            <Button onClick={handleSaveResult} disabled={savingResult}>
              {savingResult ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar partido</DialogTitle>
            <DialogDescription>Esta accion no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePartido} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Pre-partido Card Component ============

function PrePartidoCard({
  title,
  value,
  onChange,
  color,
  icon,
}: {
  title: string
  value: string
  onChange: (v: string) => void
  color: 'emerald' | 'red' | 'purple'
  icon?: React.ReactNode
}) {
  const bgMap = { emerald: 'bg-emerald-900/30 border-emerald-700/30', red: 'bg-red-900/30 border-red-700/30', purple: 'bg-purple-900/30 border-purple-700/30' }
  const pitchBg = { emerald: 'bg-emerald-800', red: 'bg-red-900/50', purple: 'bg-purple-900/50' }

  return (
    <Card className={`border ${bgMap[color]}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-xs font-semibold">{title}</h4>
        </div>
        {/* Mini pitch */}
        <div className={`${pitchBg[color]} rounded-lg h-20 relative`}>
          <div className="absolute inset-2 border border-white/20 rounded" />
          <div className="absolute top-1/2 left-0 right-0 mx-2 border-t border-white/20" />
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Observaciones..."
          rows={3}
          className="text-xs resize-none bg-background/50"
        />
      </CardContent>
    </Card>
  )
}

// ============ Plan Field Component ============

function PlanField({
  icon,
  label,
  value,
  onChange,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-xs font-semibold">{label}</h4>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${label}...`}
          rows={3}
          className="text-xs resize-none"
        />
      </CardContent>
    </Card>
  )
}

// ============ Player Select Row (Add Dialog) ============

function PlayerSelectRow({
  jugador,
  selected,
  onToggle,
  onToggleTitular,
  crossTeam,
  isInvitado,
}: {
  jugador: Jugador
  selected: Record<string, { titular: boolean; dorsal?: number; posicion?: string }>
  onToggle: (j: Jugador) => void
  onToggleTitular: (id: string) => void
  crossTeam?: boolean
  isInvitado?: boolean
}) {
  const isSelected = !!selected[jugador.id]
  const info = selected[jugador.id]
  const posColor = getPositionColor(jugador.posicion_principal)

  return (
    <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50'}`}>
      <button
        onClick={() => onToggle(jugador)}
        className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}
      >
        {isSelected && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
        {jugador.dorsal || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`}</span>
          <Badge className={`text-[9px] border-0 ${posColor}`}>{jugador.posicion_principal}</Badge>
          {isInvitado && (
            <Badge variant="outline" className="text-[9px] border-dashed border-amber-400 text-amber-700 bg-amber-50">Invitado</Badge>
          )}
          {crossTeam && (jugador as any).equipos && (
            <Badge variant="outline" className="text-[9px] border-dashed">{(jugador as any).equipos.nombre}</Badge>
          )}
        </div>
        {jugador.apodo && (
          <p className="text-[10px] text-muted-foreground">{jugador.nombre} {jugador.apellidos}</p>
        )}
      </div>
      {isSelected && (
        <button
          onClick={() => onToggleTitular(jugador.id)}
          className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${info?.titular ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground/30 text-muted-foreground'}`}
        >
          {info?.titular ? 'Titular' : 'Suplente'}
        </button>
      )}
    </div>
  )
}
