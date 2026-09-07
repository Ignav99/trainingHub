import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseJornadaFecha,
  formatHora,
  formatJornadaKickoff,
  formatJornadaDateSpan,
} from '../frontend/src/lib/jornadaKickoff.ts'

test('parsea fecha RFAF dd-MM-yyyy y no pierde el día por UTC', () => {
  const d = parseJornadaFecha('12-09-2026')
  assert.ok(d)
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 8)
  assert.equal(d.getDate(), 12)
})

test('parsea dd/MM/yyyy e ISO yyyy-MM-dd', () => {
  const slash = parseJornadaFecha('13/09/2026')
  const iso = parseJornadaFecha('2026-09-13')
  assert.equal(slash?.getDate(), 13)
  assert.equal(iso?.getDate(), 13)
})

test('rechaza fechas imposibles', () => {
  assert.equal(parseJornadaFecha('32-09-2026'), null)
  assert.equal(parseJornadaFecha(''), null)
})

test('hora recorta segundos y rellena dígito', () => {
  assert.equal(formatHora('18:00:00'), '18:00')
  assert.equal(formatHora('9:05'), '09:05')
  assert.equal(formatHora(''), '')
})

test('kickoff muestra día de la semana, fecha y hora — no solo la hora', () => {
  const parts = formatJornadaKickoff('12-09-2026', '18:00')
  assert.equal(parts.weekday, 'sáb')
  assert.equal(parts.date, '12 sep')
  assert.equal(parts.time, '18:00')
  assert.equal(parts.label, 'sáb 12 sep · 18:00')
})

test('domingo se diferencia del sábado en la misma jornada', () => {
  const sab = formatJornadaKickoff('12-09-2026', '18:00')
  const dom = formatJornadaKickoff('13-09-2026', '12:00')
  assert.equal(sab.weekday, 'sáb')
  assert.equal(dom.weekday, 'dom')
  assert.notEqual(sab.label, dom.label)
})

test('si solo hay hora o solo fecha, no se pierde el dato', () => {
  assert.equal(formatJornadaKickoff('', '18:00').label, '18:00')
  assert.equal(formatJornadaKickoff('12-09-2026', '').label, 'sáb 12 sep')
  assert.equal(formatJornadaKickoff('', '').label, '-')
})

test('span de jornada une sábado y domingo', () => {
  const span = formatJornadaDateSpan(['12-09-2026', '12-09-2026', '13-09-2026'])
  assert.equal(span, 'sáb 12 sep – dom 13 sep')
})
