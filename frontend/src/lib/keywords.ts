/**
 * Extracción de keywords / keyphrases para objetivos de sesión (ES).
 * Espejo del algoritmo backend (RAKE-like + léxico táctico).
 * Mantener alineado con backend/app/services/keywords.py
 */

const STOPWORDS_ES = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'aqui', 'asi',
  'como', 'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde', 'donde',
  'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era',
  'erais', 'eran', 'esas', 'esos', 'esta', 'estas', 'este', 'estos', 'fin',
  'fue', 'fueron', 'ha', 'haber', 'habia', 'han', 'has', 'hasta', 'hay',
  'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'muy',
  'ni', 'no', 'nos', 'o', 'os', 'otra', 'otras', 'otro', 'otros', 'para',
  'pero', 'poco', 'por', 'porque', 'que', 'se', 'sea', 'sean', 'segun',
  'ser', 'si', 'sin', 'sobre', 'su', 'sus', 'tambien', 'te', 'tiene',
  'tienen', 'todo', 'todos', 'tu', 'tus', 'un', 'una', 'unas', 'uno',
  'unos', 'y', 'ya', 'tras', 'mediante', 'hacia', 'bajo', 'cada', 'cualquiera',
  'hacer', 'mejorar', 'trabajar', 'trabajo', 'sesion', 'partido', 'equipo',
  'nuestro', 'nuestra', 'nuestros', 'nuestras', 'hoy', 'dia', 'nueva',
  'nuevo', 'conseguir', 'lograr', 'buscar', 'mantener', 'potenciar',
  'desarrollar', 'enfocar', 'enfoque', 'objetivo', 'objetivos', 'principal',
  'queremos', 'vamos', 'seguir', 'incidir', 'incidiendo', 'aspecto',
  'aspectos', 'tema', 'temas', 'parte', 'nivel', 'forma', 'manera',
  'ultimo', 'ultima', 'primer', 'primera', 'segundo', 'tercero',
])

const KEEP_SINGLE = new Set([
  'abp', 'ssg', 'rondo', 'pressing', 'gegenpressing', 'bloqueo', 'bloque',
  'amplitud', 'profundidad', 'posesion', 'transicion', 'finalizacion',
  'progresion', 'salida', 'remate', 'centro', 'regate', 'marcaje', 'acoso',
  'cobertura', 'permuta', 'basculacion', 'repliegue', 'achique',
  'desmarque', 'pared', 'conduccion', 'anticipacion', 'temporizacion',
  'vigilancias', 'superioridad', 'inferioridad', 'conservacion', 'circulacion',
  '1v1', '2v1', '2v2', '3v2', '3v3', '4v3', '4v4', '5v5', '6v6', '7v7',
  '8v8', '9v9', '11v11', 'gk',
])

const WEAK_SINGLE = new Set([
  'alta', 'alto', 'baja', 'bajo', 'media', 'medio', 'larga', 'corto',
  'corta', 'rapida', 'rapido', 'lenta', 'lento', 'buena', 'bueno', 'mejor',
  'peor', 'grande', 'pequena', 'fuerte', 'debil', 'organizada', 'organizado',
  'colectiva', 'colectivo', 'individual', 'tactica', 'tactico', 'tecnica',
  'tecnico', 'fisica', 'fisico', 'mental', 'general', 'especifica',
])

const PHRASE_LEXICON = [
  'presion alta',
  'presion media',
  'presion baja',
  'presion alta tras perdida',
  'presion tras perdida',
  'presion tras recuperacion',
  'presion saque de meta',
  'contra presion',
  'contrapresion',
  'bloque alto',
  'bloque medio',
  'bloque bajo',
  'repliegue organizado',
  'repliegue intensivo',
  'salida de balon',
  'salida balon',
  'juego entre lineas',
  'juego de posicion',
  'juego posicional',
  'juego por banda',
  'juego interior',
  'juego exterior',
  'ocupacion de espacios',
  'ataque de espacios',
  'ataque organizado',
  'defensa organizada',
  'conservacion del balon',
  'conservacion de balon',
  'pase y circulacion',
  'cambio de orientacion',
  'tercer hombre',
  'hombre libre',
  'control orientado',
  'cobertura de balon',
  'superioridad numerica',
  'inferioridad numerica',
  'crear superioridad',
  'generar superioridad',
  'transicion ofensiva',
  'transicion defensiva',
  'transicion ataque defensa',
  'transicion defensa ataque',
  'ataque tras recuperacion',
  'defensa tras perdida',
  'balon parado',
  'saque de banda',
  'saque de puerta',
  'saque de meta',
  'saque de esquina',
  'falta lateral',
  'falta frontal',
  'falta lejana',
  'corner ofensivo',
  'corner defensivo',
  'semi corner',
  'pase filtrado',
  'pase profundo',
  'centro al area',
  'remate de cabeza',
  'duelo 1v1',
  'duelos 1v1',
  'linea de pase',
  'lineas de pase',
  'fuera de juego',
  'achique de espacios',
  'basculacion defensiva',
  'marcaje individual',
  'marcaje zonal',
  'cobertura defensiva',
  'carga alta',
  'carga media',
  'carga baja',
  'fuerza potencia',
  'resistencia especifica',
]

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n').replace(/Ñ/g, 'n')
}

