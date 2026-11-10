# Investigación de referentes de diseño para Kabin-e

Fecha: 2026-11-10. Método: lectura directa de fuentes (WebFetch/WebSearch). Convención: **[V]** = visto en la fuente citada; **[I]** = inferencia u opinión mía; **[NV]** = no pude verificar. Las URL van junto a cada afirmación.

Aviso de alcance: varios sitios bloquearon o devolvieron 404/403 (Bloomberg UX, Apple newsroom 2024/03, f1.com). Linear Method solo mostró índice. Hay referentes de tu lista que NO pude mirar (ver sección "No verificado").

---

## A. Herramientas de trabajo

### Rauno Freiberg: Web Interface Guidelines (https://interfaces.rauno.me/) [V]
- Hace: lista de reglas concretas y comprobables. Animaciones de interacción ≤ 200 ms; los menús desplegables abren en `mousedown`, no en `click`; actualización optimista local con rollback y feedback junto al disparador (check inline al copiar, no notificación); sin huecos muertos entre ítems de lista adyacentes (se agranda el `padding`); `tabular-nums` en tablas y temporizadores; no cambiar el peso tipográfico en hover/selección (evita saltos de layout); estilos hover solo bajo `@media (hover: hover)`; foco dibujado con `box-shadow` para seguir el radio; ↑/↓ en listas secuenciales y ⌘⌫ para borrar; capas decorativas con `pointer-events: none`.
- Principio: el detalle invisible es cuestión de reglas pequeñas y repetibles, no de estética.
- Kabin-e: convertir esta lista en checklist de PR para el sistema Cal (tabla de plantilla, filas, menús).

### Rauno: "Invisible details of interaction design" (https://rauno.me/craft/interaction-design) [V]
- Hace: acciones ligeras se disparan a mitad de gesto; las destructivas esperan a que se levante el dedo; los gestos responden de inmediato y son interrumpibles; las acciones de teclado frecuentes (menús de comandos, App Switcher de macOS) se sienten mejor SIN animación.
- Principio: la animación depende de la frecuencia y del riesgo de la acción.
- Kabin-e: la paleta de comandos y el cambio de semana por teclado no animan; el arrastre de sesiones en la semana sí responde durante el gesto.

### Emil Kowalski: animación (https://emilkowal.ski/ui/you-dont-need-animations y https://emilkowal.ski/ui/7-practical-animation-tips) [V]
- Hace: "la frecuencia manda": en lo que se usa muchas veces al día, probablemente ninguna animación; no animar acciones iniciadas por teclado; UI < 300 ms (un select de 180 ms se siente más ágil que uno de 400 ms); `ease-out` para entrar y salir, curvas propias porque las integradas "son demasiado débiles"; botón `scale(0.97)` en `:active`; no animar desde `scale(0)`, empezar en ≥ 0.9; tooltip 125 ms con ease-out, y una vez abierto uno, los vecinos abren sin retraso ni animación; `transform-origin` en el punto del disparador.
- Kabin-e: popovers de ficha de jugador con origen en la fila; tooltips con retraso inicial y luego instantáneos.

### Vercel Web Interface Guidelines (https://vercel.com/design/guidelines) [V]
- Hace: objetivo táctil ≥ 24 px (44 px en móvil); spinners/esqueletos con retraso de 150–300 ms y visibles ≥ 300–500 ms para evitar parpadeo; esqueletos con las dimensiones exactas del contenido final; mutaciones POST/PATCH/DELETE < 500 ms; listas grandes con virtualización o `content-visibility: auto`; nunca `transition: all`; animar solo `transform`/`opacity`; `overscroll-behavior: none` en `<html>` con puntero fino; textarea envía con ⌘/Ctrl+Enter; no deshabilitar el botón de envío antes de intentar; sombras de ≥ 2 capas; radio hijo ≤ radio padre; preferir APCA; estados interactivos con más contraste que el reposo; `…` único en menús que abren algo.
- Kabin-e: adoptar casi todo como contrato técnico. La regla "sombras de 2 capas" no aplica a Cal (cero sombras).

