'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  FasePlanPartido,
  PlanPartidoData,
  PlanPartidoPhase,
  PlanPartidoSubfaseData,
  RivalScoutData,
  RivalSubfaseAtaque,
  RivalSubfaseDefensa,
} from '@/types'
import { exportPlanPartidoPDF } from '@/lib/pdf/exportPlanPartidoPDF'
import { ExportDossierMenu } from '@/components/rivales/ExportDossierMenu'
import { DossierPresenter } from '@/components/rivales/DossierPresenter'
import { DossierTacticalBoard } from '@/components/rivales/DossierTacticalBoard'
import { PresentacionSala } from '@/components/revision/PresentacionSala'
import { exportPresentacionDossier } from '@/lib/api/presentaciones'
import { buildPlanShow, buildInformeShow, type DossierShow } from '@/lib/dossierShow'
import { loadShowIntel, loadInformeDataForCharla, prepareCharlaSala, prepareDossierSala } from '@/lib/dossierPresentar'
import type { RevisionSession } from '@/lib/api/revision'
import { useClubStore } from '@/stores/clubStore'
import { OrganizedPhaseStack, organizedSubfases } from './OrganizedPhaseStack'
import { PlanPartidoABPSection } from './PlanPartidoABPSection'
import { RevisionLibrary } from '@/components/revision/RevisionLibrary'
import { NutricionPartidoEditor } from './NutricionPartidoEditor'
import { PlanEstructurasRivalABP } from './PlanEstructurasRivalABP'
import { abpDefensivaEnInforme, nutricionEnInforme } from '@/lib/planPartidoOpcional'

interface PlanPartidoProps {
  data: Partial<PlanPartidoData>
  onChange: (data: Partial<PlanPartidoData>) => void
  rivalId?: string
  microcicloId?: string
  partidoId?: string
  equipoId?: string
  horaPartido?: string
  fechaPartido?: string
  ciudadPartido?: string
  rivalNombre?: string
  rivalEscudoUrl?: string
  campoPartido?: string
  localia?: string
  tramo?: 'ida' | 'vuelta'
  getInformeForCharla?: () => Partial<RivalScoutData> | null
}

const FASES: { fase: FasePlanPartido; label: string; color: string }[] = [
  { fase: 'ataque_organizado', label: 'Ataque Organizado', color: 'text-blue-600' },
  { fase: 'defensa_organizada', label: 'Defensa Organizada', color: 'text-red-600' },
  { fase: 'transicion_ofensiva', label: 'Transición OF', color: 'text-green-600' },
  { fase: 'transicion_defensiva', label: 'Transición DEF', color: 'text-orange-600' },
  { fase: 'abp_ofensiva', label: 'ABP Ofensiva', color: 'text-purple-600' },
  { fase: 'abp_defensiva', label: 'ABP Defensiva', color: 'text-amber-600' },
]

function isTransitionPhase(fase: FasePlanPartido) {
  return fase === 'transicion_ofensiva' || fase === 'transicion_defensiva'
}

function isAbpPhase(fase: FasePlanPartido) {
  return fase === 'abp_ofensiva' || fase === 'abp_defensiva'
}

type PlanTab = FasePlanPartido | 'nutricion'

