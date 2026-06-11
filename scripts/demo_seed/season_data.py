# -*- coding: utf-8 -*-
"""CD Atlántico — contenido ficticio de la temporada demo 2025/26.

Todo el contenido narrativo vive aquí: plantilla, rivales con scouting,
resultados diseñados (subcampeón, 75 pts), lesiones, biblioteca de tareas.
"""

DEMO_USER = {
    "email": "demo@clubatlantico.es",
    "password": "Demo2026!",
    "nombre": "Carlos",
    "apellidos": "Mendoza",
    "rol": "admin",
    "organizacion_nombre": "CD Atlántico",
    "gdpr_consentimiento": True,
}

EQUIPO = {
    "nombre": "Primer Equipo",
    "categoria": "Senior Aficionado",
    "temporada": "2025-2026",
    "num_jugadores_plantilla": 23,
    "sistema_juego": "1-4-3-3",
}

# ── Plantilla: 23 jugadores ──────────────────────────────────────────────
# key: id corto interno para referenciar en lesiones/tarjetas
PLAYERS = [
    {"key": "cano",     "nombre": "Rubén",  "apellidos": "Cano Vilches",    "dorsal": 1,  "posicion_principal": "POR", "fecha_nacimiento": "1996-03-14", "altura": 1.88, "peso": 84, "pierna_dominante": "derecha"},
    {"key": "costas",   "nombre": "Dani",   "apellidos": "Costas Meirama",  "dorsal": 13, "posicion_principal": "POR", "fecha_nacimiento": "1999-07-22", "altura": 1.91, "peso": 86, "pierna_dominante": "derecha"},
    {"key": "belasko",  "nombre": "Unai",   "apellidos": "Belasko Iriarte", "dorsal": 25, "posicion_principal": "POR", "fecha_nacimiento": "2003-11-02", "altura": 1.86, "peso": 80, "pierna_dominante": "izquierda"},
    {"key": "igoa",     "nombre": "Marco",  "apellidos": "Igoa Salaberri",  "dorsal": 2,  "posicion_principal": "LTD", "fecha_nacimiento": "1998-01-30", "altura": 1.76, "peso": 71, "pierna_dominante": "derecha"},
    {"key": "navarro",  "nombre": "Sergio", "apellidos": "Navarro Gil",     "dorsal": 3,  "posicion_principal": "LTI", "fecha_nacimiento": "1997-05-09", "altura": 1.78, "peso": 73, "pierna_dominante": "izquierda"},
    {"key": "lemos",    "nombre": "Hugo",   "apellidos": "Lemos Barreiro",  "dorsal": 4,  "posicion_principal": "DFC", "fecha_nacimiento": "1995-09-17", "altura": 1.90, "peso": 85, "pierna_dominante": "derecha"},
    {"key": "vega",     "nombre": "Aitor",  "apellidos": "Vega Lasarte",    "dorsal": 5,  "posicion_principal": "DFC", "fecha_nacimiento": "1996-12-04", "altura": 1.87, "peso": 83, "pierna_dominante": "derecha"},
    {"key": "pineda",   "nombre": "Álvaro", "apellidos": "Pineda Roca",     "dorsal": 12, "posicion_principal": "LTD", "fecha_nacimiento": "2002-02-18", "altura": 1.74, "peso": 69, "pierna_dominante": "derecha"},
    {"key": "echarri",  "nombre": "Jon",    "apellidos": "Echarri Mendoza", "dorsal": 15, "posicion_principal": "DFC", "fecha_nacimiento": "2001-06-25", "altura": 1.89, "peso": 84, "pierna_dominante": "derecha"},
    {"key": "ferreiro", "nombre": "Nico",   "apellidos": "Ferreiro Lago",   "dorsal": 17, "posicion_principal": "LTI", "fecha_nacimiento": "2000-08-11", "altura": 1.77, "peso": 72, "pierna_dominante": "izquierda"},
    {"key": "sarria",   "nombre": "Imanol", "apellidos": "Sarriá Otxoa",    "dorsal": 22, "posicion_principal": "DFC", "fecha_nacimiento": "1999-04-03", "altura": 1.86, "peso": 82, "pierna_dominante": "izquierda"},
    {"key": "zubia",    "nombre": "Iker",   "apellidos": "Zubia Aldai",     "dorsal": 6,  "posicion_principal": "MCD", "fecha_nacimiento": "1997-10-28", "altura": 1.82, "peso": 77, "pierna_dominante": "derecha"},
    {"key": "romero",   "nombre": "Álex",   "apellidos": "Romero Pazos",    "dorsal": 8,  "posicion_principal": "MC",  "fecha_nacimiento": "1998-03-07", "altura": 1.79, "peso": 74, "pierna_dominante": "derecha"},
    {"key": "salgado",  "nombre": "Martín", "apellidos": "Salgado Búa",     "dorsal": 10, "posicion_principal": "MCO", "fecha_nacimiento": "1995-11-21", "altura": 1.75, "peso": 70, "pierna_dominante": "izquierda"},
    {"key": "casals",   "nombre": "Pol",    "apellidos": "Casals Ribó",     "dorsal": 14, "posicion_principal": "MC",  "fecha_nacimiento": "2001-01-15", "altura": 1.80, "peso": 75, "pierna_dominante": "derecha"},
    {"key": "larralde", "nombre": "Eneko",  "apellidos": "Larralde Goñi",   "dorsal": 16, "posicion_principal": "MCD", "fecha_nacimiento": "2002-07-08", "altura": 1.83, "peso": 78, "pierna_dominante": "derecha"},
    {"key": "outeiro",  "nombre": "Brais",  "apellidos": "Outeiro Cances",  "dorsal": 18, "posicion_principal": "MCO", "fecha_nacimiento": "2000-05-30", "altura": 1.77, "peso": 72, "pierna_dominante": "izquierda"},
    {"key": "cuevas",   "nombre": "Adrián", "apellidos": "Cuevas Manzano",  "dorsal": 20, "posicion_principal": "MC",  "fecha_nacimiento": "2004-09-12", "altura": 1.78, "peso": 71, "pierna_dominante": "derecha"},
    {"key": "vidal",    "nombre": "Pablo",  "apellidos": "Vidal Ferrón",    "dorsal": 7,  "posicion_principal": "EXD", "fecha_nacimiento": "1999-02-26", "altura": 1.76, "peso": 72, "pierna_dominante": "izquierda"},
    {"key": "ferrer",   "nombre": "Marc",   "apellidos": "Ferrer Solanes",  "dorsal": 9,  "posicion_principal": "DC",  "fecha_nacimiento": "1996-06-19", "altura": 1.84, "peso": 80, "pierna_dominante": "derecha"},
    {"key": "mendes",   "nombre": "Thiago", "apellidos": "Mendes da Silva", "dorsal": 11, "posicion_principal": "EXI", "fecha_nacimiento": "2000-12-01", "altura": 1.73, "peso": 68, "pierna_dominante": "derecha"},
    {"key": "aranda",   "nombre": "Joel",   "apellidos": "Aranda Cifuentes","dorsal": 19, "posicion_principal": "DC",  "fecha_nacimiento": "1998-08-23", "altura": 1.86, "peso": 82, "pierna_dominante": "derecha"},
    {"key": "campos",   "nombre": "Yeray",  "apellidos": "Campos Medina",   "dorsal": 21, "posicion_principal": "EXD", "fecha_nacimiento": "2003-04-16", "altura": 1.75, "peso": 70, "pierna_dominante": "ambas"},
]

