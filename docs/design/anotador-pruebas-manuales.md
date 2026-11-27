# Anotador: pruebas manuales en la tablet real

Checklist para el partido de prueba (usa un partido de entrenamiento, nunca uno oficial). Cada punto dice qué hacer,
qué debe pasar y qué mirar si falla. La insignia de arriba a la izquierda es la fuente de verdad:
`Guardado · hh:mm` (todo en la tablet y en el servidor), `Guardando…`, `Sin conexión · N en cola`,
`Sincronizando…`, `Error al sincronizar`, `Sesión caducada`.

Antes de empezar: la tablet con batería ≥ 50 %, Chrome/Safari actualizado, sesión iniciada, y el aviso de cookies ya aceptado en otra pantalla.

## 0. Preparación (con wifi)
1. Abre `/anotador`. El partido de la próxima jornada se prepara solo.
   - Esperado: junto al partido aparece `Listo para jugar sin conexión ✓`. Si no, pulsa `Preparar` y espera a que termine.
2. Recarga la página una vez (la primera vez el modo sin conexión aún no controla la página).
3. Abre el partido. Esperado: once, banquillo y fotos; insignia `Guardado · hh:mm`.

## 1. Modo avión a mitad del partido
1. Pulsa `Empezar partido`, anota un gol, una amarilla y un cambio.
2. Activa el modo avión. Anota un gol rival, un córner y una falta.
   - Esperado: la insignia pasa a `Sin conexión · N en cola` (N sube con cada acción); el reloj y los botones siguen igual de rápidos; aparece un aviso «Sin conexión…» pero no se bloquea nada.
3. Sigue anotando 10 minutos. Pulsa `Eventos`: todos los eventos están.
4. Desactiva el modo avión.
   - Esperado: `Sincronizando…` y luego `Guardado · hh:mm` en menos de 1 minuto. En `Partidos` > informe: cada evento aparece UNA vez.

## 2. Matar la app (cierre forzado) con el reloj en marcha
1. Con el reloj en marcha y 3-4 eventos, cierra la app a la fuerza (desliza hacia arriba / cierra la pestaña).
2. Espera 1 minuto y ábrela otra vez en `/anotador/<partido>`.
   - Esperado: pantalla «Recuperamos tu partido guardado en la tablet · hh:mm — ¿Continuar?» con el resumen (eventos, marcador, parte).
3. Pulsa `Continuar`. Esperado: todos los eventos, el once y el marcador; el reloj queda EN PAUSA en el último minuto guardado (pulsa `Reanudar` y corrige con «Ajustar el reloj» si hace falta). En `Revisar` puede salir el aviso «La app estuvo N min en segundo plano».
4. Repite sin red (modo avión antes de abrir). Esperado: igual, la app abre (si falla: ver sección 8).
5. Prueba `Descartar` (mantén pulsado): la pantalla vuelve al acta del servidor. Esperado: aviso «Copia de la tablet descartada» y la copia queda oculta 24 h (soporte puede recuperarla).

## 3. Batería baja / reinicio de la tablet
1. Con eventos sin enviar (modo avión), apaga y enciende la tablet. Vuelve a abrir el partido con red o sin ella.
   - Esperado: recuperación como en la sección 2; no se pierde nada salvo, como mucho, los últimos 5 segundos del reloj.
2. Con el modo ahorro de batería activado, deja la tablet bloqueada 5 minutos con el reloj en marcha y desbloquéala.
   - Esperado: la app sigue; en `Revisar` puede salir el aviso de segundo plano; el minuto puede ir atrasado y se corrige con el ajuste del reloj.

## 4. Caducidad de sesión
1. Con el partido abierto y cobertura, pide a un administrador que cierre tu sesión (o espera a que caduque el token).
   - Esperado: aviso fijo «Sesión caducada · tus datos están a salvo en la tablet», insignia `Sesión caducada`. El partido NO se cierra ni cambia de pantalla; sigues anotando.
2. Pulsa `Iniciar sesión` (en el aviso o en la insignia), entra con tu usuario.
   - Esperado: «Sesión iniciada. Enviando lo pendiente…» y la insignia vuelve a `Guardado`.
3. Repite sin cobertura: el botón explica que ahora no se puede iniciar sesión y que los datos están a salvo.
4. Cierra la app con la sesión caducada y vuelve a abrir `/anotador/<partido>` con datos locales: debe abrirse igualmente (con el aviso de sesión).

## 5. Dos dispositivos
1. Abre el mismo partido en la tablet A y en el móvil B (con red).
2. En A (sin red) anota un gol; en B anota una amarilla. Reconecta A.
   - Esperado: en ambos, tras unos segundos, están los dos eventos (sin duplicados). Si A tenía el partido abierto desde antes, al recargar sale la pregunta de recuperación y `Continuar` fusiona.
3. Borra en B un evento que A también tiene y edítalo en A: gana la acción más reciente; nunca se pierde un dato que se editó después de borrarse.

## 6. Cierre del partido
1. `Revisar` → comprueba los avisos (puedes plantar un error: tres amarillas al mismo jugador). El botón `Enviar y cerrar partido` queda desactivado hasta corregir o pulsar `Está bien`.
2. Con red: `Enviar y cerrar partido`. Esperado: «Cerrado y enviado al servidor ✓».
3. Con modo avión: pulsa `Seguir anotando`, cierra otra vez. Esperado: «Cerrado y guardado en la tablet · Todavía NO está en el servidor · N cambios por enviar». Quita el modo avión: pasa a «Cerrado y enviado al servidor ✓».
4. En `/anotador`: un partido cerrado sin enviar muestra «N cambios sin enviar» y arriba un aviso global.

## 7. Cierre de pestaña con datos sin enviar
Con modo avión y eventos en cola intenta cerrar la pestaña o recargar: el navegador pregunta si quieres salir. Con todo enviado no pregunta.

## 8. Si algo falla
- «No se pudo guardar en la tablet»: espacio lleno o modo privado. Libera espacio, no cierres la página, pulsa `Sincronizar ahora`.
- Abrir sin red da error: el partido no estaba preparado (sección 0) o el navegador borró los datos del sitio.
- Para soporte: en la consola del navegador, `indexedDB` > `kabine-anotador` (stores `journal`, `partidos`, `outbox`, `meta`). No borres datos del sitio.
