# Investigación de mercado de interfaz — Kabin-e

Fecha: 2026-11-10. Alcance: solo lectura web (WebSearch/WebFetch).

## 0. Limitaciones (leer primero)

- **WebFetch devuelve texto, no imágenes.** No pude ver capturas ni vídeos. Lo que sigue es lo que las páginas oficiales, manuales, centros de ayuda y fichas de App Store DICEN de la interfaz, no lo que vi pintado. Cuando una afirmación sobre aspecto (color, densidad, tipografía, modo oscuro) no figura en ninguna fuente, lo marco como **[sin evidencia]**.
- Marcas: **[V]** = descrito en la fuente citada. **[I]** = inferencia mía, no verificada. **[M]** = solo marketing, sin descripción de pantalla.
- Varios resultados vienen de resúmenes de búsqueda; cuando solo tengo el resumen del buscador y no abrí la página, lo indico.
- En las secciones (8) densidad/tipografía/color/modo oscuro/tableta: **no hay evidencia verificable para casi ningún producto**. Para decidir eso hace falta abrir las demos a mano (ver sección 6, "Pendiente").

## 1. Productos de vídeo y análisis

### Hudl Sportscode
- Visto: solo índices del manual (no contenido de las páginas).
  - https://www.hudl.com/support/manuals/sportscode/code/code-window
  - https://www.hudl.com/support/manuals/sportscode/code/modes-of-the-code-window
  - https://www.hudl.com/support/manuals/sportscode/code/the-timeline