# Once tipo (keys) en 1-4-3-3 — el planificador rota según disponibilidad
BASE_XI = ["cano", "igoa", "lemos", "vega", "navarro", "zubia", "romero", "salgado", "vidal", "ferrer", "mendes"]

# Peso goleador (clave → peso); el pichichi acaba ~18-19, segundo ~11-12
SCORER_WEIGHTS = {
    "ferrer": 19, "aranda": 13, "vidal": 11, "mendes": 10, "salgado": 8,
    "outeiro": 6, "campos": 5, "lemos": 2, "vega": 2, "romero": 2,
}

# ── Rivales: 17 clubes ficticios ─────────────────────────────────────────
RIVALS = [
    {"nombre": "UD Faro Norte",        "nombre_corto": "FAR", "ciudad": "Puerto Faro",     "estadio": "El Espigón",          "sistema_juego": "1-4-4-2", "estilo": "Bloque medio y contragolpe",
     "clave": "su delantero Toni Riba (14 goles la pasada campaña), rápido al espacio", "fuerte": "transiciones ofensivas tras robo en zona media", "debil": "espalda de los laterales cuando suben los dos a la vez", "abp": "muy peligrosos en saques de esquina al primer palo con bloqueos"},
    {"nombre": "Atlético Ribera",      "nombre_corto": "RIB", "ciudad": "Ribera del Eume", "estadio": "Campo da Xunqueira",  "sistema_juego": "1-4-3-3", "estilo": "Posesión y presión alta",
     "clave": "el mediapunta Iván Lousada, organiza todo el juego entre líneas", "fuerte": "salida de balón limpia con triángulos por dentro", "debil": "vulnerables al juego directo sobre sus centrales, poco dominantes por arriba", "abp": "defienden zonal puro; el segundo palo queda liberado a menudo"},
    {"nombre": "CD Esperanza",         "nombre_corto": "ESP", "ciudad": "Vilanova",        "estadio": "Municipal A Lomba",   "sistema_juego": "1-5-3-2", "estilo": "Bloque bajo y balón directo",
     "clave": "el carrilero zurdo Manu Freire, profundidad constante", "fuerte": "solidez defensiva con cinco atrás, muy juntos", "debil": "generan poco en estático: dependen del balón parado", "abp": "faltas laterales ensayadas con desmarques de ruptura cruzados"},
    {"nombre": "Racing Portuario",     "nombre_corto": "POR", "ciudad": "Puerto Real",     "estadio": "La Dársena",          "sistema_juego": "1-4-2-3-1", "estilo": "Vertical, presión tras pérdida",
     "clave": "su '10' Joaquín Bermúdez, último pase y llegada desde segunda línea", "fuerte": "contrapresión inmediata: cinco segundos asfixiantes tras pérdida", "debil": "si superas la primera presión, quedan largos y partidos en dos", "abp": "lanzador zurdo de gran calidad en córners cerrados al área pequeña"},
    {"nombre": "SD Cantábrico",        "nombre_corto": "CAN", "ciudad": "Santa Olalla",    "estadio": "El Acantilado",       "sistema_juego": "1-4-4-2", "estilo": "Orden, oficio y duelos",
     "clave": "la pareja de puntas Otero-Cuenca, se asocian de memoria", "fuerte": "dos líneas de cuatro muy disciplinadas, difícil encontrar espacios interiores", "debil": "laterales lentos en el uno contra uno con extremos rápidos", "abp": "rutina de córner en corto que acaba en centro al punto de penalti"},
    {"nombre": "CF Levante Azul",      "nombre_corto": "LEV", "ciudad": "Cala Brava",      "estadio": "Camp de la Mar",      "sistema_juego": "1-4-3-3", "estilo": "Combinativo, extremos abiertos",
     "clave": "el extremo Adam Reyes: regate, velocidad y golpeo con ambas", "fuerte": "amplitud máxima y centros laterales constantes", "debil": "el pivote queda solo: dos contra uno en zona 14 les hace daño", "abp": "penaltis y faltas frontales: especialista de nivel alto"},
    {"nombre": "UD Salinas",           "nombre_corto": "SAL", "ciudad": "Las Salinas",     "estadio": "Estadio del Mar",     "sistema_juego": "1-3-5-2", "estilo": "Carrileros largos, tres centrales",
     "clave": "el central libre Ramiro Cao saliendo con balón hasta mediocampo", "fuerte": "superioridad interior con cinco mediocampistas", "debil": "los espacios a la espalda de los carrileros en transición", "abp": "saques de banda largos al área como un córner más"},
    {"nombre": "Deportivo Arenal",     "nombre_corto": "ARE", "ciudad": "El Arenal",       "estadio": "Nou Arenal",          "sistema_juego": "1-4-2-3-1", "estilo": "Medio bloque y llegada",
     "clave": "mediapunta Sergi Tomàs, llega al área desde segunda línea sin ser visto", "fuerte": "equilibrio: nunca pierden la estructura defensiva", "debil": "delantero aislado si el rival junta líneas; poca pelea por arriba", "abp": "córner ensayado con tres bloqueos al primer palo"},
    {"nombre": "CD Monteverde",        "nombre_corto": "MON", "ciudad": "Monteverde",      "estadio": "El Robledal",         "sistema_juego": "1-4-4-2", "estilo": "Directo, segunda jugada",
     "clave": "el ariete Borja Lago: 1,92 m, gana todos los duelos aéreos", "fuerte": "juego directo al punta y lucha de la segunda jugada", "debil": "poca elaboración: si controlas el rechace, no generan", "abp": "todo al área buscando la cabeza de Lago, incluso el portero sube"},
    {"nombre": "Real Estuario",        "nombre_corto": "EST", "ciudad": "Punta Estuario",  "estadio": "La Marisma",          "sistema_juego": "1-4-3-3", "estilo": "Presión alta, ritmo alto",
     "clave": "interior Pelayo Roces, box-to-box incansable", "fuerte": "los primeros 20 minutos: salen a un ritmo que ahoga", "debil": "se desfondan en el último tramo: del 70' en adelante conceden", "abp": "córners en corto para generar 2v1 en banda"},
    {"nombre": "Gimnástica del Sur",   "nombre_corto": "GIM", "ciudad": "Villasur",        "estadio": "El Olivar",           "sistema_juego": "1-4-2-3-1", "estilo": "Pausa y control",
     "clave": "doble pivote Vela-Madrigal, no pierden un balón", "fuerte": "madurez competitiva: gestionan los tiempos del partido", "debil": "ritmo bajo: sufren contra equipos verticales que corren", "abp": "defensa mixta con vigilancias muy marcadas"},
    {"nombre": "CP Almadraba",         "nombre_corto": "ALM", "ciudad": "La Almadraba",    "estadio": "Las Redes",           "sistema_juego": "1-4-4-2", "estilo": "Intensidad y banda derecha",
     "clave": "extremo derecho Curro Beltrán: el 70% de su juego nace en su bota", "fuerte": "centros laterales desde la derecha y llegada del segundo punta", "debil": "banda izquierda muy débil defensivamente: ahí está el partido", "abp": "faltas laterales al segundo palo con remate de los centrales"},
    {"nombre": "Unión Cabo Blanco",    "nombre_corto": "CAB", "ciudad": "Cabo Blanco",     "estadio": "El Faro Viejo",       "sistema_juego": "1-5-4-1", "estilo": "Muro defensivo",
     "clave": "portero Iago Mosquera: paradas que valen puntos cada jornada", "fuerte": "defender el área propia: cuerpos, fe y un portero enorme", "debil": "cero transición ofensiva: un gol encajado les rompe el plan", "abp": "pierden marcas en córners cuando defienden tras despeje"},
    {"nombre": "Atlético Vendaval",    "nombre_corto": "VEN", "ciudad": "Torre Vendaval",  "estadio": "Los Vientos",         "sistema_juego": "1-4-3-3", "estilo": "Joven, alegre, irregular",
     "clave": "extremo Izan Cortés (19 años), el mayor talento de la categoría", "fuerte": "capacidad de desborde individual en los tres de arriba", "debil": "inmadurez: pierden el orden tras encajar y conceden en racha", "abp": "vigilancias flojas en el balón parado defensivo"},
    {"nombre": "SD Peñagrande",        "nombre_corto": "PEÑ", "ciudad": "Peñagrande",      "estadio": "El Castro",           "sistema_juego": "1-4-1-4-1", "estilo": "Compacto entre líneas",
     "clave": "pivote Andoni Goiko: corta todo lo que pasa por dentro", "fuerte": "negar el juego interior: te obligan a jugar por fuera", "debil": "el punta queda muy solo: sus centrales dudan saliendo al espacio", "abp": "rutinas ensayadas de falta frontal con tres lanzadores"},
    {"nombre": "Caleta CF",            "nombre_corto": "CAL", "ciudad": "La Caleta",       "estadio": "Arenas Blancas",      "sistema_juego": "1-4-4-2", "estilo": "Veterano, resultadista",
     "clave": "capitán Fran Olmedo, 38 años: sigue decidiendo partidos en área rival", "fuerte": "saben competir: ganan los partidos igualados por experiencia", "debil": "físicamente justos: las segundas partes a ritmo alto les superan", "abp": "Olmedo lanza todo: córners, faltas y penaltis con precisión quirúrgica"},
    {"nombre": "Sporting Bahía",       "nombre_corto": "BAH", "ciudad": "Bahía Grande",    "estadio": "Mareógrafo",          "sistema_juego": "1-4-2-3-1", "estilo": "Campeón: talento y pegada",
     "clave": "el '10' Diego Llamas: máximo asistente de la liga, cambia partidos solo", "fuerte": "eficacia brutal: necesitan poco para hacerte mucho daño", "debil": "se les puede igualar con intensidad: pierden duelos si el partido se rompe", "abp": "Llamas al espacio en córners en corto; defensivamente impecables"},
]
CHAMPION_IDX = 16  # Sporting Bahía gana la liga con 78 puntos

