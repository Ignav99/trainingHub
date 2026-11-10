# Cal — sistema de diseño de Kabin-e

Cal es la línea que marca el campo. Con esa línea se dibuja toda la herramienta.
Este documento es la referencia para cualquier cambio de interfaz. Si una pantalla
nueva no cumple estas reglas, no es Cal.

Propuesta visual aprobada: https://claude.ai/artifact/TdohfAPPyGFWsmiLY42HVB

## Cuatro reglas

1. **Una sola línea.** Un único grosor de trazo (1,5 px) para bordes que importan, iconos,
   campo, gráficos y dorsales. Sin sombras, sin degradados, sin vidrio esmerilado.
   El relleno se reserva para decir algo: el club, un estado, hoy.
2. **Rectángulo es cosa, círculo es persona.** Sesiones, tareas, partidos e informes son
   rectángulos de esquina casi viva (`--radius: 0.125rem`). Jugadores y cuerpo técnico son
   siempre fichas redondas con dorsal. `rounded-full` solo para personas.
3. **Cinco carriles.** La rejilla de página usa las proporciones del campo:
   `13.84fr 11fr 18.32fr 11fr 13.84fr` (clase `grid-cols-carriles`). La navegación vive
   en la banda (primer carril).
4. **La semana manda.** Arriba, siempre, el microciclo de MD-5 a MD+1 con hoy marcado.

## Superficies

| Superficie | Cuándo | Cómo se activa |
|---|---|---|
| Local (clara) | Trabajo diario, iPad al sol | `html[data-appearance="cal"]` |
| Visitante (oscura) | Vídeo, anotador, pizarra, salas de revisión | `data-superficie="visitante"` en el contenedor |
| Papel | PDF e informes A4 | Blanco, tinta negra, color del club |

## Color

- Los tokens siguen el contrato de shadcn: tripletes HSL consumidos como `hsl(var(--token))`.
- El club aporta el **tono** (`--club-h`). Los neutros se tiñen con ese tono a saturación baja.
- `--club-safe` es el color del club oscurecido hasta cumplir contraste 4,5:1 con blanco.
  `--club-safe-dark` es el mismo tono aclarado para la superficie Visitante.
  Los calcula `src/lib/clubTone.ts`; nunca se usa el hex del club directamente para texto o botones.
- Una sola acción con el color del club por pantalla.
- Semánticos, separados del color del club y siempre con forma además de color:
  `--warning` (tarjeta amarilla: duda, apercibido), `--destructive` (tarjeta roja: baja, sanción),
  `--success` (visto: disponible, alta), `--info` (círculo: aviso).
- Categorías de tarea (RND, JDP, POS…): color de peto **más** la sigla escrita. Nunca solo color.
- Prohibido en código nuevo: clases de paleta fija (`bg-blue-500`, `text-gray-600`), hex sueltos,
  `bg-white`, `text-[13px]`. Usar tokens.

## Tipografía

- **Encode Sans** variable (`--font-cal`), licencia OFL. Ejes: peso 100–900, ancho 75–125.
  - Estrecha (`font-stretch: 75%`): cabeceras de tabla, rótulos, datos apretados.
  - Normal: texto y controles.
  - Ancha (`font-stretch: 112%`): títulos de sección.
- **Martian Mono** (`--font-cal-mono`): solo tiempos de vídeo y datos GPS.
- Cifras tabulares siempre (`tabular-nums`). Unidades separadas del número.
- Interfaz en español, en frase. Nunca mayúsculas de título.

## Movimiento

| Uso | Duración |
|---|---|
| Teclado, selección de fila | 0 ms |
| Pulsar (`scale(.97)`) | 120 ms (`duration-rapido`) |
| Menús, avisos | 180 ms (`duration-base`) |
| Paneles laterales | 260 ms (`duration-panel`) |

Curva `ease-sale` = `cubic-bezier(0.2, 0, 0, 1)`. Solo `transform` y `opacity`. Nunca
`transition-all`. Las salidas duran menos que las entradas. Con `prefers-reduced-motion`
quedan solo los fundidos.

## Piezas

- **Ficha**: círculo con dorsal. Titular = relleno del club. Duda = borde discontinuo.
  Baja = tachada. Sancionado = tarjeta roja en la esquina.
- **Tablas** en lugar de rejillas de tarjetas: fila de 44 px, cifras a la derecha, estado con forma.
- **Sin pastillas** por defecto. El estado se escribe.
- **Iconos**: set propio del oficio con trazo de 1,5 px. Lucide solo para lo genérico mientras dure la migración.
- **Carga**: esqueletos con la forma real. Sin ruedas a pantalla completa.
- Objetivos táctiles: 40 px en escritorio, 48 px en tableta.

## Volver atrás

- Copia del estado anterior al rediseño: etiqueta `pre-rediseno-2026-11-10`,
  rama `backup/diseno-actual-2026-11-10`.
- Tres aspectos conviven: `acta` (por defecto), `clasico` y `cal`. Se guardan en
  `localStorage['kabine-appearance:v1']` y se cambian desde la barra lateral.
- Cada fase añade su propia etiqueta `cal-fase-N-antes` antes de fusionarse.

## Fases

1. Cimientos: tokens, superficies, tipografía, rejilla, movimiento. Cal apagado por defecto.
2. Banda, semana y arranque.
3. Piezas.
4. Pantallas de cada día: hoy, plantilla, sesiones, partidos.
5. Resto del panel.
6. Visitante y Papel.
7. Puerta de entrada y marca. Cal por defecto.
