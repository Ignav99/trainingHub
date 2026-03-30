'use client'

import { useState, useEffect } from 'react'

const FOOTBALL_FACTS = [
  // ── Records & Stats ──
  'El FC Barcelona posee el récord de más pases completados en un partido de Champions: 953 contra el Celtic en 2012.',
  'Pelé marcó 1.283 goles en su carrera, un récord que duró décadas como el más alto de la historia.',
  'El estadio Rungrado May Day en Corea del Norte tiene capacidad para 114.000 espectadores, el más grande del mundo.',
  'El gol más rápido de la historia del fútbol fue marcado a los 2 segundos del pitido inicial.',
  'España ganó 35 partidos consecutivos entre 2007 y 2009, récord mundial de selecciones.',
  'La primera tarjeta roja en un Mundial se mostró en 1930, en el partido Chile vs Argentina.',
  'El arquero Rogério Ceni marcó 131 goles en su carrera, más que muchos delanteros profesionales.',
  'La Bundesliga fue la primera liga europea en implementar la tecnología del VAR en 2017.',
  'Xavi Hernández completó más de 90% de pases en 6 temporadas consecutivas con el Barça.',
  'El fútbol femenino tuvo su primer Mundial oficial en 1991 en China.',
  'Maldini jugó 25 temporadas en el AC Milan sin pedir nunca un traspaso.',
  'En 2002, Corea del Sur se convirtió en el primer país asiático en llegar a semifinales de un Mundial.',
  'El césped de Wembley se corta a exactamente 25mm antes de cada partido.',
  'Un jugador profesional recorre entre 10 y 13 km de media por partido.',
  'La carga de entrenamiento óptima sigue la regla del 10%: no aumentar más del 10% semanal.',
  'Los equipos con mejor ratio de pases en el último tercio tienen un 23% más de probabilidad de victoria.',
  'El pressing alto recupera el balón en menos de 5 segundos el 34% de las veces.',
  'Los jugadores sub-23 que descansan 48h entre sesiones intensas rinden un 18% más.',
  'Cristiano Ronaldo ha marcado más de 900 goles oficiales en su carrera profesional.',
  'Messi es el jugador con más Balones de Oro de la historia con 8 trofeos.',
  'La final del Mundial 2022 entre Argentina y Francia es considerada una de las mejores de la historia.',
  'El Camp Nou puede albergar a 99.354 espectadores y será ampliado a más de 105.000.',
  'Ryan Giggs jugó 963 partidos con el Manchester United a lo largo de 24 temporadas.',
  'Gianluigi Buffon jugó como portero profesional durante más de 28 años.',
  'El primer partido internacional de fútbol fue entre Escocia e Inglaterra en 1872.',
  'Brasil es la única selección que ha participado en todos los Mundiales desde 1930.',
  'La Champions League genera más de 3.000 millones de euros anuales en derechos de TV.',
  'El hat-trick más rápido de la historia lo logró Sadio Mané en 2 minutos y 56 segundos.',
  'Dani Alves posee el récord de más títulos ganados por un futbolista: 43 trofeos.',
  'La liga inglesa es la más vista del mundo con audiencia en más de 180 países.',
  'En la temporada 2017-18, el Manchester City de Guardiola alcanzó los 100 puntos en la Premier League.',
  'El Maracaná llegó a albergar 200.000 personas en la final del Mundial de 1950.',
  'El récord de más goles en un año natural lo tiene Messi con 91 en 2012.',
  'Sir Alex Ferguson dirigió al Manchester United durante 26 años y ganó 38 trofeos.',
  'Johan Cruyff revolucionó el fútbol con el "Fútbol Total" en el Ajax de los 70.',
  'El primer gol olímpico (directo de córner) fue marcado por Cesáreo Onzari en 1924.',
  'El balón oficial de un partido de fútbol debe pesar entre 410 y 450 gramos.',
  'La portería mide 7,32 metros de ancho por 2,44 metros de alto.',
  'Un campo de fútbol profesional mide entre 100 y 110 metros de largo.',
  'La Euro 2024 en Alemania registró una asistencia total de más de 2,7 millones de espectadores.',
  'Roberto Carlos marcó uno de los goles de falta más espectaculares contra Francia en 1997.',
  'Zinedine Zidane marcó dos goles de cabeza en la final del Mundial 2006.',
  'El penalti se lanza desde 11 metros (12 yardas) de la línea de gol.',
  'La tarjeta amarilla y roja fueron inventadas por Ken Aston tras el Mundial de 1966.',
  'El Nottingham Forest ganó dos Champions League consecutivas en 1979 y 1980.',
  'Andrés Iniesta fue nombrado MVP del Mundial 2010 tras marcar el gol de la final.',
  'La posesión del balón no garantiza la victoria: el Chelsea ganó la Champions 2012 con solo 28% de posesión en la final.',
  'Peter Schmeichel es uno de los pocos porteros que ha marcado gol en la Champions League.',
  'La distancia total recorrida por un equipo en un partido puede superar los 110 km.',
  'El fútbol es el deporte más popular del mundo con más de 4.000 millones de aficionados.',

  // ── Tactical & Coaching ──
  'El modelo de juego define la identidad del equipo: es el ADN táctico que guía todas las decisiones.',
  'Un rondo bien diseñado trabaja simultáneamente técnica, táctica, física y cognición.',
  'La periodización táctica de Vítor Frade prioriza la especificidad: entrenar como se juega.',
  'Los principios tácticos se dividen en: organización ofensiva, defensiva, y transiciones.',
  'Pep Guardiola usa el concepto de "juego posicional" heredado de Cruyff y perfeccionado en el Barça.',
  'La superioridad numérica puede ser posicional, cualitativa o socio-afectiva, no solo numérica.',
  'El pressing de Klopp se basa en "gegenpressing": recuperar en 5 segundos o replegar.',
  'Un buen calentamiento debe durar entre 15-20 minutos y simular los movimientos del partido.',
  'La vuelta a la calma es tan importante como el calentamiento para prevenir lesiones.',
  'El juego de posición busca crear superioridades en cada zona del campo mediante movimientos coordinados.',
  'Marcelo Bielsa popularizó el pressing intenso y el análisis detallado del rival en el fútbol moderno.',
  'La salida lavolpiana es un sistema de construcción desde atrás nombrado por Ricardo La Volpe.',
  'El falso 9 fue popularizado por Guardiola con Messi en 2009, revolucionando el ataque.',
  'Un equipo bien organizado en defensa zonal puede cubrir más espacio que en marcaje individual.',
  'La amplitud ofensiva obliga al rival a estirarse, creando espacios entre líneas.',
  'La profundidad sin amplitud es predecible; la amplitud sin profundidad no genera peligro.',
  'Los juegos reducidos (SSG) son la forma más eficiente de trabajar táctica y condición física juntas.',
  'La densidad de un ejercicio influye directamente en la carga física y cognitiva del jugador.',
  'Los espacios reducidos aumentan la velocidad de decisión y la presión sobre el portador.',
  'Un ejercicio de 4v4+3 comodines es ideal para trabajar conservación y cambios de orientación.',
  'El "tercer hombre" es el jugador que recibe tras un pase-pared, clave en la construcción ofensiva.',
  'Las transiciones defensa-ataque son el momento de mayor vulnerabilidad del rival.',
  'Los equipos de élite tardan menos de 4 segundos en organizar su primera línea de pressing.',
  'El balón parado representa entre el 25-35% de los goles en el fútbol profesional.',
  'Un buen entrenador adapta su modelo de juego a las características de sus jugadores.',
  'La carga cognitiva de un ejercicio se puede aumentar añadiendo reglas o provocaciones.',
  'El principio de progresión: de lo simple a lo complejo, de lo conocido a lo desconocido.',
  'Un microciclo tipo para un partido el domingo: MD+1 recuperación, MD-4 fuerza, MD-3 velocidad, MD-2 táctica, MD-1 activación.',
  'Los sub-principios tácticos son las conductas específicas dentro de cada principio general.',
  'El "timing" de la presión es más importante que la presión en sí: presionar mal cansa y no recupera.',
  'Las rotaciones y basculaciones defensivas deben ser automatismos entrenados, no improvisados.',
  'El espacio entre líneas (entrelíneas) es donde se ganan los partidos en el fútbol moderno.',
  'La comunicación entre jugadores durante el partido es un factor táctico crucial y entrenable.',
  'Un equipo con buena circulación de balón puede mover al rival 2-3 veces más que corriendo sin balón.',
  'Los movimientos de desmarque deben ser "en diagonal" para dificultar el seguimiento del defensor.',
  'La zona 14 (entre el área y el medio campo rival) es estadísticamente la zona más peligrosa para crear ocasiones.',
  'Los partidos se ganan en la semana: el rendimiento del domingo es reflejo del entrenamiento.',
  'Arrigo Sacchi revolucionó el fútbol con su Milan 4-4-2 y la defensa en línea en los 80.',
  'El 4-3-3 de Cruyff en el Barcelona sentó las bases de lo que hoy conocemos como tiki-taka.',
  'El contragolpe eficaz requiere un máximo de 3-4 pases desde la recuperación hasta el disparo.',
  'Mourinho introdujo la "periodización por juegos" como alternativa a la periodización táctica.',
  'La circulación de balón no es un fin, sino un medio para desordenar al rival y encontrar espacios.',
  'Los extremos invertidos (diestro por izquierda, zurdo por derecha) son una tendencia consolidada en el fútbol actual.',
  'Un equipo presionante debe cubrir los "canales de pase" del rival, no solo al portador.',
  'La cobertura defensiva implica que siempre haya un jugador detrás del que presiona.',
  'El "cerrojo" italiano (catenaccio) nació en los años 60 con Helenio Herrera en el Inter.',

  // ── Physical & Science ──
  'Un futbolista profesional quema entre 1.200 y 1.600 calorías durante un partido de 90 minutos.',
  'El VO2max promedio de un futbolista de élite es de 55-65 ml/kg/min.',
  'La hidratación durante el partido puede mejorar el rendimiento cognitivo hasta un 15%.',
  'Los sprints repetidos representan solo el 1-3% de la distancia total pero son decisivos.',
  'El 70% de las lesiones en fútbol son musculares, siendo los isquiotibiales los más afectados.',
  'La potencia anaeróbica es crucial en los duelos y las acciones explosivas del fútbol.',
  'Un jugador realiza entre 1.000 y 1.400 cambios de actividad durante un partido.',
  'La fuerza excéntrica de los isquiotibiales es el principal protector contra lesiones musculares.',
  'El sueño es el mejor recuperador: 7-9 horas de sueño mejoran el rendimiento deportivo un 20%.',
  'La creatina es el suplemento con más evidencia científica para mejorar la fuerza explosiva.',
  'El entrenamiento de fuerza en futbolistas no "ralentiza": mejora la velocidad y reduce lesiones.',
  'La frecuencia cardíaca máxima se estima con la fórmula 220 menos la edad del jugador.',
  'Los ejercicios pliométricos mejoran la capacidad de salto y la velocidad de reacción.',
  'Una sesión de alta intensidad necesita al menos 48 horas de recuperación completa.',
  'El índice ACWR (Acute:Chronic Workload Ratio) ideal está entre 0,8 y 1,3.',
  'Un ratio ACWR por encima de 1,5 aumenta el riesgo de lesión exponencialmente.',
  'El RPE (Rate of Perceived Exertion) es una herramienta validada para monitorizar la carga de entrenamiento.',
  'La carga de entrenamiento sRPE se calcula multiplicando el RPE por la duración en minutos.',
  'Los jugadores pierden entre 1-3 litros de sudor por hora dependiendo de las condiciones climáticas.',
  'La temperatura muscular óptima para el rendimiento es de aproximadamente 39°C.',
  'Los ejercicios de movilidad articular antes del entrenamiento reducen el riesgo de lesión en un 30%.',
  'La fascia muscular necesita trabajo específico: foam rolling y estiramientos activos son efectivos.',
  'El GPS moderno puede medir más de 200 variables por jugador en cada sesión de entrenamiento.',
  'Los jugadores que realizan programas de prevención (FIFA 11+) reducen lesiones en un 30-50%.',
  'La nutrición post-entrenamiento debe incluir proteínas e hidratos en las 2 horas siguientes.',
  'El lactato no es un desecho: es un combustible que los músculos utilizan durante el ejercicio.',
  'La electroestimulación (EMS) puede complementar el entrenamiento de fuerza pero nunca sustituirlo.',
  'El core no es solo abdominales: incluye glúteos, suelo pélvico y musculatura profunda de la espalda.',
  'Los estiramientos estáticos antes del ejercicio pueden reducir la fuerza explosiva temporalmente.',
  'La crioterapia (baños de hielo) sigue siendo debatida: ayuda en recuperación aguda pero puede frenar adaptaciones.',
  'Un déficit de hierro puede reducir el rendimiento aeróbico hasta un 25% sin mostrar síntomas visibles.',
  'Los futbolistas de élite realizan entre 150 y 250 acciones de alta intensidad por partido.',
  'La capacidad de sprint repetido (RSA) es más determinante que la velocidad máxima en fútbol.',
  'El entrenamiento en altura (>2.000m) estimula la producción de glóbulos rojos y mejora el VO2max.',
  'El calzado inadecuado es responsable del 15% de las lesiones de tobillo en fútbol.',
  'Las mujeres futbolistas tienen 2-6 veces más riesgo de lesión de LCA que los hombres.',
  'La vitamina D es crucial para la salud ósea y muscular: muchos futbolistas tienen déficit.',
  'Los músculos aductores son los segundos más lesionados en fútbol después de los isquiotibiales.',
  'Un buen programa de readaptación tras lesión debe incluir trabajo propioceptivo y neuromuscular.',
  'La compresión muscular post-ejercicio puede reducir la inflamación y acelerar la recuperación.',
  'Los partidos nocturnos afectan al ritmo circadiano: los jugadores tardan 1-2 días más en recuperarse.',

  // ── Famous Quotes ──
  'Guardiola: "El fútbol es el único deporte donde puedes jugar bien y perder."',
  'Cruyff: "Jugar al fútbol es muy simple, pero jugar un fútbol simple es la cosa más difícil."',
  'Sacchi: "El fútbol es lo más importante de las cosas menos importantes."',
  'Bielsa: "El que no necesita el triunfo para justificarse es el que más posibilidades tiene de encontrarlo."',
  'Klopp: "Debo ser el entrenador más cool del mundo. Nadie hizo más con menos."',
  'Sir Alex Ferguson: "La derrota es la mejor enseñanza; la victoria la peor consejera."',
  'Zidane: "En el fútbol no hay excusas. Solo trabajo duro."',
  'Xavi: "En el Barça se juega pensando. Antes de recibir, ya sabes qué vas a hacer."',
  'Iniesta: "Un segundo antes de que llegue el balón, el partido ya está decidido en tu cabeza."',
  'Mourinho: "El que sabe solo de fútbol, ni de fútbol sabe."',
  'Lillo: "El fútbol es el deporte de los espacios y el tiempo."',
  'Valdano: "El fútbol necesita más gente que piense y menos gente que corra."',
  'Menotti: "El fútbol es un estado de ánimo. Se juega con la cabeza y se corre con el corazón."',
  'Di Stéfano: "Un buen jugador lo es en cualquier posición del campo."',
  'Rinus Michels: "El fútbol es guerra." — el padre del Fútbol Total.',
  'Ancelotti: "Un buen entrenador sabe que a veces la mejor decisión es no cambiar nada."',
  'Simeone: "Partido a partido. No hay otra forma de competir."',
  'Wenger: "Un jugador que sabe pensar rápido no necesita correr más que los demás."',
  'Puyol: "El talento gana partidos, pero el trabajo en equipo gana títulos."',
  'Maldini: "Si tengo que hacer un tackle, ya llegué tarde."',
  'Maradona: "El balón no se mancha."',
  'Van Gaal: "La táctica determina los resultados, no la suerte."',
  'Tuchel: "El fútbol moderno exige jugadores polivalentes que entiendan múltiples posiciones."',
  'Luis Enrique: "Prefiero un equipo que ataque mal a uno que defienda bien."',
  'Rijkaard: "La presión se transforma en placer cuando sabes lo que haces."',

  // ── History & Curiosities ──
  'El fútbol moderno nació en 1863 con la fundación de la Football Association en Inglaterra.',
  'El primer Mundial de fútbol se celebró en Uruguay en 1930, con 13 selecciones participantes.',
  'La regla del fuera de juego ha cambiado más de 10 veces desde su creación en 1866.',
  'El primer partido de fútbol televisado fue en 1937, un encuentro entre Arsenal y Arsenal Reserves.',
  'El trofeo de la Copa del Mundo pesa 6,1 kg y está hecho de oro de 18 quilates.',
  'La FIFA cuenta con más países miembros (211) que las Naciones Unidas (193).',
  'El primer gol en la historia de los Mundiales lo marcó Lucien Laurent de Francia en 1930.',
  'Hasta 1991, el pase atrás al portero se podía recoger con las manos.',
  'El tiempo añadido fue introducido tras el "Escándalo de Gijón" en el Mundial de 1982.',
  'La primera mujer árbitra en un partido oficial masculino fue en 1991 en Brasil.',
  'El balón de fútbol pasó de ser marrón y pesado a blanco y sintético en los años 60.',
  'El primer fichaje millonario fue el de Luis Suárez al Inter de Milán en 1961 por 25 millones de pesetas.',
  'La Bosman ruling de 1995 cambió para siempre el mercado de fichajes en Europa.',
  'El Calciopoli de 2006 provocó el descenso de la Juventus a Serie B por amaño de partidos.',
  'El Ajax de 1995 ganó la Champions con una media de edad de 23 años.',
  'La "Mano de Dios" de Maradona contra Inglaterra en 1986 es una de las jugadas más polémicas de la historia.',
  'El Leicester City ganó la Premier League 2016 con una cuota de apuesta de 5.000:1.',
  'La remontada del Barcelona al PSG (6-1) en 2017 es considerada la mayor remontada en Champions.',
  'En 1950, India no participó en el Mundial porque la FIFA les prohibió jugar descalzos.',
  'El Real Madrid ganó 5 Champions League consecutivas entre 1956 y 1960.',
  'La final de la Copa Libertadores 2018 entre Boca y River se jugó en el Bernabéu de Madrid.',
  'El primer partido con luz artificial se jugó en 1878 en Sheffield, Inglaterra.',
  'Hungría goleó 10-1 a El Salvador en el Mundial de 1982, la mayor goleada mundialista.',
  'El Dynamo de Kiev fue el primer equipo soviético en ganar una competición europea en 1975.',
  'La selección de Zambia sufrió un accidente aéreo en 1993 y perdió a casi todo su equipo.',
  'El Santos de Pelé fue tan popular que hizo una gira mundial y llenó estadios en todos los continentes.',
  'Italia ganó dos Mundiales consecutivos (1934 y 1938) bajo la dirección de Vittorio Pozzo.',
  'La "Naranja Mecánica" holandesa del 74 cambió la forma de entender el fútbol para siempre.',
  'El gol de Bergkamp contra Argentina en el Mundial 98 es considerado uno de los más bellos.',
  'En 1967, el Celtic de Glasgow fue el primer equipo británico en ganar la Copa de Europa.',

  // ── Analytics & Modern Football ──
  'Los datos esperados de gol (xG) predicen la probabilidad de que un disparo termine en gol.',
  'El xG acumulado es mejor predictor de rendimiento futuro que los goles reales marcados.',
  'Los equipos con alto PPDA (pases permitidos por acción defensiva) son los que más presionan.',
  'La métrica "progressive passes" mide los pases que acercan el balón al menos 10m a la portería rival.',
  'El "packing" mide cuántos rivales se eliminan con un pase, más útil que la posesión pura.',
  'Los datos muestran que los córners con balón raso tienen mayor probabilidad de gol que los aéreos.',
  'El 80% de las asistencias en las principales ligas europeas vienen desde zonas laterales del campo.',
  'Los centros desde tres cuartos de campo tienen más del doble de probabilidad de asistencia que los centros desde la línea de fondo.',
  'Los equipos que recuperan el balón en el tercio ofensivo marcan gol en el 8% de esas recuperaciones.',
  'Un portero moderno realiza entre 25-35 pases por partido, el doble que hace 10 años.',
  'La distancia media entre líneas de un equipo compacto es de 30-35 metros.',
  'Los corners representan solo un 3% de probabilidad de gol directo, pero un 15% tras segunda jugada.',
  'El mercado de fichajes global movió más de 9.000 millones de euros en 2023.',
  'La inteligencia artificial ya se usa para predecir lesiones con una precisión del 70-80%.',
  'Los sistemas de tracking pueden registrar más de 25 posiciones por segundo por jugador.',
  'El "Expected Threat" (xT) mide el valor de mover el balón a diferentes zonas del campo.',
  'Los saques de banda largos generan más ocasiones que los saques de esquina en algunos equipos.',
  'El 60% de los goles en fútbol profesional se marcan en los últimos 30 minutos del partido.',
  'Los penaltis lanzados al centro tienen la mayor probabilidad de gol (81%) pero son los menos usados.',
  'Los equipos con mayor velocidad media de circulación de balón crean más oportunidades claras.',

  // ── Training Methodology ──
  'La periodización ondulatoria alterna cargas altas y bajas dentro de la misma semana.',
  'Un ejercicio analítico trabaja una capacidad aislada; uno integrado combina varias.',
  'Los juegos de posición de Juanma Lillo son la base del estilo de juego de Guardiola.',
  'La sesión ideal tiene forma de "meseta": calentamiento → pico de intensidad → vuelta a la calma.',
  'El principio de alternancia horizontal: las sesiones deben alternar entre más y menos intensas.',
  'El entrenamiento invisible (sueño, nutrición, hábitos) es responsable del 30% del rendimiento.',
  'La transferencia de un ejercicio mide cuánto de lo entrenado se aplica realmente en competición.',
  'Un rondo 4v2 con transición trabaja: conservación, pressing, y cambio de rol.',
  'La comunicación no verbal entre jugadores representa más del 60% de la coordinación en campo.',
  'Un jugador toma entre 100 y 200 decisiones tácticas durante un partido de 90 minutos.',
  'El feedback inmediato durante el ejercicio es más efectivo que el feedback post-sesión.',
  'Los ejercicios con provocación (reglas especiales) aumentan la complejidad cognitiva sin cambiar la estructura.',
  'La fase de activación debe incluir componentes técnico-tácticos, no solo carrera continua.',
  'El "teaching games for understanding" (TGfU) prioriza el juego sobre la técnica aislada.',
  'Los ejercicios de finalización deben simular situaciones reales: llegar con fatiga y presión.',
  'La variabilidad en el entrenamiento (cambiar espacios, reglas, números) mejora la adaptabilidad.',
  'Los circuitos técnico-tácticos con toma de decisiones son más eficientes que los analíticos puros.',
  'La regla de los 3 contactos máximos en un rondo obliga a pensar más rápido.',
  'Un jugador mejora más en 60 minutos de juego reducido que en 90 de entrenamiento analítico.',
  'Las pausas activas entre series (movilidad, técnica suave) son más efectivas que las pausas pasivas.',
  'La observación del entrenador durante el ejercicio es tan importante como el diseño del mismo.',
  'Los partidos de entrenamiento (intra-equipo) deben tener objetivos tácticos claros, no solo competir.',
  'La planificación inversa: primero define el modelo de juego, luego diseña los ejercicios.',
  'El coaching questioning (preguntas al jugador) genera más aprendizaje que las instrucciones directas.',
  'Un buen ejercicio tiene alto porcentaje de tiempo de juego efectivo y mínimas pausas.',
  'Los condicionantes de espacio y tiempo son las herramientas principales del diseño de tareas.',
  'El número de jugadores en un ejercicio determina el nivel de complejidad y las interacciones.',
  'Las oleadas (waves) en ejercicios de finalización mantienen alta intensidad con descanso activo.',
  'El entrenamiento del portero debe integrarse en las sesiones del equipo, no ser siempre aislado.',

  // ── Psychology & Leadership ──
  'La cohesión de equipo es el mejor predictor de rendimiento colectivo, por encima del talento individual.',
  'El estado de "flow" en el deporte ocurre cuando el desafío coincide con el nivel de habilidad.',
  'La visualización mental antes de un partido puede mejorar el rendimiento en un 10-15%.',
  'Los equipos con mayor resiliencia mental ganan un 30% más de partidos igualados.',
  'La presión del público local da una ventaja estadística del 55-60% de victorias en casa.',
  'Un líder en el vestuario no siempre es el capitán: puede ser cualquier jugador con influencia positiva.',
  'La autoconfianza de un jugador influye directamente en su rendimiento técnico bajo presión.',
  'Los rituales pre-partido (rutinas) ayudan a los jugadores a entrar en estado óptimo de rendimiento.',
  'El efecto "hot hand" (racha positiva) existe en el fútbol: un jugador con confianza rinde más.',
  'El lenguaje del entrenador en el descanso afecta al rendimiento del segundo tiempo mediblemente.',
  'Los jugadores expertos procesan la información visual del campo 40% más rápido que los novatos.',
  'La inteligencia emocional es tan importante como la inteligencia táctica en el fútbol de élite.',
  'Un entrenador que escucha activamente genera 3 veces más compromiso que uno autoritario.',
  'La gestión del error es clave: los jugadores que no temen fallar toman mejores decisiones.',
  'La cultura del equipo se construye en los entrenamientos, no en las charlas motivacionales.',
  'Los equipos con objetivos claros y compartidos rinden un 25% más que los que no los tienen.',
  'El agotamiento mental (burnout) afecta al 15-20% de los futbolistas profesionales cada temporada.',
  'La mentalidad de crecimiento (growth mindset) se puede entrenar y mejora el rendimiento a largo plazo.',
  'La celebración de pequeños logros durante la temporada mantiene la motivación del equipo alta.',
  'Un jugador promedio necesita entre 6.000 y 10.000 horas de práctica deliberada para llegar a élite.',

  // ── Nutrition & Recovery ──
  'Los futbolistas profesionales necesitan entre 3.000 y 4.500 calorías diarias según la posición.',
  'La cafeína mejora la velocidad de reacción y la resistencia en un 3-5% sin efectos negativos.',
  'El zumo de cereza ácida reduce la inflamación muscular y acelera la recuperación.',
  'Los hidratos de carbono deben representar el 55-65% de la dieta de un futbolista.',
  'La proteína debe consumirse en dosis de 20-40g cada 3-4 horas para optimizar la síntesis muscular.',
  'El omega-3 tiene propiedades antiinflamatorias que ayudan en la recuperación muscular.',
  'Los futbolistas que desayunan bien rinden un 12% más en las sesiones matutinas.',
  'La deshidratación de solo un 2% del peso corporal reduce el rendimiento físico un 10-20%.',
  'Las bebidas isotónicas son necesarias en ejercicios de más de 60 minutos o en ambientes calurosos.',
  'La "carga de glucógeno" 2-3 días antes de un partido mejora la resistencia en los últimos 20 minutos.',
  'El magnesio es esencial para la función muscular: su déficit causa calambres y fatiga.',
  'Los batidos de recuperación deben tomarse en los 30 minutos posteriores al ejercicio para máxima absorción.',
  'El alcohol post-partido retrasa la recuperación muscular hasta 72 horas.',
  'La siesta de 20-30 minutos mejora el rendimiento cognitivo y físico en sesiones vespertinas.',
  'Las proteínas vegetales (legumbres, soja) son igual de efectivas que las animales si se combinan bien.',

  // ── Youth Development ──
  'La formación juvenil debe priorizar la toma de decisiones sobre la ejecución técnica perfecta.',
  'El "street football" desarrolla la creatividad y la capacidad de improvisación de forma natural.',
  'Los jugadores que practican múltiples deportes de niños tienen menos lesiones de adultos.',
  'La especialización temprana (antes de los 12 años) aumenta el riesgo de abandono y lesiones.',
  'El ratio de juego vs. instrucción en categorías inferiores debe ser de al menos 70:30.',
  'Los equipos de cantera que priorizan el desarrollo sobre los resultados producen más profesionales.',
  'La maduración biológica puede crear diferencias de hasta 4 años entre jugadores de la misma edad.',
  'El "relative age effect" favorece a los jugadores nacidos en los primeros meses del año en categorías inferiores.',
  'Un entrenador de base forma personas primero y jugadores después.',
  'Los porteros no deberían especializarse antes de los 12 años: necesitan jugar en todas las posiciones.',
  'La técnica individual se desarrolla mejor entre los 8 y 14 años (ventana sensible de aprendizaje).',
  'Los jugadores que juegan en espacios reducidos de pequeños desarrollan mejor visión de juego.',
  'La competición en fútbol base debe ser formativa, con rotaciones y oportunidades para todos.',
  'Los padres son el factor externo más influyente en el desarrollo deportivo de un joven futbolista.',
  'La Liga Promises del Barça usa campos reducidos para fomentar el contacto con el balón.',

  // ── Technology & Innovation ──
  'El VAR analiza más de 500 incidentes por partido, aunque solo interviene en una media de 4-6.',
  'La tecnología de línea de gol (GLT) tarda menos de 1 segundo en determinar si el balón cruzó la línea.',
  'Los drones se usan cada vez más para grabar entrenamientos y analizar patrones tácticos desde arriba.',
  'El análisis de video post-partido de élite tarda entre 2-4 horas por cada 90 minutos de juego.',
  'Los chalecos GPS pesan menos de 50 gramos y registran datos cada 0,1 segundos.',
  'La realidad virtual ya se usa para entrenar la toma de decisiones sin desgaste físico.',
  'Los algoritmos de machine learning pueden identificar patrones tácticos invisibles al ojo humano.',
  'Las plataformas de scouting digital analizan más de 300 variables por jugador y partido.',
  'El "Expected Goals" (xG) fue creado por Sam Green en 2012 y ahora es estándar en la industria.',
  'Los sistemas de tracking óptico como Hawk-Eye procesan más de 2 millones de puntos de datos por partido.',
  'La electromiografía (EMG) puede detectar fatiga muscular antes de que el jugador la perciba.',
  'Los smartwatches deportivos miden la variabilidad de frecuencia cardíaca (HRV) para evaluar recuperación.',
  'El software de análisis táctico permite dibujar sobre el video en tiempo real durante el descanso.',
  'Los clubes de élite emplean entre 5 y 15 analistas de datos por equipo.',
  'La biomecánica del disparo muestra que el empeine genera más velocidad pero el interior más precisión.',

  // ── Random Fun Facts ──
  'El partido de fútbol más largo duró 35 horas y fue un evento benéfico en el Reino Unido.',
  'Existe un campeonato de fútbol para robots llamado RoboCup, con el objetivo de vencer a humanos en 2050.',
  'En las Islas Feroe, las ovejas superan a los humanos 70.000 a 50.000, pero tienen liga profesional.',
  'El color rojo de la camiseta se asocia estadísticamente con una ligera ventaja competitiva.',
  'La velocidad media de un disparo profesional es de 100-120 km/h; los más potentes superan los 200 km/h.',
  'Ronaldinho fue aplaudido por el Bernabéu tras marcar dos goles con el Barça en 2005.',
  'El primer partido de fútbol en la Antártida se jugó en 2014 sobre hielo.',
  'Los futbolistas parpadean menos durante las jugadas de ataque que durante las defensivas.',
  'El grito de "¡Goool!" de los narradores latinoamericanos puede durar más de 30 segundos.',
  'En Groenlandia no hay liga de fútbol porque no hay suficiente césped natural.',
  'La camiseta número 10 se asoció al "enganche" (mediapunta) a partir de Pelé en el Mundial de 1958.',
  'El fútbol se juega en todos los continentes, incluida la Antártida de forma recreativa.',
  'En Florencia, Italia, se juega el "Calcio Storico", una versión medieval y violenta del fútbol.',
  'Los árbitros profesionales recorren entre 10 y 12 km por partido, similar a los jugadores de campo.',
  'El primer patrocinio de camiseta en fútbol fue del club alemán Eintracht Braunschweig en 1973.',
]