function normalizeText(text: string): string {
  let t = stripAccents(text.toLowerCase().trim())
  t = t.replace(/[–—−]/g, '-')
  t = t.replace(/[^\w\s\-+/]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

function tokenize(text: string): string[] {
  if (!text) return []
  return text
    .split(/[\s|/;,+]+/)
    .map((p) => p.replace(/^[-_]+|[-_]+$/g, ''))
    .filter(Boolean)
}

type PhraseEntry = { toks: string[]; canon: string }

const PHRASES: PhraseEntry[] = (() => {
  const seen = new Set<string>()
  const items: PhraseEntry[] = []
  for (const raw of PHRASE_LEXICON) {
    const canon = normalizeText(raw)
    if (!canon || seen.has(canon)) continue
    seen.add(canon)
    const toks = tokenize(canon)
    if (toks.length) items.push({ toks, canon })
  }
  items.sort((a, b) => b.toks.length - a.toks.length || a.canon.localeCompare(b.canon))
  return items
})()

function matchLexicon(tokens: string[]): { found: string[]; remainder: (string | null)[] } {
  const n = tokens.length
  const consumed = Array(n).fill(false)
  const found: string[] = []
  let i = 0
  while (i < n) {
    let matched = false
    for (const { toks, canon } of PHRASES) {
      const L = toks.length
      if (i + L > n) continue
      if (consumed.slice(i, i + L).some(Boolean)) continue
      let ok = true
      for (let k = 0; k < L; k++) {
        if (tokens[i + k] !== toks[k]) {
          ok = false
          break
        }
      }
      if (!ok) continue
      found.push(canon)
      for (let j = i; j < i + L; j++) consumed[j] = true
      i += L
      matched = true
      break
    }
    if (!matched) i += 1
  }
  const remainder = tokens.map((t, j) => (consumed[j] ? null : t))
  return { found, remainder }
}

function isGoodCandidate(tokens: string[], phrase: string): boolean {
  if (!tokens.length) return false
  if (tokens.length === 1) {
    const t = tokens[0]
    if (KEEP_SINGLE.has(t)) return true
    if (WEAK_SINGLE.has(t) || STOPWORDS_ES.has(t)) return false
    if (/^\d+v\d+$/.test(t)) return true
    return t.length >= 4
  }
  const strong = tokens.filter(
    (t) => !WEAK_SINGLE.has(t) && !STOPWORDS_ES.has(t) && (t.length >= 3 || KEEP_SINGLE.has(t)),
  )
  return strong.length >= 1 && phrase.length >= 5
}

function isAtomic(tok: string): boolean {
  return KEEP_SINGLE.has(tok) || /^\d+v\d+$/.test(tok)
}

function rakeCandidates(remainder: (string | null)[]): string[] {
  const candidates: string[] = []
  let buf: string[] = []

  const flush = () => {
    while (buf.length && STOPWORDS_ES.has(buf[0])) buf.shift()
    while (buf.length && STOPWORDS_ES.has(buf[buf.length - 1])) buf.pop()
    if (!buf.length) return
    const phrase = buf.join(' ')
    if (isGoodCandidate(buf, phrase)) candidates.push(phrase)
    buf = []
  }

  for (const tok of remainder) {
    if (tok === null) {
      flush()
      continue
    }
    if (STOPWORDS_ES.has(tok)) {
      flush()
      continue
    }
    if (isAtomic(tok)) {
      flush()
      if (isGoodCandidate([tok], tok)) candidates.push(tok)
      continue
    }
    buf.push(tok)
  }
  flush()
  return candidates
}

export function normalizeKeyword(extra: string): string | null {
  if (!extra?.trim()) return null
  const t = normalizeText(extra)
  if (!t) return null
  const toks = tokenize(t)
  if (!toks.length) return null
  if (toks.every((x) => STOPWORDS_ES.has(x))) return null
  const phrase = toks.join(' ')
  if (toks.length === 1 && WEAK_SINGLE.has(toks[0]) && !KEEP_SINGLE.has(toks[0])) return null
  if (phrase.length < 2) return null
  return phrase
}

export function normalizeKeywordList(keywords: string[], maxKeywords = 24): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of keywords) {
    const t = normalizeKeyword(String(raw))
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
    if (out.length >= maxKeywords) break
  }
  return out
}

/** Genera keyphrases desde el objetivo (+ extras manuales preservados como frase). */
export function synthesizeKeywords(
  objetivo: string | null | undefined,
  extra: string[] = [],
  maxKeywords = 16,
): string[] {
  const found: string[] = []
  const seen = new Set<string>()

  const add = (phrase: string) => {
    if (phrase && !seen.has(phrase) && found.length < maxKeywords) {
      seen.add(phrase)
      found.push(phrase)
    }
  }

  if (objetivo?.trim()) {
    const norm = normalizeText(objetivo)
    const tokens = tokenize(norm)
    const { found: lexiconHits, remainder } = matchLexicon(tokens)
    for (const h of lexiconHits) add(h)
    for (const cand of rakeCandidates(remainder)) {
      const ctoks = cand.split(' ')
      if (ctoks.length === 1 && lexiconHits.some((h) => h.split(' ').includes(ctoks[0]))) {
        continue
      }
      add(cand)
    }
  }

  for (const e of extra) {
    const t = normalizeKeyword(e)
    if (t) add(t)
  }

  return found
}
