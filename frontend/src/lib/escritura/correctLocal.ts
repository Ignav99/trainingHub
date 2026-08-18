import { PHRASE_CORRECTIONS, SHORT_TYPOS, WORD_CORRECTIONS } from './typos'

const MIN_PROSE_CHARS = 4

const WORD_RE = /[\p{L}]+(?:['’][\p{L}]+)?/gu

function preserveCase(original: string, replacement: string): string {
  if (!original) return replacement
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}

function looksLikeCodeOrNumber(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  if (/^\d+([.,]\d+)?(%|min|m|km|s|kg|h)?$/i.test(t)) return true
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return true
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true
  if (/^https?:\/\//i.test(t)) return true
  if (/^[A-Z0-9_+./-]{2,12}$/.test(t) && !/[áéíóúñ]/i.test(t) && t === t.toUpperCase()) {
    return t.length <= 6
  }
  return false
}

export function shouldCorrectText(text: string): boolean {
  const t = text.trim()
  if (t.length < MIN_PROSE_CHARS) return false
  if (looksLikeCodeOrNumber(t)) return false
  if (SHORT_TYPOS[t.toLowerCase()]) return true
  return /[\p{L}]{4,}/u.test(t)
}

function correctWords(text: string): string {
  return text.replace(WORD_RE, (word) => {
    if (word.length <= 2 && !SHORT_TYPOS[word.toLowerCase()]) return word
    if (/^\d/.test(word)) return word
    const key = word.toLowerCase().normalize('NFC')
    const mapped = WORD_CORRECTIONS[key] || SHORT_TYPOS[key]
    if (!mapped || mapped.toLowerCase() === key) return word
    return preserveCase(word, mapped)
  })
}

function correctPhrases(text: string): string {
  let out = text
  for (const [re, replacement] of PHRASE_CORRECTIONS) {
    out = out.replace(re, (match) => preserveCase(match, replacement))
  }
  return out
}

function tidySpaces(text: string): string {
  return text
    .replace(/[^\S\n]{2,}/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/([¿¡]) +/g, '$1')
}

export function correctLocal(text: string): { text: string; changed: boolean } {
  if (!shouldCorrectText(text)) return { text, changed: false }
  const next = tidySpaces(correctPhrases(correctWords(text)))
  return { text: next, changed: next !== text }
}

export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i += 1
  return i
}

export function similarityRatio(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  const la = a.length
  const lb = b.length
  const max = Math.max(la, lb)
  let same = commonPrefixLength(a, b)
  let i = 0
  while (i < la && i < lb && a[la - 1 - i] === b[lb - 1 - i]) i += 1
  same = Math.min(max, same + i)
  return same / max
}