const LOADING_STEPS = [
  'Conectando con el servidor...',
  'Verificando credenciales...',
  'Cargando datos del equipo...',
  'Preparando sesiones y partidos...',
  'Sincronizando calendario...',
  'Cargando estadísticas...',
  'Casi listo...',
]

export function SplashScreen() {
  // Use deterministic initial values to avoid SSR hydration mismatch
  const [factIndex, setFactIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Set random fact after mount (client-only)
  useEffect(() => {
    setFactIndex(Math.floor(Math.random() * FOOTBALL_FACTS.length))
    setMounted(true)
  }, [])

  // Rotate facts every 8 seconds with fade transition
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setFactIndex(prev => {
          // Pick a random next fact (not the same one)
          let next = Math.floor(Math.random() * FOOTBALL_FACTS.length)
          while (next === prev && FOOTBALL_FACTS.length > 1) {
            next = Math.floor(Math.random() * FOOTBALL_FACTS.length)
          }
          return next
        })
        setFadeIn(true)
      }, 400)
    }, 8000)
    return () => clearInterval(interval)
  }, [mounted])

  // Cycle loading steps
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 2000)
    return () => clearInterval(interval)
  }, [mounted])

  const fact = FOOTBALL_FACTS[factIndex]

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1040 30%, #251560 60%, #1a1040 100%)',
      }}
    >
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
            bottom: '20%',
            right: '10%',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 w-full">

        {/* Logo with glow */}
        <div className="relative mb-8">
          <div
            className="absolute inset-0 blur-2xl opacity-60 animate-pulse"
            style={{
              background: 'radial-gradient(circle, #7c3aed 0%, transparent 60%)',
              transform: 'scale(2.5)',
            }}
          />
          <div className="absolute -inset-4 rounded-full border border-purple-500/20 animate-kabine-ping" />
          <img
            src="/logo-icon.png"
            alt="Kabin-e"
            className="relative w-20 h-20 drop-shadow-2xl animate-kabine-spin"
            style={{ filter: 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.5))' }}
          />
        </div>

        {/* Brand name */}
        <h1
          className="text-3xl font-bold tracking-tight mb-1"
          style={{
            background: 'linear-gradient(135deg, #e2d4ff 0%, #a78bfa 50%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Kabin-e
        </h1>
        <p className="text-purple-300/60 text-xs font-medium tracking-[0.3em] uppercase mb-10">
          Gestión deportiva profesional
        </p>

        {/* Progress bar — pure CSS animation, no JS dependency */}
        <div className="w-full max-w-xs mb-4">
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="splash-progress-bar h-full rounded-full" />
          </div>
        </div>

        {/* Loading step text */}
        <p className="text-purple-200/70 text-sm mb-12 h-5 transition-all duration-300">
          {LOADING_STEPS[stepIndex]}
        </p>

        {/* Football fact card */}
        <div
          className="w-full rounded-xl border border-purple-500/10 backdrop-blur-sm px-5 py-4"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(30,20,60,0.5) 100%)',
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 shrink-0">⚽</span>
            <div>
              <p className="text-[10px] font-semibold text-purple-400/70 uppercase tracking-wider mb-1">
                ¿Sabías que...?
              </p>
              <p className="text-purple-100/80 text-sm leading-relaxed">
                {fact}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 flex flex-col items-center gap-1">
        <p className="text-purple-400/30 text-[10px] tracking-widest uppercase">
          Powered by Kabin-e
        </p>
      </div>

      {/* CSS-only animations — independent of React state/effects */}
      <style>{`
        .splash-progress-bar {
          background: linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed);
          background-size: 200% 100%;
          animation: splash-progress-fill 14s ease-out forwards, splash-shimmer 2s linear infinite;
        }
        @keyframes splash-progress-fill {
          0% { width: 5%; }
          15% { width: 20%; }
          35% { width: 40%; }
          55% { width: 60%; }
          75% { width: 75%; }
          100% { width: 92%; }
        }
        @keyframes splash-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
