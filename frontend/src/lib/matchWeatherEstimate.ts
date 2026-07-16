/**
 * Estimación climática del día de partido vía Open-Meteo (sin API key).
 * Genera un texto argumentativo para orientar la suplementación.
 */

export interface WeatherEstimateInput {
  fecha?: string // YYYY-MM-DD
  hora?: string // HH:MM
  ciudad?: string
}

export interface WeatherEstimateResult {
  texto: string
  resumen: {
    ciudad?: string
    fecha?: string
    hora?: string
    temperatura_c?: number
    humedad_pct?: number
    viento_kmh?: number
    precipitacion_prob?: number
    condicion?: string
  }
}

async function geocodeCity(ciudad: string): Promise<{ lat: number; lon: number; name: string } | null> {
  const q = encodeURIComponent(ciudad.trim())
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=es&format=json`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const hit = data?.results?.[0]
  if (!hit) return null
  return {
    lat: hit.latitude,
    lon: hit.longitude,
    name: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
  }
}

function pickHourIndex(times: string[], hora?: string): number {
  if (!times.length) return 0
  const targetH = hora ? parseInt(hora.split(':')[0] ?? '16', 10) : 16
  let best = 0
  let bestDiff = Infinity
  times.forEach((t, i) => {
    const h = parseInt(t.slice(11, 13), 10)
    const diff = Math.abs(h - targetH)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  })
  return best
}

function condicionLabel(temp: number, precipProb: number, humidity: number): string {
  if (precipProb >= 60) return 'lluvioso / riesgo de precipitación'
  if (temp >= 30) return 'calor intenso'
  if (temp >= 25) return 'cálido'
  if (temp <= 8) return 'frío'
  if (temp <= 14) return 'fresco'
  if (humidity >= 75) return 'húmedo'
  return 'templado'
}

function buildArgumentacion(params: {
  ciudadLabel: string
  fecha?: string
  hora?: string
  temp: number
  humidity: number
  wind: number
  precip: number
  condicion: string
}): string {
  const { ciudadLabel, fecha, hora, temp, humidity, wind, precip, condicion } = params
  const when = [fecha, hora].filter(Boolean).join(' · ')
  const lines: string[] = []

  lines.push(
    `Estimación climática para el partido${when ? ` (${when})` : ''} en ${ciudadLabel}: ` +
      `${Math.round(temp)}°C, humedad ${Math.round(humidity)}%, viento ~${Math.round(wind)} km/h` +
      (precip >= 20 ? `, probabilidad de precipitación ${Math.round(precip)}%` : '') +
      `. Condiciones: ${condicion}.`
  )

  if (temp >= 28 || (temp >= 24 && humidity >= 65)) {
    lines.push(
      'Argumento nutricional: priorizar hidratación pre-partido y electrolitos (sodio/potasio). ' +
        'Valorar bebida isotónica durante el esfuerzo y reposición de líquidos post-partido. ' +
        'Evitar sobrecarga de cafeína si hay riesgo de deshidratación.'
    )
  } else if (temp <= 10) {
    lines.push(
      'Argumento nutricional: clima frío — asegurar aporte energético (HC) y bebida templada si es posible. ' +
        'La sed suele ser menor; no descuidar hidratación. Cafeína puede ayudar a la activación si el protocolo lo contempla.'
    )
  } else if (precip >= 55) {
    lines.push(
      'Argumento nutricional: riesgo de lluvia/humedad — planificar snacks fáciles de digerir y ' +
        'hidratación constante. Priorizar comodidad gastrointestinal ante posibles interrupciones.'
    )
  } else {
    lines.push(
      'Argumento nutricional: condiciones moderadas. Mantener protocolo habitual de hidratación, ' +
        'aporte de HC según hora del partido y suplementación individualizada por el nutricionista/fisio.'
    )
  }

  lines.push(
    'Esta estimación es orientativa (previsión meteorológica). Ajusta la suplementación según el jugador, ' +
      'el microciclo y la experiencia del staff.'
  )

  return lines.join('\n\n')
}

export async function fetchMatchWeatherEstimate(
  input: WeatherEstimateInput
): Promise<WeatherEstimateResult> {
  const ciudad = (input.ciudad || 'Madrid').trim() || 'Madrid'
  const geo = await geocodeCity(ciudad)
  if (!geo) {
    throw new Error(`No se encontró la ubicación "${ciudad}". Prueba con otra ciudad.`)
  }

  const fecha = input.fecha || new Date().toISOString().slice(0, 10)
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m',
    start_date: fecha,
    end_date: fecha,
    timezone: 'Europe/Madrid',
    wind_speed_unit: 'kmh',
  })

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) {
    throw new Error('No se pudo obtener la previsión meteorológica')
  }
  const data = await res.json()
  const hourly = data?.hourly
  if (!hourly?.time?.length) {
    throw new Error('Sin datos de previsión para esa fecha (puede estar fuera del rango disponible)')
  }

  const idx = pickHourIndex(hourly.time, input.hora)
  const temp = Number(hourly.temperature_2m?.[idx] ?? 0)
  const humidity = Number(hourly.relative_humidity_2m?.[idx] ?? 0)
  const precip = Number(hourly.precipitation_probability?.[idx] ?? 0)
  const wind = Number(hourly.wind_speed_10m?.[idx] ?? 0)
  const condicion = condicionLabel(temp, precip, humidity)

  const resumen = {
    ciudad: geo.name,
    fecha,
    hora: input.hora,
    temperatura_c: Math.round(temp * 10) / 10,
    humedad_pct: Math.round(humidity),
    viento_kmh: Math.round(wind * 10) / 10,
    precipitacion_prob: Math.round(precip),
    condicion,
  }

  return {
    texto: buildArgumentacion({
      ciudadLabel: geo.name,
      fecha,
      hora: input.hora,
      temp,
      humidity,
      wind,
      precip,
      condicion,
    }),
    resumen,
  }
}