# ── Calendario ───────────────────────────────────────────────────────────
SEASON_START = "2025-08-04"      # lunes, inicio pretemporada
JORNADA1_DATE = "2025-09-07"     # domingo
WINTER_BREAK = ("2025-12-22", "2026-01-04")  # dos semanas sin jornada
LAST_JORNADA_DATE = "2026-05-17"

# Amistosos de pretemporada (fecha, rival_idx, localia, gf, gc)
FRIENDLIES = [
    ("2025-08-09", 13, "local",     3, 1),
    ("2025-08-13", 2,  "visitante", 1, 1),
    ("2025-08-16", 7,  "local",     2, 0),
    ("2025-08-23", 16, "visitante", 1, 2),
    ("2025-08-30", 5,  "local",     2, 1),
]

# Resultados de liga diseñados: (jornada, gf, gc)
# Arco: arranque fuerte → bache de noviembre (J10-J12) → segunda vuelta top →
# derrota en J33 que decide el título → 2º con 75 pts (22V 9E 3D, 63GF 25GC)
RESULTS = [
    (1, 2, 0), (2, 3, 1), (3, 1, 1), (4, 2, 1), (5, 4, 0), (6, 1, 0),
    (7, 2, 2), (8, 3, 0), (9, 2, 1), (10, 1, 2), (11, 0, 0), (12, 0, 1),
    (13, 2, 0), (14, 3, 1), (15, 1, 1), (16, 2, 0), (17, 1, 0),
    (18, 3, 0), (19, 2, 2), (20, 2, 1), (21, 1, 1), (22, 4, 1), (23, 1, 1),
    (24, 2, 0), (25, 3, 2), (26, 1, 0), (27, 0, 0), (28, 2, 1), (29, 3, 0),
    (30, 2, 0), (31, 1, 1), (32, 2, 1), (33, 1, 2), (34, 3, 1),
]

