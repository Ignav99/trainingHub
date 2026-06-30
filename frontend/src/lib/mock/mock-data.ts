export const MOCK_TEAM = {
  id: 'team-1',
  name: 'FC Local',
  color: '#e53e3e',
}

export const MOCK_MATCH = {
  id: 'match-1',
  home_team: 'FC Local',
  away_team: 'Rival FC',
  date: '2025-01-15',
  score: '2-1',
}

export const MOCK_PLAYERS = [
  { id: 'p1', nombre: 'Jugador', apellidos: 'Uno', dorsal: 1, posicion_principal: 'POR' },
  { id: 'p2', nombre: 'Jugador', apellidos: 'Dos', dorsal: 7, posicion_principal: 'EXD' },
  { id: 'p3', nombre: 'Jugador', apellidos: 'Tres', dorsal: 10, posicion_principal: 'MC' },
  { id: 'p4', nombre: 'Jugador', apellidos: 'Cuatro', dorsal: 9, posicion_principal: 'DC' },
]

export const MOCK_TAGS = [
  { id: 't1', name: 'Gol', color: '#48bb78', shortcut: 'G' },
  { id: 't2', name: 'Tiro', color: '#4299e1', shortcut: 'T' },
  { id: 't3', name: 'Falta', color: '#ed8936', shortcut: 'F' },
  { id: 't4', name: 'Corner', color: '#9f7aea', shortcut: 'C' },
]

// Public test videos that work in a <video> tag (no CORS restrictions)
export const SAMPLE_VIDEOS = [
  {
    label: 'Big Buck Bunny (60s)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    label: 'Elephant Dream',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    label: 'Subaru Outback (30s)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  },
  {
    label: 'For Bigger Blazes',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
]
