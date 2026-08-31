export interface FormationSlot {
  slotKey: string
  label: string
}

export interface FormationLayout {
  rows: FormationSlot[][]
}

/** Filas de ataque (arriba) a portero (abajo), campo ofensivo hacia arriba. */
export const FORMATION_LAYOUTS: Record<string, FormationLayout> = {
  '4-3-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'EXI' }, { slotKey: 'pos_1', label: 'DC' }, { slotKey: 'pos_2', label: 'EXD' }],
      [{ slotKey: 'pos_3', label: 'MII' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MID' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-4-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'EXI' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'EXD' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-2-3-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXI' }, { slotKey: 'pos_2', label: 'MCO' }, { slotKey: 'pos_3', label: 'EXD' }],
      [{ slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-4-3': {
    rows: [
      [{ slotKey: 'pos_0', label: 'EXI' }, { slotKey: 'pos_1', label: 'DC' }, { slotKey: 'pos_2', label: 'EXD' }],
      [{ slotKey: 'pos_3', label: 'MII' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MID' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '3-5-2': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }, { slotKey: 'pos_1', label: 'DC' }],
      [{ slotKey: 'pos_2', label: 'MII' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MC' }, { slotKey: 'pos_5', label: 'MC' }, { slotKey: 'pos_6', label: 'MID' }],
      [{ slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'DFC' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-1-4-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'EXI' }, { slotKey: 'pos_2', label: 'MC' }, { slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'EXD' }],
      [{ slotKey: 'pos_5', label: 'MCD' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
  '4-3-2-1': {
    rows: [
      [{ slotKey: 'pos_0', label: 'DC' }],
      [{ slotKey: 'pos_1', label: 'MCO' }, { slotKey: 'pos_2', label: 'MCO' }],
      [{ slotKey: 'pos_3', label: 'MC' }, { slotKey: 'pos_4', label: 'MCD' }, { slotKey: 'pos_5', label: 'MC' }],
      [{ slotKey: 'pos_6', label: 'LTI' }, { slotKey: 'pos_7', label: 'DFC' }, { slotKey: 'pos_8', label: 'DFC' }, { slotKey: 'pos_9', label: 'LTD' }],
      [{ slotKey: 'pos_10', label: 'POR' }],
    ],
  },
}

export const SISTEMAS_11 = Object.keys(FORMATION_LAYOUTS)

export function getFormacionLayout(sistema: string | undefined): FormationLayout {
  return (sistema && FORMATION_LAYOUTS[sistema]) || FORMATION_LAYOUTS['4-3-3']
}

export function formacionSlotKeys(sistema: string | undefined): string[] {
  return getFormacionLayout(sistema).rows.flatMap((row) => row.map((s) => s.slotKey))
}