# Expulsiones diseñadas: jornada → key del jugador (roja directa)
REDS = {10: "zubia", 12: "sarria", 23: "lemos"}

# ── Lesiones: 8 historias ────────────────────────────────────────────────
# fechas ISO; fecha_alta None = sigue de baja a final de temporada
INJURIES = [
    {"player": "navarro", "tipo": "molestias", "titulo": "Sobrecarga en isquiotibiales",
     "fecha_inicio": "2025-09-16", "fecha_alta": "2025-09-21", "dias_estimados": 5,
     "descripcion": "Refiere tirantez en isquiotibiales del muslo izquierdo al finalizar la sesión de carga del martes. Sin chasquido ni dolor agudo.",
     "diagnostico": "Sobrecarga muscular en bíceps femoral izquierdo, sin rotura de fibras objetivable en la exploración. Test de elongación negativo.",
     "tratamiento": "Descarga 48 h, crioterapia, masoterapia descontracturante y trabajo excéntrico progresivo a partir del tercer día."},
    {"player": "ferrer", "tipo": "lesion", "titulo": "Rotura fibrilar en bíceps femoral",
     "fecha_inicio": "2025-10-12", "fecha_alta": "2025-11-02", "dias_estimados": 21,
     "descripcion": "Durante el partido de la J6 nota un pinchazo en un sprint de 40 metros. Se retira por su propio pie en el minuto 63.",
     "diagnostico": "Ecografía: rotura fibrilar grado II en bíceps femoral derecho, porción larga, de 1,8 cm. Hematoma intramuscular leve.",
     "tratamiento": "Protocolo en 4 fases: control del dolor (días 1-4), movilidad y activación (5-9), fuerza progresiva con énfasis excéntrico (10-16), reintroducción al grupo con GPS controlado (17-21). Readaptación con fisio diaria."},
    {"player": "zubia", "tipo": "lesion", "titulo": "Esguince de tobillo grado II",
     "fecha_inicio": "2025-11-16", "fecha_alta": "2025-12-14", "dias_estimados": 28,
     "descripcion": "Entrada rival en la J10 (mismo partido de su expulsión posterior revisada). Inversión forzada del tobillo derecho con inflamación inmediata.",
     "diagnostico": "Esguince grado II del ligamento lateral externo (fascículo peroneo-astragalino anterior) de tobillo derecho. Cajón anterior levemente positivo. Sin afectación ósea en radiografía.",
     "tratamiento": "Inmovilización funcional 10 días con tobillera semirrígida, carga progresiva, propiocepción desde el día 12, trabajo de campo individual desde el día 20."},
    {"player": "romero", "tipo": "lesion", "titulo": "Rotura del ligamento cruzado anterior",
     "fecha_inicio": "2026-01-18", "fecha_alta": None, "dias_estimados": 240,
     "descripcion": "Acción fortuita en la J18: apoyo con rotación de rodilla izquierda sin contacto. Sensación de fallo articular e inflamación inmediata. Retirado en camilla en el minuto 41.",
     "diagnostico": "RMN: rotura completa del ligamento cruzado anterior de rodilla izquierda, asociada a lesión del menisco interno (asa de cubo desplazada). Cirugía programada con plastia HTH el 2026-01-29.",
     "tratamiento": "Intervención quirúrgica (plastia hueso-tendón-hueso) + meniscectomía parcial. Protocolo postoperatorio de 8-9 meses: fases de movilidad, fuerza, carrera (mes 4), cambio de dirección (mes 6) y retorno progresivo. Objetivo de alta deportiva: inicio pretemporada 2026/27.",
     "medicacion": "Pauta analgésica y antiinflamatoria postoperatoria según protocolo del traumatólogo. Profilaxis antitrombótica 3 semanas."},
    {"player": "costas", "tipo": "lesion", "titulo": "Fractura del 5º metacarpiano",
     "fecha_inicio": "2026-02-03", "fecha_alta": "2026-03-10", "dias_estimados": 35,
     "descripcion": "Golpe contra el poste en una estirada durante el entrenamiento del martes. Dolor selectivo e impotencia funcional en mano derecha.",
     "diagnostico": "Radiografía: fractura no desplazada del quinto metacarpiano de la mano derecha (mano dominante).",
     "tratamiento": "Inmovilización con férula 3 semanas. Trabajo físico de campo sin balón durante la inmovilización. Readaptación específica de portero con guante adaptado las últimas 2 semanas."},
    {"player": "vidal", "tipo": "molestias", "titulo": "Sobrecarga de cuádriceps",
     "fecha_inicio": "2026-03-10", "fecha_alta": "2026-03-17", "dias_estimados": 7,
     "descripcion": "Acumulación de fatiga tras tres semanas con alta carga de minutos. Molestia difusa en recto anterior derecho, sin lesión estructural.",
     "diagnostico": "Sobrecarga del recto anterior derecho. Ecografía sin hallazgos de rotura.",
     "tratamiento": "Descarga relativa una semana: se retira de los dos partidos siguientes de forma preventiva. Fisioterapia diaria y control de carga en el retorno."},
    {"player": "lemos", "tipo": "lesion", "titulo": "Contusión ósea en rodilla",
     "fecha_inicio": "2026-04-07", "fecha_alta": "2026-04-17", "dias_estimados": 10,
     "descripcion": "Choque fortuito rodilla contra rodilla en la J29. Termina el partido pero amanece con derrame e impotencia.",
     "diagnostico": "Contusión ósea en cóndilo femoral externo de rodilla derecha con derrame articular leve. RMN descarta lesión ligamentosa y meniscal.",
     "tratamiento": "Reposo deportivo 5 días, crioterapia y drenaje. Reintroducción progresiva al grupo en la segunda semana."},
    {"player": "aranda", "tipo": "molestias", "titulo": "Pubalgia — gestión de cargas",
     "fecha_inicio": "2026-02-10", "fecha_alta": "2026-03-24", "dias_estimados": 42,
     "descripcion": "Dolor inguinal bilateral de instauración progresiva, mayor en aductor derecho. Compatible con groin pain de origen aductor. Se decide gestión conservadora sin baja completa.",
     "diagnostico": "Pubalgia de predominio aductor (entidad clínica de Doha: adductor-related groin pain). Sin hernia inguinal asociada.",
     "tratamiento": "Programa de fuerza específico (protocolo Copenhagen adaptado), control de minutos en partido (máximo 60'), retirada puntual de sesiones de carga alta. Evolución favorable: alta competitiva completa el 24/03."},
]

