# Comentarios del staff en el botón flotante

Comunicación interna del staff sin salir de la página. Sustituye al bloque «Comentarios del staff» que había al pie de sesiones y partidos. Reutiliza `staff_posts` (tipos, menciones, respuestas, resolver) y el tablero. **No necesita ninguna migración.**

## Modo activo: hilos sobre la página (sin migración)

- Botón flotante abajo a la derecha en todo el panel (`PinsFab`). El número = hilos sin resolver sobre lo que se está viendo.
- Menú: **Comentar en esta página** (atajo `c`), **Comentarios de esta página (N)** (lista; un clic abre el hilo con respuestas, resolver y borrar en una burbuja translúcida junto al botón), **Abrir tablero**.
- Qué es «esta página»: `entidadDeRuta` (`lib/pins/entidad.ts`) deduce la entidad de la ruta: `/sesiones/[id]`, `/partidos/[id]` o `/partidos?match=`, `/plantilla/[id]` (jugador), `/rivales/[id]`. El hilo se guarda con `entidad_tipo`/`entidad_id`/`entidad_titulo` (el servidor pone el título y comprueba que sea del equipo u organización). Sin entidad (panel, listados) es un comentario general: `entidad_titulo` = título de la página y la ruta, unidas con el separador `U+241F`; el servidor las separa al servir (`entidad_titulo`, `entidad_href`).
- Listado: `GET /tablero?equipo_id=&entidad_tipo=&entidad_id=` o `&pagina=<pathname>`.
- Notificaciones (menciones, asignaciones, respuestas): `url = <página>?hilo=<postId>` (`url_hilo`). Al llegar se abre el hilo junto al botón con un pulso breve, se marca leído y se limpia el parámetro; si el hilo no está, se abre en el panel del staff. Los `/tablero?post=` siguen valiendo para hilos sin página.
- Cualquier hilo sobre una entidad o página se puede resolver y reabrir.

## Modo dormante: anclar en un punto (requiere migración opcional)

Código listo, oculto. Se activa solo con `NEXT_PUBLIC_PINS_ANCLADOS=1` **y** si el servidor responde `disponible: true`; aparece como «Anclar en un punto». Sin la columna no se pide nada ni se muestra nada, tampoco avisos a administradores.

### Qué ve el usuario

- Botón flotante abajo a la derecha en todo el panel (`PinsFab`). Número = comentarios sin resolver de esta vista.
- Menú (modo anclado): **Anclar en un punto**, **Comentarios de esta página (N)** con salto, **Ver todos en la página**, **Ocultar marcadores**.
- Modo colocar: cursor en cruz y una barra fija arriba («Haz clic donde quieras dejar el comentario · Esc para cancelar»). Un clic fija el punto y abre un compositor pequeño con tipo (comentario, pregunta, tarea, aviso) y menciones.
- Marcador cuadrado con número; resuelto, apagado y tachado. Clic = burbuja translúcida (única superficie con transparencia y desenfoque de Cal): hilo, responder, resolver o reabrir, borrar (autor o moderador).
- La capa es `position: fixed` con `pointer-events: none` salvo los marcadores: nada empuja ni tapa el contenido.

### Modelo de ancla (`staff_posts.ancla`, JSONB)

`{ ruta, path, selector, dx, dy, x, y, vw }`

- `ruta`: pathname + claves de query que cambian la vista (`tab`, `fase`, `phase`, `vista`, `view`), normalizada. `path`: solo el pathname (el servidor lo añade y filtra por él).
- `selector`: ancestro estable más cercano (`[data-pin-id]`, `id` estable, `data-testid`) o ruta corta de ≤4 niveles con tag, `nth-of-type` y clases semánticas (sin utilidades Tailwind ni hashes). Para anclar un bloque de forma fiable, ponle `data-pin-id`.
- `dx`, `dy`: fracciones 0..1 dentro de la caja del elemento.
- `x`, `y`, `vw`: respaldo en píxeles de página y ancho de ventana; si el elemento no existe, se escala por el cambio de ancho.
- Se recalcula al hacer scroll (también en contenedores), `resize`, `ResizeObserver` y `MutationObserver`, agrupado por `requestAnimationFrame`.

Código: `frontend/src/lib/pins/ancla.ts` (puro, probado con `node --test`), `ancla-dom.ts` (DOM), `components/pins/*`, `stores/pinsStore.ts`.

### Enlace profundo (`?pin=`)

Las menciones, asignaciones y respuestas generan notificaciones con `url = <ruta>?pin=<postId>` (`url_hilo` en `staff_board_service.py`). Al llegar: espera hasta ~3 s a que el ancla se resuelva, centra con scroll suave, abre la burbuja con un pulso breve (sin movimiento si hay `prefers-reduced-motion`), marca el hilo como leído y quita `?pin=` sin recargar. Si no se puede resolver (hilo borrado, migración pendiente), abre el hilo en el panel del staff. En el tablero, los hilos anclados llevan «Ver en la página». Los enlaces `/tablero?post=` siguen funcionando.

### API del modo anclado

- `GET /tablero/pines?equipo_id=&ruta=<pathname>` → `{ data: [hilo], disponible }`.
- `POST /tablero` acepta `ancla`; se valida y recorta en el servidor.
- Los hilos anclados se pueden resolver aunque sean comentarios.

### Sin la columna

Todo funciona antes de aplicar la migración:

- Las consultas usan `select('*')`: no piden `ancla` por nombre.
- `GET /tablero/pines` captura el error de columna inexistente (42703 / PGRST204) y devuelve `{ data: [], disponible: false }`.
- `POST /tablero` con `ancla` devuelve `503 {"detail":"Falta aplicar la migración de comentarios anclados"}`; sin `ancla` no cambia nada.
- El botón flotante no muestra nada del modo anclado (ni avisos a administradores).

## Migración opcional (NO aplicada)

`supabase/migrations/20261127100000_staff_posts_ancla.sql`: `ALTER TABLE staff_posts ADD COLUMN IF NOT EXISTS ancla JSONB` más dos índices parciales (`ancla->>'ruta'` y `(equipo_id, ancla->>'path')`). Aditiva, sin reescritura de tabla ni pérdida de datos. **Decisión: no se aplica.** El archivo se conserva por si algún día se quieren los anclajes en un punto; el modo activo no depende de él.
