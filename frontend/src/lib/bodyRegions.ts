/** Zonas del mapa corporal para marcar lesiones (vista anterior / posterior). */

export type BodyView = 'anterior' | 'posterior'
export type BodySide = 'd' | 'i' | 'c'

export interface BodyRegion {
  id: string
  label: string
  view: BodyView
  group: string
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: 'cabeza', label: 'Cabeza', view: 'anterior', group: 'axial' },
  { id: 'cuello', label: 'Cuello', view: 'anterior', group: 'axial' },
  { id: 'hombro_d', label: 'Hombro derecho', view: 'anterior', group: 'miembro_sup' },
  { id: 'hombro_i', label: 'Hombro izquierdo', view: 'anterior', group: 'miembro_sup' },
  { id: 'pectoral', label: 'Pectoral', view: 'anterior', group: 'tronco' },
  { id: 'biceps_d', label: 'Bíceps derecho', view: 'anterior', group: 'miembro_sup' },
  { id: 'biceps_i', label: 'Bíceps izquierdo', view: 'anterior', group: 'miembro_sup' },
  { id: 'antebrazo_d', label: 'Antebrazo derecho', view: 'anterior', group: 'miembro_sup' },
  { id: 'antebrazo_i', label: 'Antebrazo izquierdo', view: 'anterior', group: 'miembro_sup' },
  { id: 'muneca_d', label: 'Muñeca derecha', view: 'anterior', group: 'miembro_sup' },
  { id: 'muneca_i', label: 'Muñeca izquierda', view: 'anterior', group: 'miembro_sup' },
  { id: 'abdomen', label: 'Abdomen', view: 'anterior', group: 'tronco' },
  { id: 'ingle_d', label: 'Ingle / aductores D', view: 'anterior', group: 'cadera' },
  { id: 'ingle_i', label: 'Ingle / aductores I', view: 'anterior', group: 'cadera' },
  { id: 'cuadriceps_d', label: 'Cuádriceps derecho', view: 'anterior', group: 'muslo' },
  { id: 'cuadriceps_i', label: 'Cuádriceps izquierdo', view: 'anterior', group: 'muslo' },
  { id: 'rodilla_d', label: 'Rodilla derecha', view: 'anterior', group: 'rodilla' },
  { id: 'rodilla_i', label: 'Rodilla izquierda', view: 'anterior', group: 'rodilla' },
  { id: 'tibial_d', label: 'Tibial anterior D', view: 'anterior', group: 'pierna' },
  { id: 'tibial_i', label: 'Tibial anterior I', view: 'anterior', group: 'pierna' },
  { id: 'tobillo_d', label: 'Tobillo derecho', view: 'anterior', group: 'pie' },
  { id: 'tobillo_i', label: 'Tobillo izquierdo', view: 'anterior', group: 'pie' },
  { id: 'pie_d', label: 'Pie derecho', view: 'anterior', group: 'pie' },
  { id: 'pie_i', label: 'Pie izquierdo', view: 'anterior', group: 'pie' },

  { id: 'cervical', label: 'Cervical', view: 'posterior', group: 'axial' },
  { id: 'trapecio', label: 'Trapecio', view: 'posterior', group: 'tronco' },
  { id: 'hombro_post_d', label: 'Hombro posterior D', view: 'posterior', group: 'miembro_sup' },
  { id: 'hombro_post_i', label: 'Hombro posterior I', view: 'posterior', group: 'miembro_sup' },
  { id: 'dorsal', label: 'Dorsal', view: 'posterior', group: 'tronco' },
  { id: 'lumbar', label: 'Lumbar', view: 'posterior', group: 'tronco' },
  { id: 'codo_d', label: 'Codo derecho', view: 'posterior', group: 'miembro_sup' },
  { id: 'codo_i', label: 'Codo izquierdo', view: 'posterior', group: 'miembro_sup' },
  { id: 'gluteo_d', label: 'Glúteo derecho', view: 'posterior', group: 'cadera' },
  { id: 'gluteo_i', label: 'Glúteo izquierdo', view: 'posterior', group: 'cadera' },
  { id: 'isquios_d', label: 'Isquios derecho', view: 'posterior', group: 'muslo' },
  { id: 'isquios_i', label: 'Isquios izquierdo', view: 'posterior', group: 'muslo' },
  { id: 'gemelo_d', label: 'Gemelo derecho', view: 'posterior', group: 'pierna' },
  { id: 'gemelo_i', label: 'Gemelo izquierdo', view: 'posterior', group: 'pierna' },
  { id: 'aquiles_d', label: 'Aquiles derecho', view: 'posterior', group: 'pie' },
  { id: 'aquiles_i', label: 'Aquiles izquierdo', view: 'posterior', group: 'pie' },
]

export const BODY_REGION_BY_ID = Object.fromEntries(BODY_REGIONS.map((r) => [r.id, r]))

export function regionLabel(id: string): string {
  return BODY_REGION_BY_ID[id]?.label || id
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