# ── Biblioteca de tareas (~36) ───────────────────────────────────────────
# (codigo_categoria, titulo, descripcion, duracion, jugadores_min, estructura, fase_uso)
# fase_uso: warmup | main | finish | calm
TASKS = [
    ("RND", "Rondo 6v2 dos toques", "Rondo de activación 6 contra 2 en espacio reducido. Los exteriores juegan a un máximo de dos toques; quien pierde el balón o falla el pase entra dentro.", 12, 8, "6vs2", "warmup"),
    ("RND", "Rondo posicional 8v3 con comodín", "Rondo posicional con tres recuperadores y un comodín interior. Se busca el pase interior que rompe líneas: cada pase entre dos defensores vale un punto.", 14, 12, "8vs3+1", "warmup"),
    ("MOV", "Movilidad articular + activación neuromuscular", "Circuito de movilidad de cadera, tobillo y columna torácica seguido de activación con minibandas: monster walks, puente de glúteo y zancadas con rotación.", 15, 10, None, "warmup"),
    ("MOV", "RAMP completo pre-sesión", "Protocolo RAMP: elevación de pulsaciones con carrera progresiva, movilidad dinámica, activación de core y glúteo y potenciación con aceleraciones cortas.", 18, 10, None, "warmup"),
    ("PRV", "Prevención: excéntricos de isquios + propiocepción", "Circuito preventivo: nórdicos asistidos, peso muerto unipodal con disco y trabajo propioceptivo sobre BOSU con perturbaciones del compañero.", 16, 10, None, "warmup"),
    ("PRV", "Protocolo Copenhagen de aductores", "Tres series progresivas de Copenhagen adduction en pareja, combinadas con plancha lateral y trabajo isométrico de aductor con balón.", 12, 10, None, "warmup"),
    ("POS", "Conservación 7v7+3 en doble cuadrado", "Posesión con tres comodines en dos cuadrados contiguos: diez pases en un cuadrado habilitan el cambio de orientación al otro, que vale doble.", 20, 17, "7vs7+3", "main"),
    ("POS", "Posesión 6v6 con porterías de paso", "Conservación con cuatro porterías pequeñas de paso: punto al conducir o pasar a través de cualquiera de ellas. Provoca fijar y cambiar de lado.", 18, 12, "6vs6", "main"),
    ("JDP", "Juego de posición 4v4+3 en tres pasillos", "Estructura de tres pasillos verticales: los comodines actúan por fuera y por dentro. Objetivo: encontrar al tercer hombre entre líneas tras atraer presión.", 22, 11, "4vs4+3", "main"),
    ("JDP", "Salida de balón 8v6 contra presión", "Salida desde portero contra seis presionadores. El equipo en salida busca superar dos líneas y consolidar en campo rival; el que presiona puntúa robando y finalizando rápido.", 22, 15, "8vs6", "main"),
    ("SSG", "Fútbol reducido 5v5 a doble área", "Juego reducido de alta intensidad con porterías y porteros. Series de 4 minutos con pausas completas. Marcador real y competición por equipos estables del microciclo.", 24, 12, "5vs5", "main"),
    ("SSG", "4v4 + porteros con norma de presión tras pérdida", "Tras pérdida, obligación de presionar cinco segundos antes de replegar: gol robado en campo rival vale doble. Densidad alta.", 20, 10, "4vs4", "main"),
    ("PCO", "Partido condicionado: gol tras centro", "Partido en campo completo reducido donde solo vale el gol nacido de centro lateral o segunda jugada de centro. Potencia amplitud y llegada al área.", 25, 18, "9vs9", "main"),
    ("PCO", "Partido condicionado: tres alturas de presión", "El entrenador alterna con señales la altura de presión (alta, media, baja). El equipo debe reconocer y ajustar los comportamientos colectivos sin parar el juego.", 28, 18, "10vs10", "main"),
    ("AVD", "Ataque 8 contra defensa 6 + transición", "Ocho atacantes contra seis defensores y portero. Si la defensa roba, transita a dos miniporterías en menos de ocho segundos.", 22, 15, "8vs6", "main"),
    ("AVD", "Defensa del área 6v8 con centros", "Trabajo defensivo específico: seis defensores protegen el área contra ocho atacantes con centros alternos de ambas bandas. Énfasis en marcas, despejes orientados y segunda jugada.", 18, 15, "6vs8", "main"),
    ("ACO", "Acciones combinadas con finalización", "Circuito de combinaciones ensayadas: pared con el mediapunta, desdoblamiento del lateral y centro atrás. Dos grupos simultáneos, finalización constante.", 18, 14, None, "main"),
    ("ACO", "Tercer hombre y finalización en zona 14", "Secuencia ensayada: pivote fija, interior aparece como tercer hombre y filtra al desmarque del punta. Repeticiones por ambos perfiles.", 16, 12, None, "main"),
    ("EVO", "Oleadas 3v2 + 2v1 continuas", "Evoluciones de superioridad ofensiva encadenadas: el que defiende la primera oleada ataca la siguiente. Ritmo máximo de ejecución y toma de decisiones.", 16, 12, None, "main"),
    ("EVO", "Oleadas de transición 4v3 a campo abierto", "Transiciones largas tras recuperación simulada: cuatro atacan contra tres replegando en 40 metros. Finalización obligatoria en menos de diez segundos.", 18, 14, None, "main"),
    ("ABP", "Córners ofensivos: tres rutinas", "Ensayo de las tres rutinas de córner ofensivo del equipo: primer palo con bloqueo, segundo palo en zona y córner en corto con 2v1. Repetición y ajuste de roles.", 20, 18, None, "main"),
    ("ABP", "Faltas laterales y defensa de córner", "Primera parte: lanzamientos laterales con movimientos de ruptura ensayados. Segunda parte: defensa zonal-mixta de córner con salidas agresivas del portero.", 20, 18, None, "main"),
    ("ABP", "Penaltis y faltas frontales", "Competición de lanzamiento: ronda de penaltis con presión (eliminatoria) y faltas frontales sobre barrera con portero. Registro de efectividad por lanzador.", 14, 10, None, "finish"),
    ("GYM", "Fuerza básica: tren inferior", "Sesión de gimnasio: sentadilla trasera 4x6 al 75%, hip thrust 4x8, zancada búlgara 3x8 por pierna y core antirrotacional.", 35, 8, None, "main"),
    ("GYM", "Fuerza-potencia con contrastes", "Método de contrastes: media sentadilla pesada seguida de salto CMJ y sprint de 10 metros. Cuatro bloques con recuperación completa.", 30, 8, None, "main"),
    ("POR", "Específico porteros: blocajes y pies", "Sesión específica de porteros: blocajes laterales en series, desvíos a una mano y participación en salida de balón con pase tenso interior.", 25, 2, None, "main"),
    ("POR", "Porteros: uno contra uno y centros", "Trabajo de achique en mano a mano y dominio del área en centros laterales con oposición. Finaliza integrado en la tarea de centros del grupo.", 20, 2, None, "main"),
    ("SSG", "Fútbol-tenis por equipos", "Competición lúdica de fútbol-tenis en grupos de tres. Activa sin carga y refuerza la cohesión del vestuario en días MD-1.", 15, 9, "3vs3", "finish"),
    ("ACO", "Circuito de finalización rápida", "Finalizaciones desde tres estaciones: borde del área tras pared, remate de centro y vaselina tras pase filtrado. Competición individual de aciertos.", 15, 12, None, "finish"),
    ("EVO", "Velocidad de reacción y duelos 1v1", "Salidas de velocidad desde distintas posiciones con estímulo visual, acabadas en duelo 1v1 con finalización en miniportería.", 14, 10, None, "finish"),
    ("RCF", "Recuperación activa post-partido", "Carrera continua suave 12 minutos, movilidad general, foam roller por grupos musculares y estiramientos asistidos en parejas.", 30, 10, None, "calm"),
    ("RCF", "Vuelta a la calma + estiramientos", "Trote regenerativo, respiración diafragmática y rutina completa de estiramientos pasivos de cadena posterior, cuádriceps y aductores.", 12, 10, None, "calm"),
    ("RCF", "Contrastes y movilidad regenerativa", "Trabajo regenerativo en grupos: contrastes de temperatura, movilidad suave de cadera y tobillo y caminata técnica descalzos.", 20, 10, None, "calm"),
    ("RND", "Rondo lúdico de activación 5v2", "Rondo clásico de calentamiento a ritmo lúdico. Toque libre los primeros tres minutos, después dos toques. Quien la pierde, entra.", 10, 7, "5vs2", "warmup"),
    ("POS", "Conservación 10v10 + porteros a tres zonas", "Posesión estructurada en tres zonas transversales: obligación de progresar zona a zona; valdrá gol solo tras consolidar en zona final.", 24, 20, "10vs10", "main"),
    ("JDP", "Juego de posición 9v9+3 con cambio de orientación", "Estructura posicional completa con tres comodines. Punto extra por cambio de orientación que supere ocho jugadores rivales tras fijar en un lado.", 24, 21, "9vs9+3", "main"),
]

