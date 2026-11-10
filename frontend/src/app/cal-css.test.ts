import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const PREFIX = 'html[data-appearance="cal"]'

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Splits on commas that are not inside parentheses or brackets. */
function splitTop(list: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++
    if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

/** Returns every selector of every style rule, looking inside @media wrappers. */
function selectors(css: string): string[] {
  const src = stripComments(css)
  const out: string[] = []
  const chunks = src.split('}')
  for (const chunk of chunks) {
    const open = chunk.lastIndexOf('{')
    if (open < 0) continue
    // A chunk may begin with an at-rule wrapper: "@media (...) { sel { decl"
    let head = chunk.slice(0, open)
    let at = head.lastIndexOf('{')
    while (at >= 0) {
      head = head.slice(at + 1)
      at = head.lastIndexOf('{')
    }
    head = head.trim()
    if (!head || head.startsWith('@')) continue
    out.push(...splitTop(head))
  }
  return out
}

for (const file of ['cal-piezas.css', 'cal-compat.css']) {
  describe(file, () => {
    const css = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')

    it('tiene reglas', () => {
      assert.ok(selectors(css).length > 10)
    })

    it('todo selector empieza por el aspecto Cal', () => {
      for (const sel of selectors(css)) {
        assert.ok(sel.startsWith(PREFIX), `fuera de Cal: ${sel.slice(0, 120)}`)
      }
    })

    it('no usa !important', () => {
      assert.equal(stripComments(css).split('!important').length - 1, 0)
    })
  })
}