export function PlanPartido({
  data,
  onChange,
  rivalId,
  microcicloId,
  partidoId,
  equipoId,
  horaPartido,
  fechaPartido,
  ciudadPartido,
  rivalNombre,
  rivalEscudoUrl,
  campoPartido,
  localia,
  tramo,
  getInformeForCharla,
}: PlanPartidoProps) {
  const [activeTab, setActiveTab] = useState<PlanTab>('ataque_organizado')
  const [exportingDeck, setExportingDeck] = useState(false)
  const [liveShow, setLiveShow] = useState<DossierShow | null>(null)
  const [sala, setSala] = useState<{ show: DossierShow; session: RevisionSession } | null>(null)
  const [presenting, setPresenting] = useState(false)
  const [presentingTodo, setPresentingTodo] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data
  const clubNombre = useClubStore((s) => s.organizacion?.nombre)
  const clubEscudoUrl = useClubStore((s) => s.theme.logoUrl || s.organizacion?.logo_url)
  const nutricionOn = nutricionEnInforme(data)
  const abpDefensivaOn = abpDefensivaEnInforme(data)
  const fasesVisibles = FASES.filter((section) => section.fase !== 'abp_defensiva' || abpDefensivaOn)
  const tabVisible =
    activeTab === 'nutricion' ? nutricionOn : activeTab === 'abp_defensiva' ? abpDefensivaOn : true
  const tabActual: PlanTab = tabVisible ? activeTab : 'ataque_organizado'

  const update = (patch: Partial<PlanPartidoData>) => {
    const next = { ...dataRef.current, ...patch }
    dataRef.current = next
    onChange(next)
  }

  const getPhase = (fase: FasePlanPartido): PlanPartidoPhase => {
    const currentFases = dataRef.current.fases ?? []
    return currentFases.find((f) => f.fase === fase) ?? { fase, clips: [] }
  }

  const updatePhase = (fase: FasePlanPartido, patch: Partial<PlanPartidoPhase>) => {
    const currentFases = dataRef.current.fases ?? []
    const existing = currentFases.find((f) => f.fase === fase)
    const next = existing
      ? currentFases.map((f) => (f.fase === fase ? { ...f, ...patch } : f))
      : [...currentFases, { fase, clips: [], ...patch }]
    update({ fases: next })
  }

  const updateSubfase = (
    fase: FasePlanPartido,
    key: RivalSubfaseAtaque | RivalSubfaseDefensa,
    patch: Partial<PlanPartidoSubfaseData>
  ) => {
    const phase = getPhase(fase)
    const subfases = { ...(phase.subfases ?? {}) }
    const current = subfases[key] ?? { notas: '' }
    subfases[key] = { ...current, ...patch }
    updatePhase(fase, { subfases })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Plan de Partido{tramo === 'vuelta' ? ' · Vuelta' : tramo === 'ida' ? ' · Ida' : ''}
          </CardTitle>
          <ExportDossierMenu
            exporting={exportingDeck}
            presenting={presenting}
            presentingTodo={presentingTodo}
            onPresentar={async () => {
              setPresenting(true)
              try {
                const built = buildPlanShow(dataRef.current, {
                  rivalNombre,
                  clubNombre,
                  clubEscudoUrl: clubEscudoUrl || undefined,
                  rivalEscudoUrl,
                  fecha: fechaPartido,
                  hora: horaPartido,
                  campo: campoPartido || ciudadPartido,
                  localia,
                  tramo,
                })
                const ready = await prepareDossierSala({
                  show: built,
                  equipoId,
                  ambito: 'partido_plan',
                  rivalId,
                  microcicloId,
                  partidoId,
                })
                if (ready.session) setSala({ show: ready.show, session: ready.session })
                else setLiveShow(ready.show)
              } finally {
                setPresenting(false)
              }
            }}
            onPresentarTodo={async () => {
              setPresentingTodo(true)
              try {
                const meta = {
                  rivalNombre,
                  clubNombre,
                  clubEscudoUrl: clubEscudoUrl || undefined,
                  rivalEscudoUrl,
                  fecha: fechaPartido,
                  hora: horaPartido,
                  campo: campoPartido || ciudadPartido,
                  localia,
                  tramo,
                }
                const plan = buildPlanShow(dataRef.current, meta)
                const informeData = await loadInformeDataForCharla(getInformeForCharla?.() ?? null, rivalId)
                const informe = buildInformeShow(informeData, {
                  ...meta,
                  intelVisual: await loadShowIntel(equipoId, rivalId),
                })
                const ready = await prepareCharlaSala({
                  informe,
                  plan,
                  equipoId,
                  rivalId,
                  microcicloId,
                  partidoId,
                })
                if (ready.session) setSala({ show: ready.show, session: ready.session })
                else setLiveShow(ready.show)
              } finally {
                setPresentingTodo(false)
              }
            }}
            onPdf={() =>
              void exportPlanPartidoPDF(data, equipoId, {
                rivalNombre,
                rivalEscudoUrl,
                fecha: fechaPartido,
                hora: horaPartido,
                campo: campoPartido || ciudadPartido,
                localia,
                tramo,
              })
            }
            onPresentacion={async () => {
              setExportingDeck(true)
              try {
                await exportPresentacionDossier('plan', data, {
                  rival_nombre: rivalNombre,
                  rival_escudo_url: rivalEscudoUrl,
                  fecha: fechaPartido,
                  hora: horaPartido,
                  campo: campoPartido || ciudadPartido,
                  localia,
                  tramo,
                })
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'No se pudo crear la presentación')
              } finally {
                setExportingDeck(false)
              }
            }}
          />
        </div>
      </CardHeader>

      {sala && (
        <PresentacionSala
          code={sala.session.code}
          role="host"
          initialSession={sala.session}
          initialShow={sala.show}
          onClose={() => setSala(null)}
        />
      )}
      {liveShow && (
        <DossierPresenter show={liveShow} onClose={() => setLiveShow(null)} />
      )}

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium text-muted-foreground">Mostrar en el informe</span>
          <Button
            type="button"
            size="sm"
            variant={nutricionOn ? 'default' : 'outline'}
            className="h-7 text-[10px]"
            aria-pressed={nutricionOn}
            onClick={() => {
              const next = !nutricionOn
              update({ incluir_nutricion: next })
              setActiveTab(next ? 'nutricion' : 'ataque_organizado')
            }}
          >
            Nutrición
          </Button>
          <Button
            type="button"
            size="sm"
            variant={abpDefensivaOn ? 'default' : 'outline'}
            className="h-7 text-[10px]"
            aria-pressed={abpDefensivaOn}
            onClick={() => {
              const next = !abpDefensivaOn
              update({ incluir_abp_defensiva: next })
              setActiveTab(next ? 'abp_defensiva' : 'abp_ofensiva')
            }}
          >
            ABP defensiva
          </Button>
        </div>

        <Tabs value={tabActual} onValueChange={(v) => setActiveTab(v as PlanTab)}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {fasesVisibles.map((f) => (
              <TabsTrigger key={f.fase} value={f.fase} className="text-[10px] px-2 py-1">
                {f.label}
              </TabsTrigger>
            ))}
            {nutricionOn && (
              <TabsTrigger value="nutricion" className="text-[10px] px-2 py-1">
                Nutrición
              </TabsTrigger>
            )}
          </TabsList>

          {fasesVisibles.map((section) => {
            const phase = getPhase(section.fase)
            const subfases = organizedSubfases(section.fase)

            return (
              <TabsContent key={section.fase} value={section.fase} className="space-y-4 mt-4">
                <p className={`text-xs font-semibold ${section.color}`}>{section.label}</p>

                {subfases && (
                  <OrganizedPhaseStack
                    variant="plan"
                    idPrefix={section.fase}
                    general={phase.comentario_general ?? ''}
                    onGeneral={(comentario_general) => updatePhase(section.fase, { comentario_general })}
                    items={subfases.map((s) => {
                      const sub = phase.subfases?.[s.key] ?? { notas: '' }
                      return {
                        key: s.key,
                        label: s.key === 'bloque_medio' ? 'Bloque Mixto' : s.label,
                        notas: sub.notas ?? '',
                        diagrama: sub.pizarra_diagrama,
                        fortalezas: sub.fortalezas ?? [],
                        debilidades: sub.debilidades ?? [],
                      }
                    })}
                    onChange={(key, patch) =>
                      updateSubfase(section.fase, key as RivalSubfaseAtaque | RivalSubfaseDefensa, patch)
                    }
                  />
                )}

                {section.fase === 'ataque_organizado' && (
                  <PlanPartidoABPSection
                    lado="ofensivo"
                    tipos={['saque_puerta']}
                    defaultTipo="saque_puerta"
                    titulo="Saques de puerta (balón parado)"
                    emptyHint="Enlaza o crea saques de puerta para la salida de ataque organizado"
                    items={phase.jugadas_abp ?? []}
                    equipoId={equipoId}
                    onChange={(jugadas_abp) => updatePhase(section.fase, { jugadas_abp })}
                  />
                )}

                {isTransitionPhase(section.fase) && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Objetivo</label>
                      <Textarea
                        rows={4}
                        value={phase.texto ?? ''}
                        onChange={(e) => updatePhase(section.fase, { texto: e.target.value })}
                        placeholder={
                          section.fase === 'transicion_ofensiva'
                            ? 'Verticalidad, espacios, cambio de ritmo...'
                            : 'Presión, repliegue, equilibrio...'
                        }
                        className="text-sm resize-none"
                      />
                    </div>
                    {section.fase === 'transicion_ofensiva' && (
                      <DossierTacticalBoard
                        value={phase.pizarra_diagrama}
                        title="Pizarra · Transición ofensiva"
                        onChange={(patch) => updatePhase(section.fase, patch)}
                      />
                    )}
                    {section.fase === 'transicion_defensiva' && (
                      <DossierTacticalBoard
                        value={phase.pizarra_diagrama}
                        title="Pizarra · Transición defensiva"
                        onChange={(patch) => updatePhase(section.fase, patch)}
                      />
                    )}
                  </div>
                )}

                {isAbpPhase(section.fase) && (
                  <PlanPartidoABPSection
                    lado={section.fase === 'abp_ofensiva' ? 'ofensivo' : 'defensivo'}
                    items={phase.jugadas_abp ?? []}
                    equipoId={equipoId}
                    onChange={(jugadas_abp) => updatePhase(section.fase, { jugadas_abp })}
                  />
                )}

                {section.fase === 'abp_ofensiva' && (
                  <PlanEstructurasRivalABP
                    items={phase.estructuras_rival ?? []}
                    onChange={(estructuras_rival) => updatePhase(section.fase, { estructuras_rival })}
                  />
                )}

                {equipoId && (partidoId || rivalId || microcicloId) && (
                  <RevisionLibrary
                    equipoId={equipoId}
                    ambito="partido_plan"
                    partidoId={partidoId}
                    rivalId={rivalId}
                    microcicloId={microcicloId}
                    initialFase={section.fase}
                    compact
                  />
                )}
              </TabsContent>
            )
          })}

          {nutricionOn && (
          <TabsContent value="nutricion" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              Sale en el informe cuando hay clima, suplementación o comida.
            </p>
            <NutricionPartidoEditor
              data={data.nutricion_partido}
              horaPartido={horaPartido}
              fechaPartido={fechaPartido}
              ciudadPartido={ciudadPartido}
              onChange={(nutricion_partido) => update({ nutricion_partido })}
            />
          </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}