### Geist tipografía (https://vercel.com/geist/typography) [V]
- Hace: escala nombrada por función (`heading`, `label`, `copy`, `button`) y no por tamaño suelto; `label` para una línea con interlínea generosa, `copy` para multilínea; variantes `-mono` emparejadas con el tamaño vecino (label-14-mono con texto > 14, label-13-mono junto a label-14); label-13 usa cifras tabulares; 12 solo como "terciario en vistas densas" y botón 12 solo dentro de inputs. [El detalle numérico de tamaños/interlíneas no se mostró en la página.]
- Kabin-e: nombrar los estilos de Cal por rol (`dato`, `etiqueta`, `cuerpo`) y emparejar Martian Mono con el cuerpo vecino en lugar de elegir tamaños a ojo.

### Linear: rediseño de UI (https://linear.app/now/how-we-redesigned-the-linear-ui) [V]
- Hace: tema generado en LCH (perceptualmente uniforme) con tres variables (base, acento, contraste) en lugar de 98; elevación derivada también de LCH; el color de cromo (azul) se restringió para lograr aspecto "neutro y atemporal"; más contraste general; alineación vertical/horizontal de etiquetas, iconos y botones; objetivos declarados: reducir ruido visual, mantener alineación, aumentar jerarquía y densidad de la navegación. Usa Inter Display en titulares y Inter en el resto.
- Principio: pocas variables de tema + espacio de color perceptual.
- Kabin-e: definir Cal como 3 entradas (papel, tinta, cal/acento) + contraste, generando el resto en OKLCH/LCH. Cal ya es monocromático de línea; esto formaliza la generación y el modo oscuro de vídeo.
- Nota: Linear usa Inter. Kabin-e NO debe imitar eso; es una de las pistas de "SaaS genérico" que el dueño rechaza.

### Linear Method (https://linear.app/method) [V parcial]
- Solo pude ver el índice (Craft, "Generate momentum", "Scope projects down", etc.), no el texto. No cito principios de calidad/velocidad de ahí. [NV el contenido de cada sección]

### Stripe: sistemas de color accesibles (https://stripe.com/blog/accessible-color-systems) [V]
- Hace: rechazó HSL por no ser uniforme en luminosidad; usó CIELAB; construyó cada escala con la misma curva de luminosidad para que el contraste sea predecible: "dos colores separados por ≥ 5 niveles garantizan contraste suficiente para texto pequeño; 4 para iconos y texto grande". Su auditoría halló que ningún color de texto por defecto, salvo el negro, cumplía 4,5:1.
- Kabin-e: escala de grises/tinta de 12 pasos con regla "texto = ≥ 5 pasos de diferencia con su fondo". Útil para tablas con cifras secundarias en gris.

### Superhuman: regla de 100 ms (https://blog.superhuman.com/superhuman-is-built-for-speed/) [V]
- Hace: toda interacción < 100 ms (objetivo < 50 ms); atajo para cada acción; Cmd+K con pistas de atajo visibles; base de datos local en la app/navegador sobre las APIs de Gmail/Outlook; precarga y pre-renderiza los hilos más probables; animaciones mínimas "para no gastar tiempo cargándolas".
- Kabin-e: caché local de plantilla, semana actual y partidos; precarga del jugador/sesión siguiente.

### Raycast (https://raycast.com/blog/a-fresh-look-and-feel) [V]
- Hace: principios "rápido, simple, agradable"; barra inferior que unifica acciones contextuales, toasts y título del comando con los atajos visibles ("el panel ⌘K estaba escondido detrás de un botón pequeño y los usuarios nuevos no lo veían"); modo compacto opcional; iconos con reglas compartidas de trazo y radios.
- Kabin-e: barra de acciones inferior con atajos a la vista en cada pantalla de trabajo (sustituye a menús kebab).
- Nota: la cifra "< 50 ms" que circula para Raycast proviene de un sitio no oficial [NV].

### Figma UI3 (https://www.figma.com/blog/our-approach-to-designing-ui3/) [V]
- Hace: revirtió paneles flotantes a paneles fijos tras métricas y feedback (ralentizaban, estrechaban pantallas pequeñas, hacían menos útiles las reglas); "Speed is a feature" y las ralentizaciones se consideran descalificantes; controles inline (blend modes como dropdown inline, "clip content" otra vez checkbox) porque cada clic extra costaba; etiquetas visibles iguales a las del lector de pantalla; despliegue gradual con opción de volver a la UI antigua.
- Kabin-e: paneles fijos (no flotantes) en la ficha de jugador y la pizarra; opt-in/opt-out durante el rediseño (ya lo hacéis: fases en producción opt-in).