# ── Plantillas de microciclo y crónicas ──────────────────────────────────
MICROCYCLE_OBJECTIVES = [
    ("Consolidar la salida de balón contra presión alta", "Atraer para encontrar al tercer hombre", "Fuerza estructural + velocidad"),
    ("Mejorar la finalización tras juego por banda", "Amplitud, desdoblamientos y llegada al área", "Resistencia específica en juego reducido"),
    ("Ajustar el bloque medio y el salto de presión", "Activadores del pressing: pase atrás y control orientado malo", "Potencia aeróbica intermitente"),
    ("Dominar las transiciones tras pérdida", "Contrapresión de cinco segundos", "Velocidad de reacción y aceleraciones"),
    ("Preparar el plan de partido específico del rival", "Explotar la debilidad detectada en el informe de scouting", "Frescura: gestión de la carga semanal"),
    ("Reforzar el balón parado ofensivo y defensivo", "Rutinas de córner y vigilancias", "Fuerza-potencia con contrastes"),
]

CRONICAS_WIN = [
    "Victoria sólida construida desde la presión tras pérdida. El plan de partido funcionó: {rival} apenas generó en estático y el gol llegó por la vía trabajada en la semana.",
    "Partido serio y maduro. Dominio territorial desde el primer minuto, paciencia para mover el bloque rival y eficacia en las áreas. Tres puntos muy trabajados ante {rival}.",
    "Gran segunda parte. Tras un inicio igualado, los ajustes al descanso nos dieron el control del mediocampo y el partido se decantó. Mención para el trabajo defensivo del equipo ante {rival}.",
]
CRONICAS_DRAW = [
    "Reparto de puntos ante {rival}. Faltó precisión en el último tercio: generamos suficiente para más, pero el acierto no acompañó. Buen comportamiento estructural del equipo.",
    "Empate con sabor agridulce contra {rival}. El rival cerró bien los espacios interiores y nos obligó a un juego más directo de lo planificado.",
]
CRONICAS_LOSS = [
    "Derrota dolorosa ante {rival}. El partido se rompió en una transición evitable y remar a contracorriente fuera de casa tuvo un coste alto. Hay aprendizajes claros para la semana.",
    "Día gris. {rival} fue más efectivo en las áreas y nosotros estuvimos por debajo de nuestro nivel de juego. Toca corregir, recuperar y pasar página rápido.",
]
