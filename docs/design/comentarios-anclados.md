# Comentarios anclados

Comunicación interna del staff fijada en el punto exacto de la página donde se habla. Sustituye al bloque «Comentarios del staff» que había al pie de sesiones y partidos. Reutiliza `staff_posts` (tipos, menciones, respuestas, resolver) y el tablero.

## Qué ve el usuario

- Botón flotante abajo a la derecha en todo el panel (`PinsFab`). Número = comentarios sin resolver de esta vista.
- Menú: **Comentar aquí** (atajo `c`), **Comentarios de esta página (N)** con salto, **Ver todos en la página** (resúmenes translúcidos de una línea), **Ocultar marcadores**, **Abrir tablero**.
- Modo colocar: cursor en cruz y una barra fija arriba («Haz clic donde quieras dejar el comentario · Esc para cancelar»). Un clic fija el punto y abre un compositor pequeño con tipo (comentario, pregunta, tarea, aviso) y menciones.
- Marcador cuadrado con número; resuelto, apagado y tachado. Clic = burbuja translúcida (única superficie con transparencia y desenfoque de Cal): hilo, responder, resolver o reabrir, borrar (autor o moderador).
- La capa es `position: fixed` con `pointer-events: none` salvo los marcadores: nada empuja ni tapa el contenido.

## Modelo de ancla (`staff_posts.ancla`, JSONB)

`{ ruta, path, selector, dx, dy, x, y, vw }`

- `ruta`: pathname + claves de query que cambian la vista (`tab`, `fase`, `phase`, `vista`, `view`), normalizada. `path`: solo el pathname (el servidor lo añade y filtra por él).
- `selector`: ancestro estable más cercano (`[data-pin-id]`, `id` estable, `data-testid`) o ruta corta de ≤4 niveles con tag, `nth-of-type` y clases semánticas (sin utilidades Tailwind ni hashes). Para anclar un bloque de forma fiable, ponle `data-pin-id`.
- `dx`, `dy`: fracciones 0..1 dentro de la caja del elemento.
- `x`, `y`, `vw`: respaldo en píxeles de página y ancho de ventana; si el elemento no existe, se escala por el cambio de ancho.
- Se recalcula al hacer scroll (también en contenedores), `resize`, `ResizeObserver` y `MutationObserver`, agrupado por `requestAnimationFrame`.

Código: `frontend/src/lib/pins/ancla.ts` (puro, probado con `node --test`), `ancla-dom.ts` (DOM), `components/pins/*`, `stores/pinsStore.ts`.

## Enlace profundo

Las menciones, asignaciones y respuestas generan notificaciones con `url = <ruta>?pin=<postId>` (`url_hilo` en `staff_board_service.py`). Al llegar: espera hasta ~3 s a que el ancla se resuelva, centra con scroll suave, abre la burbuja con un pulso breve (sin movimiento si hay `prefers-reduced-motion`), marca el hilo como leído y quita `?pin=` sin recargar. Si no se puede resolver (hilo borrado, migración pendiente), abre el hilo en el panel del staff. En el tablero, los hilos anclados llevan «Ver en la página». Los enlaces `/tablero?post=` siguen funcionando.

## API

- `GET /tablero/pines?equipo_id=&ruta=<pathname>` → `{ data: [hilo], disponible }`.
- `POST /tablero` acepta `ancla`; se valida y recorta en el servidor.
- Los hilos anclados se pueden resolver aunque sean comentarios.

## Degradación sin migración

Todo funciona antes de aplicar la migración:

- Las consultas usan `select('*')`: no piden `ancla` por nombre.
- `GET /tablero/pines` captura el error de columna inexistente (42703 / PGRST204) y devuelve `{ data: [], disponible: false }`.
- `POST /tablero` con `ancla` devuelve `503 {"detail":"Falta aplicar la migración de comentarios anclados"}`; sin `ancla` no cambia nada.
- El botón flotante oculta «Comentar aquí» y la lista; a los administradores les muestra «Comentarios anclados disponibles tras actualizar la base de datos».

## Migración pendiente (no aplicada)

`supabase/migrations/20261127100000_staff_posts_ancla.sql`: `ALTER TABLE staff_posts ADD COLUMN IF NOT EXISTS ancla JSONB` más dos índices parciales (`ancla->>'ruta'` y `(equipo_id, ancla->>'path')`). Aditiva, sin reescritura de tabla ni pérdida de datos. Hay que aplicarla en Supabase antes de que los comentarios anclados estén activos.
