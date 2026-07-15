import {
  DiagramData,
  DiagramElement,
  DiagramArrow,
  DiagramZone,
  generateId,
  emptyDiagramData,
} from '@/components/tarea-editor/types'

function normalizePosition(el: Record<string, unknown>): { x: number; y: number } | null {
  const pos = el.position as { x?: number; y?: number } | undefined
  if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') return { x: pos.x, y: pos.y }
  if (typeof el.x === 'number' && typeof el.y === 'number') return { x: el.x, y: el.y }
  return null
}

/** Normaliza diagrama JSON desde DB o props externas */
export function sanitizeDiagramData(raw: unknown): DiagramData {
  if (!raw || typeof raw !== 'object') return { ...emptyDiagramData, pitchType: 'half' }
  const data = raw as Record<string, unknown>
  return {
    pitchType: (data.pitchType as DiagramData['pitchType']) || 'half',
    customDimensions: data.customDimensions as DiagramData['customDimensions'],
    elements: Array.isArray(data.elements)
      ? (data.elements as Record<string, unknown>[])
          .filter((e) => e && normalizePosition(e))
          .map((e) => ({
            ...(e as unknown as DiagramElement),
            id: (e.id as string) || generateId(),
            position: normalizePosition(e)!,
          }))
      : [],
    arrows: Array.isArray(data.arrows)
      ? (data.arrows as Record<string, unknown>[])
          .filter((a) => {
            const from = a.from as { x?: number } | undefined
            const to = a.to as { x?: number } | undefined
            return from && to && typeof from.x === 'number' && typeof to.x === 'number'
          })
          .map((a) => ({ ...(a as unknown as DiagramArrow), id: (a.id as string) || generateId() }))
      : [],
    zones: Array.isArray(data.zones)
      ? (data.zones as Record<string, unknown>[])
          .filter((z) => z && (z.position || (typeof z.x === 'number' && typeof z.y === 'number')))
          .map((z) => ({
            ...(z as unknown as DiagramZone),
            id: (z.id as string) || generateId(),
            position: (z.position as { x: number; y: number }) || { x: z.x as number, y: z.y as number },
          }))
      : [],
  }
}

export function diagramToPayload(
  elements: DiagramData['elements'],
  arrows: DiagramData['arrows'],
  zones: DiagramData['zones']
): DiagramData {
  return { elements, arrows, zones, pitchType: 'half' }
}
