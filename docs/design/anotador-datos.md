# Anotador: capa de seguridad de datos

Objetivo: **ningún dato anotado en el campo se pierde**, aunque se vaya internet a mitad del partido, se
cierre la pestaña, la tablet se duerma o el servidor falle. Todo cabe en las tablas actuales: el estado
del acta vive en `partidos.notas_pre` (JSON) vía `mergeNotasPre`; no hay migraciones.

Código: `frontend/src/lib/anotador-datos/**`, `frontend/public/sw.js`, `frontend/src/lib/register-sw.ts`.

## Arquitectura

```
UI ──registrarCambio(snap)──▶ diario (IndexedDB 'kabine-anotador')  ──▶ outbox/motor ──▶ API
        (write-ahead)           partidos | journal | outbox | meta        pasos idempotentes
                                + espejo localStorage del checkpoint
SW: HTML/chunks/fuentes/marca en caché  +  prefetchPartido (partido, convocados, fotos) en IndexedDB
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| Tipos | `tipos.ts` | Op, EstadoPartido, MetaSync, EstadoSync, Aviso |
| Estado/fusión | `estado.ts` | `aplicarOp`, `reproducir`, `fusionarSnapshots`, `decidirRecuperacion`, `opsDesdeDiff` (puro, conmutativo) |
| Almacenes | `almacen.ts` | IndexedDB → localStorage → memoria (degradado), misma interfaz; `navigator.storage.persist()` |
| Diario | `journal.ts` | `registrar` (write-ahead), checkpoint ≤2 s y en `visibilitychange/pagehide/freeze`, recuperación, cuarentena, retención |
| Outbox | `outbox.ts` | Entrega por paso (`revEntregado`, backoff, parqueado) |
| Motor | `sincronizar.ts` | Single-flight, backoff+jitter, 401/409/4xx/5xx, store `subscribe/getSnapshot` |
| Puente | `puente.ts`, `apiReal.ts` | Lógica de `persist()` troceada y llamadas reales |
| Validación | `validacion.ts` | Alarmas antes de enviar |
| Hook | `useAnotadorDatos.ts` | API para la UI |
| Precarga | `prefetch.ts` | Partido + convocados + fotos en local |

## Qué se guarda y cuándo

1. **Antes de que la UI dé la acción por hecha**: cada acción es una operación (`evento_add/edit/del`, `reloj`,
   `cierre`, `alineacion`, `periodos` —tiros, córners, faltas, ocasiones—, `dorsales`, `config`, `reflexion`,
   `nota`) escrita en el store `journal`. `registrar()` se resuelve **solo cuando está en disco**; si falla
   (cuota, modo privado) **rechaza** y la UI debe avisar. La op además se aplica en memoria y se reintenta sola.
2. Checkpoint del estado completo ≤2 s después del último cambio y al ocultar/cerrar/congelar la página
   (también copiado a localStorage como segunda copia).
3. Latido del reloj cada ≥5 s: guarda el tiempo transcurrido (el reloj del UI se mueve por temporizador, no por
   operaciones) y detecta huecos (app dormida con el reloj en marcha, >3 min).
4. El servidor recibe el resultado por pasos (abajo). Mientras no confirme, todo sigue en la tablet.

Recuperación local = último checkpoint + reproducción de las ops retenidas (últimas 200). Reproducir es
idempotente y conmutativo: repetidas o desordenadas dan el mismo estado.
Retención: nunca se borra un partido hasta que el servidor confirma el cierre final (todos los pasos entregados
con el partido cerrado) **y** pasan 7 días. Reabrir el partido anula la confirmación.

## Reglas de recuperación y fusión (`fusionarSnapshots`)

Metadatos (`rev` de Lamport, `deviceId`, sellos por sección, tombstones) viajan dentro de `notas_pre.anotador.sync`;
un acta antigua sin `sync` se trata como sellos vacíos.

- Eventos: unión por `id`; si ambos lados lo tienen gana la edición más reciente. **Borrado vs edición**: gana lo
  más reciente; una edición posterior a un borrado conserva el dato (nunca se pierde información). Los tombstones
  impiden que un borrado resucite al fusionar con una copia vieja.
- Reloj y cierre: mayor `rev`. Alineación y config: sello más reciente (ts). Dorsales rivales: unión.
- Estadísticas por periodo: mismo dispositivo = la más reciente; dispositivos distintos = máximo por contador y
  unión de puntos de falta (limitación: un "deshacer" de una estadística concurrente puede no prevalecer).
- Reflexión: la más reciente; si divergen y ninguna contiene a la otra se conservan ambas. Valoraciones: la más
  reciente por jugador.
- `decidirRecuperacion(local, remoto)`: sin local → `usarServidor`; servidor vacío → `usarLocal`; si fusionar no
  añade nada al local → `usarLocal`; no añade nada al servidor → `usarServidor`; si no → `fusionar`.

## Sincronización (matriz de fallos)

Pasos independientes e idempotentes, cada uno con su estado: `acta` (GET + fusión + PUT `notas_pre`), `titulares`,
`resultado`, `jugadores`, `estadisticas`, `valoraciones`. Un paso está pendiente mientras `revEntregado < rev`.
Los payloads se calculan con el estado actual, solo se reenvía lo que cambió (huella por paso).

| Situación | Comportamiento |
|---|---|
| Sin red / `navigator.onLine=false` | No se llama a la API; estado `sin_conexion`; todo en local |
| Red caída, timeout, 5xx, 429 | Backoff exponencial + jitter (1,5 s → 60 s), se corta el run; tras un fallo de red, sonda `/health` (`no-cors`) antes de insistir |
| 401 | Pausa, datos intactos, estado `login`; `reanudarSync()` tras iniciar sesión |
| 409/412 | Se relee, se fusiona y se reintenta (hasta 3 veces) |
| Otro 4xx | El paso se **aparca** con su error (`pasosConError`), el resto continúa; un cambio del usuario o `forzarSync` lo reintenta |
| Pestaña muerta a mitad | Al reabrir, el outbox persistido reanuda solo lo que falta |
| Dos ejecuciones/pestañas | Una a la vez por pestaña (single-flight) y Web Locks entre pestañas; además todo es idempotente |
| Reloj del dispositivo desfasado | El orden local usa `rev`; ts solo desempata entre dispositivos; la entrega se deduplica por `opId`/`id` |

`registrarResultado` notifica al staff en el servidor: solo se envía con el partido **cerrado** (o "Guardar"
explícito, `forzarSync({resultado:true})`) y solo si cambia el marcador.

Estados (`EstadoSync.estado`): `guardado | pendiente | sin_conexion | sincronizando | error | login`.

## Alarmas (`validarPartido`)

error / aviso / info con `codigo`, mensaje en español, `eventIds`, `convIds` y `accion` sugerida:
`tres_amarillas`, `segunda_amarilla_sin_roja`, `roja_duplicada`, `evento_tras_expulsion`, `evento_tras_sustitucion`,
`cambio_sale_no_en_campo`, `cambio_entra_ya_en_campo`, `cambio_entra_expulsado`, `cambio_reentrada`,
`demasiados_cambios` (5 por defecto; `cambiosIlimitados`), `mas_de_11`, `menos_de_7`, `alineacion_sin_cambio`,
`minuto_imposible`, `minuto_fuera_de_rango`, `eventos_desordenados`, `evento_duplicado`, `gol_lado_incoherente`,
`gol_sin_goleador`, `posible_autogol`, `goles_jugador_descuadre`, `stats_tarjetas_sin_evento`, `rival_sin_dorsal`,
`cerrado_con_reloj`, `primera_parte_sin_cerrar`, `cerrado_sin_eventos`, `eventos_sin_saque`,
`reloj_en_segundo_plano`, `sync_pendiente`. Nada se corrige solo.

## Cableado final (UI ↔ capa de datos)

Único punto de contacto: `components/anotador/usePersistencia.ts` (+ `adaptadores.ts` para tipos y avisos, `sesion.ts` para
los eventos de sesión). La UI no importa `lib/anotador-datos` en ningún `.tsx` (lo comprueba `anotadorCal.wiring.test.ts`).

- **Toda acción** del delegado pasa por `commit`/`aplicarSnap` de `AnotadorApp` → `guardar(next)` = `registrarCambio(next)`
  encolado en orden (eventos añadir/editar/borrar/deshacer, cambios, once/huecos, reloj, parte, dorsales rivales, estadísticas,
  mapa de faltas, ocasiones, cierre/reapertura). Reflexión: `guardarReflexion` (400 ms y siempre al cerrar la hoja o ocultar la
  página); notas de jugador: `guardarNota`. Se acabaron `persist()` y el autoguardado.
- **Fallo al escribir en la tablet**: toast + insignia en rojo «Sin guardar en la tablet» (`estadoSync.estado = 'error'`);
  la capa de datos reintenta sola (`sinPersistir`). Mientras una escritura está en vuelo la insignia dice «Guardando…».
- **Reloj**: `latido` desde el temporizador del reloj (la capa lo limita a 1 cada 5 s) y al pausar.
- **Apertura**: `datosListos` (partido + convocados, de la red o de `cargarPartidoLocal`) → `useAnotadorDatos`. Si hay copia
  local con contenido distinto del servidor: pantalla «Recuperamos tu partido guardado en la tablet · hh:mm — ¿Continuar?».
  `Continuar` = `recuperacion.aplicar()` (usa/fusiona); `Descartar` (mantener pulsado) = `descartarLocal()`: guarda antes una copia
  oculta 24 h en `meta` (`descartado:<partido>`, `descartar.ts`; si no se puede guardar, no descarta) y parte del servidor.
  Si no hay nada que recuperar se aplica en silencio. El reloj siempre arranca en pausa tras una recuperación.
- **Sin red al abrir**: no se espera a la API (>4,5 s o `navigator.onLine === false`): se abre con la copia de `prefetchPartido`.
  Sin copia ni red: pantalla «Este partido no está preparado para jugar sin conexión».
- **Cierre**: `Enviar y cerrar partido` = `registrarCambio(closed)` (en disco) → `forzarSync({resultado:true})`. Estado visible
  (`EstadoEnvio`): «Enviando…» / «Cerrado y guardado en la tablet · N cambios por enviar (todavía NO está en el servidor)» /
  «Cerrado y enviado al servidor ✓» / «No se pudo guardar el cierre en la tablet».
- **Avisos**: `validar()` + `id` estable (`codigo|eventIds|convIds`) para que «Está bien» sobreviva a recalcular.
- **`beforeunload`**: solo si hay pendientes o el estado no es «guardado».
- **Sesión**: `layout` del anotador registra el SW y `marcarAnotadorActivo(true)`; si la sesión caduca NO redirige: aviso fijo +
  diálogo de login (`SesionCaducada`) y, al entrar, el evento `kabine:sesion-restaurada` hace `reanudarSync()`. Si la tablet
  guarda datos del anotador, la app abre aunque no haya sesión (p. ej. recarga sin red con el token caducado). Ningún flujo de
  logout / `sesion-perdida` borra IndexedDB, localStorage del anotador ni cachés (solo `equipo-storage` y `traininghub-club`).
- **Selector** (`/anotador`): `useOfflinePartidos` → «Listo para jugar sin conexión ✓» / «Preparar» (progreso) usando
  `prefetchPartido` + `prepararOffline` (incluye los JS de la ruta del partido leyendo su HTML); prepara solo el próximo
  partido con red; marca «N cambios sin enviar» por partido (`resumirAlmacen`) y un aviso global. Sin red lista los partidos preparados.
- Aviso de cookies: no se pinta en rutas `/anotador*`.

### Imports con extensión `.ts`
Los ficheros de `lib/anotador-datos` se importan entre sí con `./x.ts` porque `node --test` (type stripping) lo exige.
`tsconfig` lleva `allowImportingTsExtensions` (válido con `noEmit`). Webpack resuelve un especificador con extensión como
ruta de fichero exacta y lo pasa por el loader de SWC, igual en `next dev` y `next build`; el dev server compila las rutas sin
errores. Si algún día se quisiera quitar, bastaría un `resolve.extensionAlias` en `next.config.js`; no hace falta hoy.

## Offline (service worker `kabine-v2`)

- `/anotador*`: red primero con margen de 2,5 s y copia de respaldo (renovada en cada carga con red); sin copia, página
  propia "tus datos están a salvo". (SWR puro serviría HTML viejo apuntando a chunks retirados tras un despliegue.)
- `/_next/static/**` con hash: caché primero; sin hash (dev): red primero. Fuentes/marca/iconos: caché + revalidación.
- RSC del anotador: red primero, caché de respaldo, 503 sin copia (Next hace navegación completa).
- Sin `skipWaiting` automático: la versión nueva espera; `SKIP_WAITING` se aplaza si hay un anotador abierto.
  Ninguna actualización recarga páginas.
- Fotos de jugadores: Cache API `kabine-anotador-fotos` (respuestas opacas), sobrevive a cambios de versión.

## Probar sin conexión en Chrome

1. Abrir `/anotador/<id>` con red y pulsar "Preparar para jugar sin conexión".
2. DevTools → Application → Service Workers: comprobar `kabine-v2`. Network → *Offline*.
3. Anotar eventos, recargar (F5): la página y los eventos deben volver. Application → IndexedDB → `kabine-anotador`:
   `journal` crece con cada acción; `partidos` tiene el checkpoint.
4. Matar la pestaña con el reloj en marcha y reabrir: debe ofrecer recuperar.
5. Quitar *Offline*: el estado pasa a `sincronizando` → `guardado`. `datos.diagnostico()` muestra outbox y diario.

## Lo que no se puede garantizar

- Borrado de datos del sitio por el usuario o expulsión del navegador pese a `persist()` (Safari sin PWA instalada).
- Tablet apagada con el reloj en marcha: se pierde el tiempo desde el último latido (≤5 s) y se avisa con `reloj_en_segundo_plano`.
- Dos dispositivos que escriben a la vez en el servidor entre el GET y el PUT del acta (el backend no tiene precondición);
  se corrige en la siguiente sincronización por fusión.
