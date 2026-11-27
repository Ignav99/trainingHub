import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const src = join(process.cwd(), 'src')
const read = (p: string) => readFileSync(join(src, p), 'utf8')
const componentes = readdirSync(join(src, 'components/anotador'))
  .filter((f) => f.endsWith('.tsx'))
  .map((f) => `components/anotador/${f}`)
const archivos = [...componentes, 'app/(anotador)/layout.tsx', 'app/(anotador)/anotador/page.tsx']

test('el anotador es superficie Visitante', () => {
  for (const f of ['app/(anotador)/layout.tsx', 'components/anotador/AnotadorApp.tsx', 'components/anotador/Esqueleto.tsx']) {
    assert.match(read(f), /data-superficie="visitante"/, f)
  }
})

test('lleva el logo de Kabin-e en la barra y en el selector', () => {
  assert.match(read('components/anotador/TopBar.tsx'), /KabineMark/)
  assert.match(read('app/(anotador)/anotador/page.tsx'), /KabineLogo/)
})

test('sin paleta fija, hex, degradados, vidrio ni sombras', () => {
  for (const f of archivos) {
    const code = read(f)
    assert.doesNotMatch(code, /gradient|backdrop-blur|shadow-(?!none)/, f)
    assert.doesNotMatch(code, /\b(?:bg|text|border|ring|outline)-(?:zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose|white|black)\b/, f)
    assert.doesNotMatch(code, /#[0-9a-fA-F]{6}\b/, f)
    assert.doesNotMatch(code, /text-\[1[0-3]px\]|transition-all/, f)
  }
})

test('la integración con la capa de datos está aislada', () => {
  assert.match(read('components/anotador/adaptadores.ts'), /INTEGRACIÓN/)
  assert.match(read('components/anotador/usePersistencia.ts'), /INTEGRACIÓN/)
  for (const f of componentes.filter((c) => !c.endsWith('usePersistencia.ts'))) {
    assert.doesNotMatch(read(f), /anotador-datos/, f)
  }
})