- (6) Vídeo [V, solo estructura]: la ventana de código tiene tipos de botón (Code, Label, Inactive, Action) y 5 modos (Capture, Code, Label, Report, Edit). La línea de tiempo tiene "Components", "Toolbar", "Code Rows", "Combining/Merging Timelines". Blog: las instancias solapadas se muestran solapadas; se pueden añadir notas a una instancia mientras se codifica; timeline compartida en vivo solo en licencia Elite (resultado de búsqueda: https://www.hudl.com/blog/hudl-sportscode-update-august-2020).
- (1)(2)(3)(4)(5)(7)(8): no aplica o sin evidencia.
- Adoptar: separar explícitamente modos (capturar / revisar / editar) en la UI de vídeo [I a partir de los 5 modos]. Notas rápidas sobre un corte mientras se etiqueta [V, blog].
- Evitar: [I] una ventana con 5 modos y 4 tipos de botón es curva de aprendizaje alta; no replicar la complejidad.

### Hudl Wyscout (y Hudl StatsBomb)
- Visto: guía de plataforma (texto): https://www.hudl.com/support/wyscout/guides/platform ; blogs Hudl sobre perfil de jugador/playlists (resumen de búsqueda): https://www.hudl.com/blog/video-stats-manage-player-portfolio-with-wyscout ; StatsBomb: https://www.hudl.com/products/statsbomb/platform
- (2)(3) [V]: Overview por país > competición > equipo > jugador. Equipo: lista de jugadores agrupados por posición, partidos, eventos con vídeo, stats filtrables, informes, "My Playlists", "My Clips". Jugador: partidos completos, eventos clave, stats, carrera, traspasos, informes, playlists/clips.
- (6) [V]: clic en pases (o selección múltiple) abre el reproductor con esos eventos; playlists guardables, compartibles en carpeta de grupo (resumen de búsqueda). App móvil con reproductor dibujable [V, resumen de búsqueda].
- (7) [V]: informes PDF de partido y temporada con vista rápida (resumen búsqueda).
- StatsBomb [V]: "Pitch vis & table" (campo + tabla), tablas con pestañas Ataque/Defensa/Pase/Portería, filtros laterales (edad, minutos, temporada), radares con métricas elegibles, plantillas guardadas reutilizables, evidencia en vídeo junto al dato. Fuente: página StatsBomb arriba.
- Adoptar: dato → clic → clip (cualquier número lleva a su vídeo); jerarquía equipo > jugador con pestañas fijas; plantillas guardadas de tablas/filtros.
- Evitar: [I] navegación por país/competición no aplica a un cuerpo técnico de un solo club.
- (8) [sin evidencia].

### Catapult (Pro Video/Focus, Vector, OpenField)
- Visto: https://www.catapult.com/solutions/pro-video (texto, [M]); ficha App Store Vector https://apps.apple.com/app/vector/id1458042156 (sin descripción de capturas); resumen de búsqueda sobre Vector Live.
- (6) [V]: captura multi-ángulo sincronizada y streaming; datos de rendimiento integrados con vídeo; plantillas con lógica para captura automática; "workbook views" con filtros preestablecidos; vista 2D de campo; presentaciones con anotación; permisos por usuario/grupo; colaboración remota. Módulos FOCUS, MatchTracker, HUB, Presentations. La página no menciona línea de tiempo ni listas de cortes.
- Vector (App Store) [V]: periodizar una actividad, objetivos grupales e individuales, estado de dispositivos (batería), grupos de atletas para filtrar por posición/grupo/estado (resumen búsqueda: Vector Live 2.0).
- (1)(3)(5): no encontré evidencia de calendario/microciclo ni ficha en OpenField.
- Adoptar: filtros por grupo (posición / grupo de entreno / estado) persistentes en todas las listas [V, Vector Live]; vistas guardadas con filtros preestablecidos [V].
- Evitar: [I] separar producto de vídeo, datos y app en 4-5 módulos con nombre propio genera fricción; mantener una sola superficie.

### Nacsport (vía AnalysisPro / Tag&view / Hub)
- Visto: https://www.nacsport.com/en/ ([M]); base de conocimiento https://support.analysispro.com/kb/article/7/timeline ; resúmenes de búsqueda sobre Tag&view y Hub.
- (6) [V]: línea de tiempo con todos los clips; clic reproduce; selección múltiple con Ctrl y asignar descriptor a todos; "Anchor Clips" desplaza toda la línea para resincronizar; botón derecho abre plantilla de botones; búsqueda por categorías/descriptores; búsqueda guardada (solo Elite); duraciones exportables a XLS. Listas de presentación: enviar el clip a una lista con la tecla "3" (resumen búsqueda). Hub: máximo 24 botones, tabla jugada-a-jugada bajo el reproductor, permisos ver/editar.
- Tag&view (iPad) [V, resumen búsqueda]: construir plantilla de botones, etiquetar en vivo, revisar etiquetas durante la captura, exportar XML.
- Adoptar: etiquetar con teclas y en tableta con una plantilla de botones propia del club; "enviar a lista" con un gesto.
- Evitar: funciones críticas (búsquedas guardadas) detrás de licencia premium [V]; [I] en Kabin-e eso frustraría a un cuerpo técnico pequeño.

### Once Sport / Once Video Analyser
- Visto: blog oficial https://once.sport/blog/tagging-match-events/ y https://once.sport/blog/once-sport-update-field-mapping-timeline-markers/ (texto detallado).
- (6) [V]: botones de código de colores a la derecha de la pantalla de análisis; botones normales con desfase -/+ (límite 20 s); botones de "modo grabación"; barra espaciadora marca el inicio y abre panel con buscador de acciones, buscador de jugadores, filtros Bueno/Malo/Favorito y nota; barra "grabando ahora"; Enter detiene todo. La línea de tiempo oculta los botones y lista todas las acciones; menú contextual: filtros, añadir/reemplazar jugador, reemplazar acción, nota, reproducir, dibujar, editar duración, renombrar, borrar. Marcadores en la línea de tiempo cada vez que hay una etiqueta o dibujo; clic salta al momento. "Field Mapping" mide distancias estáticas en el campo (ancho de línea defensiva). Etiquetado multi-jugador (resumen búsqueda). Atajos de teclado asignables.
- Adoptar: filtros Bueno/Malo/Favorito como segundo eje rápido de etiquetado; marcadores en la línea de tiempo; menú contextual completo sobre cada corte.
- Evitar: [I] alternar entre "ver botones" y "ver timeline" (se ocultan mutuamente) obliga a cambiar de contexto.

### Metrica Sports (Play/PlayBase, Nexus)
- Visto: https://www.metrica-sports.com/ ([M]); la URL de producto Play dio 404.
- [V]: PlayBase para amateur/semiprofesional, Nexus para élite; eventing en vivo o postpartido, telestración sobre cualquier vídeo, seguimiento automático de jugadores/campo, listas y presentaciones. Sin descripción de pantallas.
- Solo marketing. Sin ideas adoptables verificables. **No pude ver producto.**

### LongoMatch
- Visto: resumen de búsqueda de https://support.longomatch.com/ ; página de ayuda https://support.longomatch.com/en/support/solutions/articles/103000353341-how-do-i-set-up-a-custom-dashboard-for-my-sport- (texto). longomatch.com directo: ECONNREFUSED.
- (6) [V]: dashboard con 5 tipos de botón (Categorías, Tags, Resultado, Timer, Tarjeta); los Tags no crean corte, añaden información filtrable; etiquetado automático (X s antes/después) o manual (dos clics inicio/fin); edición directa de eventos desde la línea de tiempo; playlists filtrables por tipo de evento o jugador, exportables a vídeo; proyectos en vivo.
- Adoptar: distinguir "corte" (con duración) de "etiqueta" (metadato); botón Timer para posesiones/transiciones.
- Evitar: [I] límites artificiales en tier gratuito (1 dashboard, 50 eventos) ya señalan fricción.

## 2. Gestión de plantilla, carga y estado médico

### Kitman Labs
- Visto: https://www.kitmanlabs.com/platform/performance-medicine/ (texto); resumen de búsqueda de otras páginas. [M] sobre todo; la página dice explícitamente que no describe layouts ni colores.
- (2)(3) [V]: "Daily Player Status" con indicadores configurables (recuperación, bienestar, disponibilidad) para ver la preparación de un vistazo; exportación de informe diario seguro para staff no médico que resume preparación y restricciones protegiendo datos sensibles; ficha longitudinal con estado médico actual, historial de lesiones, evaluaciones, alertas, diagnósticos y planes de cuidado en un espacio personalizable; calendario médico compartido; screening del atleta (bienestar, dolor) por app o kiosco antes de la actividad; app de entrenador con estado y alertas.
- (1) [V, resumen de búsqueda, afirmación de la propia empresa]: la planificación de sesiones se sincroniza con disponibilidad y carga de partido. No confirmado.
- Adoptar: el informe diario de estado que oculta detalle clínico para quien no es médico (privacidad por rol) [V]; screening previo a la sesión.
- Evitar: [I] modelo de dashboards configurables a medida sin un punto de partida claro; el sector enterprise exige configurar demasiado.

### Teamworks / Smartabase
- Visto: https://teamworks.com/ams/ (texto); resumen de búsqueda sobre calendario de Smartabase (https://learn.fusionsport.com/...). Páginas de producto smartabase.com redirigen a teamworks.com/ams/.
- [V]: constructor de dashboards con vistas por permisos; formularios digitales configurables y subida masiva; alertas y flujos automatizados; app unificada staff + atleta; la app del atleta tiene vista de calendario con historial y dashboard personal (resumen búsqueda). Un artículo de ayuda antiguo de Fusionsport dice que el calendario muestra un solo atleta a la vez y no marca solapamientos (resumen de búsqueda; puede no aplicar a la versión actual).
- La página AMS no describe calendario ni pantalla de disponibilidad.
- Adoptar: formularios de entrada rápidos para el jugador antes del entreno.
- Evitar: calendario de un solo atleta sin detección de choques [V, versión antigua]; [I] plataforma configurable que exige un administrador dedicado.

### XPS Network (Sideline Sports)
- Visto: https://sidelinesports.com/ ([M], texto). xpsnetwork.com redirige aquí.
- [V]: "Plan all team and individual training", diagramas y animaciones en "Playbook", monitorización de preparación/bienestar/carga, app móvil. La página NO describe calendario, perfil, informes ni disponibilidad.
- Solo marketing; sin pantallas visibles.

### SoccerLAB
- Visto: https://www.soccerlab.com/ (texto). **Atribución no verificada**: el texto corresponde a una suite de gestión de club (planificación semanal/mensual/anual, sesiones con ejercicios/objetivos/dibujos, módulo Médico con estados de jugador y diario médico, informes de asistencia/disponibilidad, dashboards Power BI, calendario de operaciones con reservas de instalaciones). No confirmé que sea el producto que tenéis en mente.
- La página menciona capturas (analítica, codificación de vídeo, apps, calendario de operaciones) pero no las describe.
- Adoptar [V de la página]: motivos de ausencia analizables; informes filtrables por temporada/equipo/partido/posición/jugador.

### PlayerData
- Visto: https://www.playerdata.com/ (texto, [M]).
- [V]: métricas distancia, velocidad máxima, sprints, aceleraciones, carga; datos a la nube por celular/wifi; asistente de IA "CoachMate" que responde en lenguaje llano; datos en vivo opcionales.
- Pantallas no descritas. Idea: pregunta en lenguaje natural sobre los datos [V, marketing]; úsese con cautela.

### Sportlyzer
- Visto: https://www.sportlyzer.com/ (texto, [M]).
- (1)(2)(3)(7) [V]: planes de temporada con ciclos y proyección de volumen, planificación por día/semana; calendario compartible; RSVP y asistencia marcada tras la sesión; evaluaciones y resultados de tests; historial de entrenamiento automático para juveniles; boletines para padres.
- Adoptar: asistencia marcada al cerrar la sesión, alimentando historial automático.

## 3. Gama base (equipos y clubes)

### TeamSnap
- Visto: https://www.teamsnap.com/teams/features (texto; menciona capturas sin describirlas).
- [V]: calendario de temporada, notificación automática de cambios; disponibilidad con tres estados (asiste / no asiste / sin responder) antes del partido (en plan Premium); alineaciones (en TeamSnap Classic, sin detalle).
- Convención útil: los tres estados de disponibilidad. Evitar: [V] disponibilidad detrás de plan de pago.

### Spond
- Visto: https://help.spond.com/en/articles/25743-overview-availability-requests ; https://www.spond.com/news-and-blog/introducing-the-new-spond-line-up-feature/ ; https://www.spond.com/en-us/ (texto).
- (5) [V]: solicitud de disponibilidad previa a crear el evento; al crear el evento los miembros se agrupan en **Disponible / Sin respuesta / Rechazó / Otros**; el admin puede forzar manualmente el RSVP para reflejar la asistencia real (resumen búsqueda); evento con máximo de participantes y lista de espera. Alineación: formaciones predefinidas (a medida "en una futura actualización"), el entrenador elige jugador por posición "con pocos toques", la alineación se envía en la app con cambios de último minuto notificados, y funciona con la disponibilidad existente. No describe arrastrar y soltar ni suplentes.
- Adoptar: agrupación Disponible/Sin respuesta/Rechazó al elegir convocados; override manual del entrenador.
- Evitar: formaciones fijas sin edición [V, versión inicial].

### 360Player
- Visto: https://www.360player.com/ (texto, [M]).
- [V]: programación de temporada; biblioteca única de ejercicios, entrenamientos y planes de sesión (buscable, compartible); constructor visual de ejercicios con animación y 612 ejercicios iniciales para 5 deportes; perfiles individuales de jugador; asistencia, actividad y carga registradas automáticamente. No menciona modo oscuro ni disponibilidad.

## 4. Diseñadores de sesión y pizarra

### TacticalPad
- Visto: https://www.tacticalpad.com/ (texto, [M]).
- [V]: app para iPad/iPhone (iOS 15+) y Android 7.1+; "Session Planning", animaciones 2D/3D, "Drills & Tactics", nube tp.zone con biblioteca pública de ejercicios y plantillas de plantel. No describe herramientas de dibujo, plantillas ni exportación a PDF.

### Coachbetter
- Visto: https://www.coachbetter.com/ (texto).
- [V]: planificador de sesiones con plantillas reutilizables, gestión de partido, seguimiento de desarrollo; más de 1.000 ejercicios; los clubes publican sus propios ejercicios con su marca; ejemplo "First Touch in the Square", U6–U10, 6–24 jugadores, 20 minutos (ficha de ejercicio con edad, número de jugadores y duración); pantalla de teléfono con vídeo de ejercicio. No dice nada de tableta ni PDF.
- Adoptar: metadatos fijos en cada tarea (edad, nº de jugadores, duración) y publicar la biblioteca del club.

### Planet Training
- Intenté planettraining.com: no resuelve. Resumen de búsqueda sobre planet.training: web-app, creador de ejercicios "disponible en cualquier dispositivo", nube privada por equipo (testimonio del vendedor, [M]). **No vi producto.**

### Otros relevantes (solo resultados de búsqueda; no los abrí)
- i-Drills Football, easy2coach (sesión estructurada en calentamiento / parte principal / vuelta a la calma), Tactics Manager, YouCoach, Total Sessions, Touchline Studio aparecen como alternativas. Detalle: resumen de búsqueda únicamente, sin verificación.

### Coach Logic
- coachlogic.com está parqueado (se vende en GoDaddy). **No pude evaluar el producto.**

### SkillCorner
- La URL de producto probada devolvió 404. **No pude abrir ninguna pantalla** en esta sesión.

## 5. Síntesis

### 5.1 Patrones de interacción más valiosos (13)

| # | Patrón | Mejor ejemplo | Evidencia |
|---|--------|---------------|-----------|
| 1 | Dato → clic → vídeo (todo número abre sus cortes) | Wyscout/StatsBomb | https://www.hudl.com/products/statsbomb/platform |
| 2 | Estado de jugador de un vistazo con indicadores configurables | Kitman (Daily Player Status) | https://www.kitmanlabs.com/platform/performance-medicine/ |
| 3 | Informe de estado diario sin detalle clínico para no médicos | Kitman | misma URL |
| 4 | Agrupar convocables en Disponible / Sin respuesta / Rechazó, con override del entrenador | Spond | https://help.spond.com/en/articles/25743-overview-availability-requests |
| 5 | Alineación en pocos toques sobre formación predefinida, enviada con aviso de cambios | Spond | https://www.spond.com/news-and-blog/introducing-the-new-spond-line-up-feature/ |
| 6 | Plantilla de botones propia del club para etiquetar, con teclas y desfase -/+ | Once | https://once.sport/blog/tagging-match-events/ |
| 7 | Marcadores en línea de tiempo y salto al momento | Once | https://once.sport/blog/once-sport-update-field-mapping-timeline-markers/ |
| 8 | Corte (con duración) vs etiqueta (metadato filtrable) | LongoMatch | https://support.longomatch.com/en/support/solutions/articles/103000353341-how-do-i-set-up-a-custom-dashboard-for-my-sport- |
| 9 | Enviar un clip a una lista con un gesto (tecla), listas por tema/jugador | Nacsport | https://support.analysispro.com/kb/article/7/timeline (y resumen de búsqueda) |
| 10 | Menú contextual completo sobre el corte (jugador, nota, dibujar, duración) | Once | https://once.sport/blog/tagging-match-events/ |
| 11 | Filtros por grupo (posición/grupo/estado) en todas las listas | Catapult Vector Live | https://apps.apple.com/app/vector/id1458042156 (y resumen de búsqueda) |
| 12 | Ficha de ejercicio con metadatos (edad, nº jugadores, duración) y biblioteca del club | Coachbetter / 360Player | https://www.coachbetter.com/ ; https://www.360player.com/ |
| 13 | Plantillas/vistas guardadas de tablas y filtros | StatsBomb / Catapult workbooks | https://www.hudl.com/products/statsbomb/platform ; https://www.catapult.com/solutions/pro-video |

### 5.2 Convenciones que el entrenador ya espera (no romperlas)
Todo [I] salvo donde se cita; deducido de que aparecen en todo el sector:
- Disponibilidad en tres estados (sí / no / sin respuesta): TeamSnap y Spond lo usan [V].
- Ejercicios organizados por tipo de sesión con edad, jugadores, duración [V Coachbetter] y sesión en bloques (easy2coach, resumen búsqueda).
- Jugadores agrupados por posición en la plantilla [V Wyscout].
- Botones de código y teclas de atajo como forma de etiquetar [V Once, Nacsport, Sportscode].
- Reproductor con dibujo sobre vídeo [V Wyscout app, Metrica, Nacsport KlipDraw].
- Exportar a PDF informes [V Wyscout] y a XML/XLS el vídeo [V Nacsport, Tag&view].
- Formación predefinida como punto de partida de la alineación [V Spond].

### 5.3 Donde TODO el sector es flojo (oportunidad)
Estos puntos son [I]: ausencia de evidencia en las fuentes revisadas, no prueba de que no exista.
1. **Microciclo/semana como pantalla central**: ningún producto describe una vista semanal visible que combine sesiones, carga y disponibilidad. Kitman lo afirma en marketing, sin pantalla; Sportlyzer habla de plan por día/semana sin detalle.
2. **Conexión plantilla ↔ sesión ↔ partido**: en las páginas, estado médico, calendario, alineación y vídeo viven en módulos separados.
3. **Evidencia de uso al sol / tableta**: ninguna fuente menciona contraste, modo claro de alto contraste, objetivos táctiles grandes ni tableta como diseño primario (TacticalPad solo lista plataformas). **[sin evidencia]**.
4. **Modo oscuro**: ninguna fuente lo menciona. **[sin evidencia]**.
5. **Informe del rival con vídeo + PDF en un flujo**: Wyscout tiene PDF y vídeo, pero separados.
6. **Privacidad por rol del estado médico**: solo Kitman lo describe y es gama enterprise.
7. **Licencia por funciones críticas** (búsquedas guardadas, disponibilidad) detrás de planes caros [V TeamSnap, Nacsport, LongoMatch].

### 5.4 Tabla final: patrón → dónde aplicarlo en Kabin-e

| Patrón | Hoy | Plantilla | Ficha jugador | Sesiones | Partidos | Vídeo | Pizarra | Informes |
|--------|-----|-----------|---------------|----------|----------|-------|---------|----------|
| Estado de un vistazo (indicador configurable) | Resumen de bajas y dudas | Columna de estado en cada fila | Cabecera con estado actual | Aviso si un convocado está en duda | Marca en convocatoria | — | — | Línea de resumen |
| Informe diario sin detalle clínico (por rol) | Tarjeta para cuerpo técnico | — | Vista clínica solo para médico | — | — | — | — | PDF de estado |
| Disponible / Sin respuesta / Rechazó + override | — | — | — | Asistencia previa | Selector de convocados | — | — | Asistencia |
| Alineación en pocos toques con formación base | — | — | — | — | Alineación | — | Misma formación | PDF de alineación |
| Dato → clic → vídeo | Atajo a último partido | — | Clips por jugador | — | Eventos del partido | Lista de cortes | — | Cada cifra enlaza |
| Plantilla de botones + teclas + desfase | — | — | — | — | Etiquetar en vivo en tableta | Etiquetado | — | — |
| Marcadores en la línea de tiempo | — | — | — | — | — | Línea de tiempo | — | — |
| Corte vs etiqueta | — | — | — | — | — | Modelo de datos | — | Filtros |
| Enviar a lista con un gesto | — | — | Lista por jugador | — | — | Listas | — | Montaje de informe |
| Menú contextual sobre el corte | — | — | — | — | — | Corte | Dibujar sobre corte | — |
| Filtros por grupo persistentes | Filtro global | Posición/grupo/estado | — | Grupo de la sesión | — | — | — | — |
| Ficha de tarea con edad, jugadores, duración + biblioteca | — | — | — | Diseñador y biblioteca | — | — | Diagrama de la tarea | PDF de sesión |
| Vistas y plantillas guardadas | — | Vistas de plantilla | — | Plantillas de sesión | — | Búsquedas de cortes | — | Plantillas de informe |

## 6. Fuentes que no pude abrir o evaluar (pendiente)
- Sin producto visible: Planet Training (planettraining.com no resuelve), Coach Logic (dominio en venta), SkillCorner (404 en página de producto), Metrica Play (404; solo home), Once (dominio principal onesport.com no resuelve; blog once.sport sí), LongoMatch home (ECONNREFUSED; sí support.longomatch.com).
- Sportscode: solo estructura de manual (los artículos "Components of a Timeline" y "Code Window Toolbar Buttons" no se cargaron).
- Teamworks/Smartabase: página de producto 404/redirección; sin capturas de ficha ni calendario.
- Nacsport Hub y Tag&view: solo resúmenes de búsqueda; no abrí los artículos.
- Spond: no abrí el artículo "How to Use the Line-up Feature for Football Matches".
- Hudl Wyscout app (App Store), Catapult OpenField Console, StatsBomb Live, Kitman iP: sin descripción de pantalla.
- **Para completar (8) densidad/tipografía/color/modo oscuro/tableta hace falta ver las demos o capturas a mano**; WebFetch no devuelve imágenes. Siguiente paso recomendado: revisar a mano las galerías de App Store de Spond, TeamSnap, TacticalPad, Coachbetter y Once, y los vídeos de demo de Kitman y Catapult Pro Video.
