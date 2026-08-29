/** Estructuras musculares y ligamentosas para anotar la zona de lesión. */

export interface MuscleEntry {
  id: string
  label: string
  group: string
}

export const MUSCLE_CATALOG: MuscleEntry[] = [
  { id: 'isquios_bf_d', label: 'Bíceps femoral D', group: 'Isquios' },
  { id: 'isquios_bf_i', label: 'Bíceps femoral I', group: 'Isquios' },
  { id: 'isquios_st_d', label: 'Semitendinoso D', group: 'Isquios' },
  { id: 'isquios_st_i', label: 'Semitendinoso I', group: 'Isquios' },
  { id: 'isquios_sm_d', label: 'Semimembranoso D', group: 'Isquios' },
  { id: 'isquios_sm_i', label: 'Semimembranoso I', group: 'Isquios' },
  { id: 'recto_femoral_d', label: 'Recto femoral D', group: 'Cuádriceps' },
  { id: 'recto_femoral_i', label: 'Recto femoral I', group: 'Cuádriceps' },
  { id: 'vasto_medial_d', label: 'Vasto medial D', group: 'Cuádriceps' },
  { id: 'vasto_medial_i', label: 'Vasto medial I', group: 'Cuádriceps' },
  { id: 'vasto_lateral_d', label: 'Vasto lateral D', group: 'Cuádriceps' },
  { id: 'vasto_lateral_i', label: 'Vasto lateral I', group: 'Cuádriceps' },
  { id: 'vasto_intermedio_d', label: 'Vasto intermedio D', group: 'Cuádriceps' },
  { id: 'vasto_intermedio_i', label: 'Vasto intermedio I', group: 'Cuádriceps' },
  { id: 'aductor_largo_d', label: 'Aductor largo D', group: 'Aductores / ingle' },
  { id: 'aductor_largo_i', label: 'Aductor largo I', group: 'Aductores / ingle' },
  { id: 'aductor_mayor_d', label: 'Aductor mayor D', group: 'Aductores / ingle' },
  { id: 'aductor_mayor_i', label: 'Aductor mayor I', group: 'Aductores / ingle' },
  { id: 'pectineo_d', label: 'Pectíneo D', group: 'Aductores / ingle' },
  { id: 'pectineo_i', label: 'Pectíneo I', group: 'Aductores / ingle' },
  { id: 'pubis', label: 'Pubis / sínfisis', group: 'Aductores / ingle' },
  { id: 'psoas_d', label: 'Psoas D', group: 'Cadera' },
  { id: 'psoas_i', label: 'Psoas I', group: 'Cadera' },
  { id: 'iliaco_d', label: 'Ilíaco D', group: 'Cadera' },
  { id: 'iliaco_i', label: 'Ilíaco I', group: 'Cadera' },
  { id: 'tfl_d', label: 'TFL D', group: 'Cadera' },
  { id: 'tfl_i', label: 'TFL I', group: 'Cadera' },
  { id: 'gluteo_mayor_d', label: 'Glúteo mayor D', group: 'Glúteo' },
  { id: 'gluteo_mayor_i', label: 'Glúteo mayor I', group: 'Glúteo' },
  { id: 'gluteo_medio_d', label: 'Glúteo medio D', group: 'Glúteo' },
  { id: 'gluteo_medio_i', label: 'Glúteo medio I', group: 'Glúteo' },
  { id: 'piriforme_d', label: 'Piriforme D', group: 'Glúteo' },
  { id: 'piriforme_i', label: 'Piriforme I', group: 'Glúteo' },
  { id: 'gemelo_medial_d', label: 'Gemelo medial D', group: 'Pierna' },
  { id: 'gemelo_medial_i', label: 'Gemelo medial I', group: 'Pierna' },
  { id: 'gemelo_lateral_d', label: 'Gemelo lateral D', group: 'Pierna' },
  { id: 'gemelo_lateral_i', label: 'Gemelo lateral I', group: 'Pierna' },
  { id: 'soleo_d', label: 'Sóleo D', group: 'Pierna' },
  { id: 'soleo_i', label: 'Sóleo I', group: 'Pierna' },
  { id: 'tibial_ant_d', label: 'Tibial anterior D', group: 'Pierna' },
  { id: 'tibial_ant_i', label: 'Tibial anterior I', group: 'Pierna' },
  { id: 'peroneos_d', label: 'Peroneos D', group: 'Pierna' },
  { id: 'peroneos_i', label: 'Peroneos I', group: 'Pierna' },
  { id: 'aquiles_d', label: 'Aquiles D', group: 'Pie / tobillo' },
  { id: 'aquiles_i', label: 'Aquiles I', group: 'Pie / tobillo' },
  { id: 'lpta_d', label: 'Lig. peroneoastragalino ant. D', group: 'Pie / tobillo' },
  { id: 'lpta_i', label: 'Lig. peroneoastragalino ant. I', group: 'Pie / tobillo' },
  { id: 'deltoideo_d', label: 'Lig. deltoideo D', group: 'Pie / tobillo' },
  { id: 'deltoideo_i', label: 'Lig. deltoideo I', group: 'Pie / tobillo' },
  { id: 'plantar_d', label: 'Fascia plantar D', group: 'Pie / tobillo' },
  { id: 'plantar_i', label: 'Fascia plantar I', group: 'Pie / tobillo' },
  { id: 'lca_d', label: 'LCA D', group: 'Rodilla' },
  { id: 'lca_i', label: 'LCA I', group: 'Rodilla' },
  { id: 'lcp_d', label: 'LCP D', group: 'Rodilla' },
  { id: 'lcp_i', label: 'LCP I', group: 'Rodilla' },
  { id: 'lcm_d', label: 'LCM D', group: 'Rodilla' },
  { id: 'lcm_i', label: 'LCM I', group: 'Rodilla' },
  { id: 'lcl_d', label: 'LCL D', group: 'Rodilla' },
  { id: 'lcl_i', label: 'LCL I', group: 'Rodilla' },
  { id: 'menisco_med_d', label: 'Menisco medial D', group: 'Rodilla' },
  { id: 'menisco_med_i', label: 'Menisco medial I', group: 'Rodilla' },
  { id: 'menisco_lat_d', label: 'Menisco lateral D', group: 'Rodilla' },
  { id: 'menisco_lat_i', label: 'Menisco lateral I', group: 'Rodilla' },
  { id: 'recto_abdominal', label: 'Recto abdominal', group: 'Tronco' },
  { id: 'oblicuos', label: 'Oblicuos', group: 'Tronco' },
  { id: 'cuadrado_lumbar_d', label: 'Cuadrado lumbar D', group: 'Tronco' },
  { id: 'cuadrado_lumbar_i', label: 'Cuadrado lumbar I', group: 'Tronco' },
  { id: 'erector_lumbar', label: 'Erectores lumbares', group: 'Tronco' },
  { id: 'sacroiliaca_d', label: 'Sacroilíaca D', group: 'Tronco' },
  { id: 'sacroiliaca_i', label: 'Sacroilíaca I', group: 'Tronco' },
  { id: 'supraespinoso_d', label: 'Supraespinoso D', group: 'Hombro' },
  { id: 'supraespinoso_i', label: 'Supraespinoso I', group: 'Hombro' },
  { id: 'manguito_d', label: 'Manguito rotador D', group: 'Hombro' },
  { id: 'manguito_i', label: 'Manguito rotador I', group: 'Hombro' },
]

const BY_ID = Object.fromEntries(MUSCLE_CATALOG.map((m) => [m.id, m]))

export function regionLabel(id: string): string {
  if (id.startsWith('otro:')) return id.slice(5)
  return BY_ID[id]?.label || id.replace(/_/g, ' ')
}

export function labelsFromZonas(zonas: unknown): string {
  if (!Array.isArray(zonas) || zonas.length === 0) return ''
  return zonas
    .map((z) => {
      if (typeof z === 'string') return regionLabel(z)
      if (z && typeof z === 'object' && 'id' in z) return regionLabel(String((z as { id: string }).id))
      return ''
    })
    .filter(Boolean)
    .join(', ')
}

export function zonaIds(zonas: unknown): string[] {
  if (!Array.isArray(zonas)) return []
  return zonas.flatMap((z) => {
    if (typeof z === 'string') return [z]
    if (z && typeof z === 'object' && 'id' in z) return [String((z as { id: string }).id)]
    return []
  })
}