### Bloomberg Terminal (densidad) [V parcial vía secundaria]
- Bloomberg UX (https://www.bloomberg.com/ux/...) devolvió 403. La referencia utilizable es el ensayo de Matthew Ström (https://mattstromawn.com/writing/ui-density) [V]: densidad = valor para el usuario ÷ (tiempo × espacio); distingue densidad visual, de información (data-ink de Tufte), de diseño, temporal y de valor. Sobre el Terminal: su "superpoder" real es cargar sin latencia, más que apretar datos; conclusión: reducir latencia entre acciones pesa más que meter más contenido por pantalla.
- Kabin-e: medir densidad como "acciones útiles por segundo", no por píxel. Priorizar latencia antes que reducir interlineado.

### Notion Calendar / Cron [V parcial, fuentes secundarias]
- Solo hallé guías de terceros (p. ej. https://blakecrosley.com/guides/design/notion-calendar) sobre teclado total (flechas, `n` nuevo, `g` ir a fecha, `/` paleta, arrastre con snap de 15 min). Atribución y detalle no oficiales. Úsese como inspiración para la semana de entrenamiento: snap de 15 min y navegación 100 % teclado. [I]

---

## B. Deporte y datos

### Apple Sports (https://www.apple.com/newsroom/2024/02/introducing-apple-sports-a-new-app-for-sports-fans/ y https://daringfireball.net/2024/02/apple_sports) [V]
- Hace: "diseñada para velocidad y simplicidad"; tres pestañas autoexplicativas (Ayer, Hoy, Próximos); solo aparecen ligas en temporada; tocar abre una tarjeta de detalle, deslizar de lado cambia de evento y deslizar hacia abajo cierra; Gruber atribuye la velocidad a no tener ad tech ni código pesado.
- Principio: lista temporal como navegación primaria; detalle como capa descartable.
- Kabin-e: la pantalla "Hoy" como lista cronológica (sesión, partido, vídeo) con detalle en panel lateral que se cierra con Esc o deslizando.
- No pude confirmar premio Apple Design para esta app.

### Fórmula 1: gráficos de retransmisión (https://www.blackbookmotorsport.com/features/dixonbaxi_the_business_behind_formula_ones_broadcast_branding/) [V]
- Hace: rejilla modular bidimensional donde cada cuadrado aloja un dato; más de 300 componentes prefabricados que el director activa; "se enciende cuando se necesita"; diseñados para el peor televisor (pequeño, 4:3, blanco y negro); legibles sin narración.
- Principio: sistema de módulos pre-construidos y rejilla de dato único por celda.
- Kabin-e: refuerza vuestra rejilla de cinco carriles y fichas de dato único; diseñar informes para imprimir en blanco y negro [I].
- La tipografía/color de F1 no aparece en la fuente; las atribuciones de fuentes que vi son poco fiables [NV].

### FotMob / Sofascore / FBref [NV en lo esencial]
- Solo hallé reseñas y listados: FotMob con fama de limpio, Sofascore más denso, FBref orientado al analista, pero sin análisis de diseño verificable. Una crítica de Pratt (https://ixd.prattsi.org/2026/09/design-critique-sofascore-ios-app/) existe y no la leí. Un lanzamiento de terceros afirma que las tablas solo sirven si conoces xG, lo que sugiere glosario inline [I].

### No verificados en absoluto
The Athletic, Opta Analyst, NBA app, Strava, Whoop, Garmin, StatsBomb/Hudl IQ, gráficos Premier/LaLiga/UEFA, Things 3, Amie, Attio, Height, Retool, Mercury, Ramp, Teenage Engineering, Observable Plot, Arc/Dia. No los cito.

---

## C. Identidad editorial / sistemas fuertes

### gov.uk: principios de diseño (https://www.gov.uk/guidance/government-design-principles) [V]
- Hace: 11 principios; relevantes: "Haz el trabajo duro para que sea simple", "Itera, luego itera otra vez", "Es para todos", "Sé consistente, no uniforme" (patrones compartidos como guía, no regla rígida).
- Kabin-e: "consistente, no uniforme" legitima que la pizarra y el vídeo rompan Cal donde la tarea lo exige.
- No pude revisar gov.uk como producto en esta pasada (tipografía, componentes) [NV].

### Estilo suizo/Awwwards/SiteInspire/Godly/Minimal Gallery/Hoverstat.es, señalética [NV]
- No investigué galerías ni sistemas de señalética con fuentes concretas. No hay evidencia en este informe.

---

## Síntesis accionable

### 1. Rendimiento percibido

Umbrales: Nielsen 0,1 s / 1 s / 10 s (https://www.nngroup.com/articles/response-times-3-important-limits/) [V]: < 0,1 s se siente instantáneo y no requiere feedback; > 1 s necesita indicador; > 10 s necesita barra de progreso. INP "bueno" ≤ 200 ms, "pobre" > 500 ms (https://web.dev/articles/inp) [V]. Ström: bajo 100 ms una animación puede hacer sentir la app más lenta (https://mattstromawn.com/writing/ui-density) [V].

| Técnica | Quién | Cómo en Next 14 + SWR |
|---|---|---|
| Optimista con rollback | Rauno (https://interfaces.rauno.me/) | `mutate(key, remoto(), { optimisticData: fn, rollbackOnError: true, populateCache: (res, cur) => ..., revalidate: false })` o `useSWRMutation` (ojo: `populateCache` por defecto es `false` ahí) (https://swr.vercel.app/docs/mutation) [V] |
| Precarga al pasar el puntero | Superhuman precarga hilos probables (https://blog.superhuman.com/superhuman-is-built-for-speed/) | SWR `preload(key, fetcher)` en `onMouseEnter`/`onFocus`/`onTouchStart` de la fila (https://swr.vercel.app/docs/prefetching; la doc usa un `onHover` inexistente, es `onMouseEnter`) [V] |
| Precarga de ruta | Next `<Link>` prefetch al entrar en viewport, solo en producción; rutas dinámicas prefetchean hasta el `loading.js` más cercano (https://nextjs.org/docs/app/api-reference/components/link) [V; doc de Next 16, comportamiento en 14 puede diferir, NV] |
| Datos locales primero | Superhuman | `SWRConfig` con provider de caché persistido en IndexedDB/localStorage + `fallbackData`; inferencia mía, la doc de SWR no lo describe como patrón local-first [I] |
| Prefetch de servidor | SWR en RSC | `preload` en el Server Component + `<SWRConfig value={{ cacheData }}>`; marcado experimental y requiere SWR ≥ 2.5.0-beta.1 (https://swr.vercel.app/docs/with-nextjs) [V] |
| Esqueletos con forma real | Vercel exige dimensiones exactas (https://vercel.com/design/guidelines) | NN/g: esqueleto para cargas de página < 10 s; no esqueletos de solo marco (https://www.nngroup.com/articles/skeleton-screens/) [V] |
| Evitar spinners | NN/g: spinner solo para un módulo de 2–10 s; < 1 s sin indicador | Retraso de 150–300 ms y mínimo visible 300–500 ms (Vercel) [V] |
| `content-visibility` | Vercel, MDN | `content-visibility: auto; contain-intrinsic-size: auto 48px` en cada fila/sección larga; baseline desde sept. 2024; sin `contain-intrinsic-size` el scroll salta (https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility) [V] |
| Virtualización | Vercel: virtualizar o `content-visibility` | Para listas realmente grandes; una plantilla de ~30 filas no la necesita [I] |
| Teclado y paleta | Superhuman, Raycast | Cmd+K + atajo visible en cada acción; barra inferior con atajos (Raycast) [V] |
| View Transitions | Chrome/Next | Ver abajo |

View Transitions: la guía de Next (https://nextjs.org/docs/app/guides/view-transitions) describe `<ViewTransition>` de React 19.3 sin configuración y `transitionTypes` en `<Link>` desde Next 16.2 (https://nextjs.org/docs/app/api-reference/components/link) [V]. Kabin-e está en Next 14, así que NO aplica directamente [I]. El flag `experimental.viewTransition` existe en docs de Next 15 como no recomendado para producción; la versión canary exacta no la confirmé [NV]. Las transiciones cross-document con `@view-transition { navigation: auto; }` funcionan solo entre páginas del mismo origen con navegación de documento completo, en Chrome 126 y Safari 18.2, y no en Firefox (https://developer.chrome.com/docs/web-platform/view-transitions/cross-document) [V]. Next App Router navega como SPA, por lo que esa vía no sirve tal cual [I]. Recomendación: no adoptar view transitions hasta subir de versión; la guía de Next sugiere que la morfología solo ocurre si el destino renderiza en el mismo commit (páginas prefetcheadas) [V], lo que depende de lo anterior.

Regla de la guía de Next para transiciones: salida 150 ms, entrada 210 ms, movimiento 400 ms; desplazamiento 60 px; cabecera anclada sin animar; `::view-transition { pointer-events: none }` [V]. Esas cifras (400 ms) superan la regla de ≤ 200–300 ms de Rauno/Emil, así que en una herramienta de trabajo yo usaría solo las de 150 ms [I].

### 2. Densidad y tablas

- Alturas de fila de referencia: IBM Carbon define 24 / 32 / 40 / 48 / 64 px (xs/sm/md/lg/xl), cabecera con la misma altura que la fila, relleno de columna de 16 px, casilla de selección de 20 px con 16 px de padding, barra de acciones por lotes con la altura de la fila (https://carbondesignsystem.com/components/data-table/style/) [V].
- Objetivo mínimo 24×24 px (WCAG 2.2 SC 2.5.8, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) [V]; Vercel: 24 px escritorio, 44 px móvil [V].
- Cifras: `font-variant-numeric: tabular-nums` (y `slashed-zero` si hay O/0) (https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric) [V]. Alinear a la derecha las columnas numéricas es práctica habitual, pero Carbon no lo establece [NV]; opinión mía [I].
- Sin huecos muertos entre filas clicables: ampliar `padding`, no `gap` (Rauno) [V].
- No cambiar `font-weight` en hover/seleccionado (Rauno) [V]; marcar selección con fondo + borde.
- Atajos de lista: ↑/↓ para moverse y ⌘⌫ para borrar (Rauno) [V].
- Sugerencia de números para Kabin-e [I]: fila de trabajo 32 px (tabla de plantilla), 40 px en pantallas táctiles de campo, 24 px solo en modo compacto; tipo de dato 13 px mono; etiqueta 12 px en mayúsculas pequeñas solo si el contraste lo aguanta.
- Edición en línea y selección múltiple: no encontré fuente primaria con números; patrón de Carbon (barra de acciones por lotes) es la única evidencia [V].

### 3. Tipografía y color

- Escala por función y no por tamaños sueltos (Geist) [V].
- Mono emparejado con el tamaño vecino, cifras tabulares en etiquetas numéricas (Geist) [V].
- Inputs ≥ 16 px en móvil para evitar el zoom de iOS (Rauno, Vercel) [V].
- Titulares fluidos con `clamp()` (Rauno: `clamp(48px, 5vw, 72px)`) [V]; en herramienta de trabajo casi no hay titulares grandes [I].
- Color en espacio perceptual (LCH de Linear, Lab de Stripe) con escala de contraste predecible; regla "≥ 5 pasos = contraste de texto" [V].
- Color con función, no decorativo: nombrar los tokens por lo que hacen (fuente: https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c) [V, opinión de un autor].
- Estados interactivos con más contraste que el reposo (Vercel) [V]; APCA preferible a WCAG 2 (Vercel) [V]; `color-scheme: dark` en `<html>` oscuro (Vercel) [V].
- Variable de ancho 75–125 de Encode Sans: no hallé referente que la use como regla; usarla para comprimir columnas estrechas en tabla y ensanchar titulares es hipótesis [I].

### 4. Movimiento

| Qué | Regla | Fuente |
|---|---|---|
| No animar | Acciones de teclado, menús de comandos, hover de botones triviales, añadir/borrar ítems de lista frecuentes, menú contextual (solo salida si acaso) | https://interfaces.rauno.me/ ; https://emilkowal.ski/ui/you-dont-need-animations [V] |
| Animar | Lo que aparece de golpe (toasts), diálogos, cambios de espacio, feedback de pulsación | Emil [V] |
| Duración | Interacción ≤ 200 ms (Rauno); UI < 300 ms (Emil); 180 ms mejor que 400 ms | [V] |
| Curva | `ease-out` al entrar/salir (MDN: `ease-out = cubic-bezier(0, 0, 0.58, 1)`); Emil prefiere curvas propias más fuertes; no recomienda las integradas | https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function [V] |
| Escala | Diálogo desde ≈ 0,8–0,9 (no 0); botón `0.97` (Emil) o 0,96 (Rauno) | [V] |
| Tooltip | Retraso inicial; vecinos sin retraso ni animación | Emil, Vercel [V] |
| Cambio de tema | Sin transiciones | Rauno [V] |
| Propiedades | Solo `transform`/`opacity`, nunca `transition: all` | Vercel [V] |
| Reduced motion | `@media (prefers-reduced-motion)` | MDN, Next guide [V] |

### 5. Señales de "hecho con IA" y alternativa

Fuentes: https://world.hey.com/kostac/spot-the-slop-a-ui-designer-s-guide-to-fixing-ai-defaults-4c448c9c y https://capitalandcompute.net/blog/fix-ai-slop-design/. Son opiniones de profesionales; el buscador no halló estudios cuantitativos [V].

| Señal | Alternativa |
|---|---|
| Inter/Roboto/sistema como única fuente | Familia elegida con escala (ya: Encode Sans + Martian Mono) |
| Degradado púrpura-azul, texto con degradado | Color con rol; paleta de 4–6 colores con función |
| Héroe centrado + insignia en píldora + tres tarjetas | Empezar por lo más característico del producto (la semana) |
| `rounded-2xl` + misma sombra suave en todo, tarjetas anidadas | Filas/tablas para datos tabulares (ya: Cal) |
| `backdrop-blur`/brillos gratuitos | Eliminar |
| Mismo fade-slide en cada sección, rebotes, contadores animados | Animar solo en respuesta a una acción del usuario |
| Textos de relleno ("Elevate your workflow"), métricas inventadas | Nombrar lo que hace el botón; borrar cifras sin fuente |
| Todo con el mismo padding/radio/alto de tarjeta | Jerarquía deliberada |
| Solo el estado feliz | Diseñar estados vacío, carga y error |
| Etiquetas en mayúsculas espaciadas sobre cada título, "01/02/03" sin secuencia, flecha en cada enlace, mono para etiquetas pequeñas | Quitarlas si no aportan |
| Contrarreacción de segunda ola: crema + serif + terracota; negro + un acento neón; "cosplay de periódico" con filetes finos y radio 0 sobre contenido no editorial | No cambiar de cliché; partir del dominio |

Atención: tres de esas señales de segunda ola (filete fino, radio casi nulo, mono en etiquetas) coinciden con Cal. [I] La defensa es que en Cal tienen función (la cal del campo, la rejilla de cinco carriles) y la fuente lo dice así: "cosplay" es aplicarlo a contenido que no es editorial. Hay que justificar cada uso con el dominio y no usar mono en etiquetas decorativas.

### 6. Las 15 decisiones, por impacto

Estado: **Cal** = ya cubierto; **Nueva** = a incorporar. Cuando el referente es parcial lo digo.

1. **Presupuesto de 100 ms por interacción, con caché local de semana/plantilla/partidos** — Nueva. Superhuman (https://blog.superhuman.com/superhuman-is-built-for-speed/); Ström: la latencia pesa más que apretar datos (https://mattstromawn.com/writing/ui-density).
2. **Mutaciones optimistas con rollback y feedback junto al disparador** — Nueva. SWR (https://swr.vercel.app/docs/mutation); Rauno (https://interfaces.rauno.me/).
3. **Precarga con `preload` de SWR en hover/foco/touch + `<Link>` prefetch** — Nueva. https://swr.vercel.app/docs/prefetching ; https://nextjs.org/docs/app/api-reference/components/link.
4. **Paleta de comandos + atajo en cada acción + barra inferior de acciones con atajos visibles** — Nueva. Superhuman; Raycast (https://raycast.com/blog/a-fresh-look-and-feel).
5. **Sin animación en acciones de teclado y frecuentes; resto ≤ 200 ms, ease-out** — Nueva (Cal no declara reglas de movimiento). Emil (https://emilkowal.ski/ui/you-dont-need-animations); Rauno.
6. **Esqueletos con dimensiones exactas, con retraso de 150–300 ms y mínimo 300–500 ms; nada de spinners en < 1 s** — Nueva. Vercel (https://vercel.com/design/guidelines); NN/g (https://www.nngroup.com/articles/skeleton-screens/).
7. **Tablas: fila 32 px de trabajo, cabecera igual, cifras `tabular-nums`, sin hueco muerto, selección sin cambio de peso** — Parcial en Cal (tablas sí; números no definidos). Carbon (https://carbondesignsystem.com/components/data-table/style/); Rauno.
8. **`content-visibility: auto` + `contain-intrinsic-size` en listas largas** — Nueva. MDN (https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility); Vercel.
9. **Color generado en espacio perceptual con 3 entradas + regla de ≥ 5 pasos para texto** — Parcial en Cal (paleta sí; regla de contraste no). Linear (https://linear.app/now/how-we-redesigned-the-linear-ui); Stripe (https://stripe.com/blog/accessible-color-systems).
10. **Escala tipográfica por rol (dato/etiqueta/cuerpo/botón) con mono emparejado** — Parcial en Cal (fuentes sí). Geist (https://vercel.com/geist/typography).
11. **Paneles fijos en vez de flotantes; controles inline en lugar de menús escondidos** — Nueva. Figma UI3 (https://www.figma.com/blog/our-approach-to-designing-ui3/).
12. **Lista temporal "Hoy" + detalle descartable por Esc/deslizar** — Nueva. Apple Sports (https://daringfireball.net/2024/02/apple_sports).
13. **Rejilla modular de dato único por celda, componentes prefabricados, legible en blanco y negro** — Cal (rejilla de cinco carriles); la parte "blanco y negro" es nueva. F1/DixonBaxi (https://www.blackbookmotorsport.com/features/dixonbaxi_the_business_behind_formula_ones_broadcast_branding/).
14. **Contrato de accesibilidad e interacción: objetivos ≥ 24 px (44 móvil), foco con `box-shadow`/anillo propio, hover solo con `@media (hover: hover)`, `prefers-reduced-motion`** — Nueva. Vercel; Rauno; WCAG 2.2 (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
15. **"Consistente, no uniforme": pizarra y vídeo pueden romper Cal por tarea; y checklist anti-"IA" en cada PR** — Nueva. gov.uk (https://www.gov.uk/guidance/government-design-principles); señales de IA (https://capitalandcompute.net/blog/fix-ai-slop-design/).

Ya cubiertas por Cal: línea única de 1,5 px, esquinas vivas, tablas en vez de tarjetas, fichas redondas solo para personas, sin sombras ni degradados, claro/oscuro por tarea, Encode Sans + Martian Mono. De los referentes visibles, ninguno defiende explícitamente "sin sombras ni esquinas redondas"; Vercel pide sombras de ≥ 2 capas y radio concéntrico, y Figma/Linear/Raycast son redondeados. Es identidad vuestra, no respaldada por la investigación [I].

---

## No verificado (resumen)
- Linear Method (solo índice), Bloomberg UX (403), nota de prensa Apple Sports de marzo 2024 (404; usé la de febrero), f1.com (redirección).
- Cifra "< 50 ms" de Raycast; premio de diseño de Apple Sports; fuentes tipográficas de F1.
- Todo lo marcado como no investigado en la sección B/C (The Athletic, Opta, NBA, Strava, Whoop, Garmin, StatsBomb/Hudl, Things, Attio, Mercury, Ramp, Teenage Engineering, Observable, Arc/Dia, Awwwards/SiteInspire/Godly/Hoverstat.es, señalética).
- Comportamiento exacto de `Link` prefetch y `experimental.viewTransition` en Next 14 (las docs consultadas son de Next 15/16).
- Fuentes numéricas de edición en línea y alineación de cifras: no hay fuente primaria en este informe.
