export interface FormationSlot {
  id: string
  label: string
  position: string // Key from POSICIONES (POR, DFC, LTD, etc.)
  top: string
  left: string
}

export interface Formation {
  name: string
  slots: FormationSlot[]
}

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'LTI', label: 'LTI', position: 'LTI', top: '70%', left: '12%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '35%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '65%' },
      { id: 'LTD', label: 'LTD', position: 'LTD', top: '70%', left: '88%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '50%', left: '25%' },
      { id: 'MC_C', label: 'MC', position: 'MC', top: '48%', left: '50%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '50%', left: '75%' },
      { id: 'EXI', label: 'EXI', position: 'EXI', top: '22%', left: '15%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
      { id: 'EXD', label: 'EXD', position: 'EXD', top: '22%', left: '85%' },
    ],
  },
  {
    name: '4-4-2',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'LTI', label: 'LTI', position: 'LTI', top: '70%', left: '12%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '35%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '65%' },
      { id: 'LTD', label: 'LTD', position: 'LTD', top: '70%', left: '88%' },
      { id: 'MII', label: 'MII', position: 'MII', top: '48%', left: '12%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '50%', left: '37%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '50%', left: '63%' },
      { id: 'MID', label: 'MID', position: 'MID', top: '48%', left: '88%' },
      { id: 'DC_L', label: 'DC', position: 'DC', top: '20%', left: '37%' },
      { id: 'DC_R', label: 'DC', position: 'DC', top: '20%', left: '63%' },
    ],
  },
  {
    name: '3-5-2',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '25%' },
      { id: 'DFC_C', label: 'DFC', position: 'DFC', top: '74%', left: '50%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '75%' },
      { id: 'CAI', label: 'CAI', position: 'CAI', top: '52%', left: '10%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '52%', left: '33%' },
      { id: 'MC_C', label: 'MC', position: 'MC', top: '50%', left: '50%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '52%', left: '67%' },
      { id: 'CAD', label: 'CAD', position: 'CAD', top: '52%', left: '90%' },
      { id: 'DC_L', label: 'DC', position: 'DC', top: '20%', left: '37%' },
      { id: 'DC_R', label: 'DC', position: 'DC', top: '20%', left: '63%' },
    ],
  },
  {
    name: '4-2-3-1',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'LTI', label: 'LTI', position: 'LTI', top: '70%', left: '12%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '35%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '65%' },
      { id: 'LTD', label: 'LTD', position: 'LTD', top: '70%', left: '88%' },
      { id: 'MCD_L', label: 'MCD', position: 'MCD', top: '55%', left: '37%' },
      { id: 'MCD_R', label: 'MCD', position: 'MCD', top: '55%', left: '63%' },
      { id: 'EXI', label: 'EXI', position: 'EXI', top: '35%', left: '15%' },
      { id: 'MCO', label: 'MCO', position: 'MCO', top: '35%', left: '50%' },
      { id: 'EXD', label: 'EXD', position: 'EXD', top: '35%', left: '85%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
    ],
  },
  {
    name: '4-1-4-1',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'LTI', label: 'LTI', position: 'LTI', top: '70%', left: '12%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '35%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '65%' },
      { id: 'LTD', label: 'LTD', position: 'LTD', top: '70%', left: '88%' },
      { id: 'MCD', label: 'MCD', position: 'MCD', top: '58%', left: '50%' },
      { id: 'MII', label: 'MII', position: 'MII', top: '40%', left: '12%' },
      { id: 'MID_L', label: 'MID', position: 'MID', top: '42%', left: '37%' },
      { id: 'MID_R', label: 'MID', position: 'MID', top: '42%', left: '63%' },
      { id: 'MID', label: 'MID', position: 'MID', top: '40%', left: '88%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
    ],
  },
  {
    name: '3-4-3',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '25%' },
      { id: 'DFC_C', label: 'DFC', position: 'DFC', top: '74%', left: '50%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '75%' },
      { id: 'CAI', label: 'CAI', position: 'CAI', top: '50%', left: '10%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '50%', left: '37%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '50%', left: '63%' },
      { id: 'CAD', label: 'CAD', position: 'CAD', top: '50%', left: '90%' },
      { id: 'EXI', label: 'EXI', position: 'EXI', top: '22%', left: '15%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
      { id: 'EXD', label: 'EXD', position: 'EXD', top: '22%', left: '85%' },
    ],
  },
  {
    name: '5-3-2',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'CAI', label: 'CAI', position: 'CAI', top: '68%', left: '8%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '28%' },
      { id: 'DFC_C', label: 'DFC', position: 'DFC', top: '74%', left: '50%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '72%' },
      { id: 'CAD', label: 'CAD', position: 'CAD', top: '68%', left: '92%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '48%', left: '25%' },
      { id: 'MC_C', label: 'MC', position: 'MC', top: '46%', left: '50%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '48%', left: '75%' },
      { id: 'DC_L', label: 'DC', position: 'DC', top: '20%', left: '37%' },
      { id: 'DC_R', label: 'DC', position: 'DC', top: '20%', left: '63%' },
    ],
  },
  {
    name: '5-4-1',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'CAI', label: 'CAI', position: 'CAI', top: '68%', left: '8%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '28%' },
      { id: 'DFC_C', label: 'DFC', position: 'DFC', top: '74%', left: '50%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '72%' },
      { id: 'CAD', label: 'CAD', position: 'CAD', top: '68%', left: '92%' },
      { id: 'MII', label: 'MII', position: 'MII', top: '48%', left: '15%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '50%', left: '37%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '50%', left: '63%' },
      { id: 'MID', label: 'MID', position: 'MID', top: '48%', left: '85%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
    ],
  },
  {
    name: '4-5-1',
    slots: [
      { id: 'POR', label: 'POR', position: 'POR', top: '88%', left: '50%' },
      { id: 'LTI', label: 'LTI', position: 'LTI', top: '70%', left: '12%' },
      { id: 'DFC_L', label: 'DFC', position: 'DFC', top: '72%', left: '35%' },
      { id: 'DFC_R', label: 'DFC', position: 'DFC', top: '72%', left: '65%' },
      { id: 'LTD', label: 'LTD', position: 'LTD', top: '70%', left: '88%' },
      { id: 'MII', label: 'MII', position: 'MII', top: '48%', left: '10%' },
      { id: 'MC_L', label: 'MC', position: 'MC', top: '50%', left: '30%' },
      { id: 'MCD', label: 'MCD', position: 'MCD', top: '52%', left: '50%' },
      { id: 'MC_R', label: 'MC', position: 'MC', top: '50%', left: '70%' },
      { id: 'MID', label: 'MID', position: 'MID', top: '48%', left: '90%' },
      { id: 'DC', label: 'DC', position: 'DC', top: '18%', left: '50%' },
    ],
  },
]
