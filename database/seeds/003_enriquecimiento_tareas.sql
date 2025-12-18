-- ============================================================================
-- TRAININGHUB PRO - ENRIQUECIMIENTO PROFESIONAL DE TAREAS
-- ============================================================================
-- Este script añade datos profesionales a todas las tareas existentes:
-- - Objetivos físicos y psicológicos
-- - Reglas técnicas, tácticas y psicológicas
-- - Consignas ofensivas y defensivas
-- - Errores comunes
-- - Variantes, progresiones y regresiones
-- - Material necesario
-- - Descripción de inicio y finalización
-- ============================================================================

-- ============================================================================
-- RONDOS (RND) - 18 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, cambios de dirección',
    objetivo_psicologico = 'Concentración bajo presión, comunicación',
    reglas_tecnicas = '["Máximo 2 toques", "Pase a ras de suelo", "Control orientado obligatorio"]',
    reglas_tacticas = '["Presión en parejas", "No repetir pase al mismo compañero", "Mantener estructura"]',
    reglas_psicologicas = '["Quien pierde el balón entra a defender", "Sistema de puntos competitivo"]',
    consignas_ofensivas = '["Orientar el cuerpo antes de recibir", "Buscar el pase al pie alejado del defensor", "Comunicar con voz: ¡Solo! ¡Tiempo!"]',
    consignas_defensivas = '["Presionar en pareja coordinada", "Cerrar líneas de pase interiores", "Condicionar hacia un lado"]',
    errores_comunes = '["Quedarse estático tras el pase", "Pase telegráfico", "Recibir de espaldas a la presión"]',
    variantes = '[{"nombre": "1 toque obligatorio", "descripcion": "Aumenta velocidad mental", "dificultad": "+1"}, {"nombre": "6v3", "descripcion": "Mayor presión defensiva", "dificultad": "+1"}, {"nombre": "Comodín central", "descripcion": "Añade un jugador libre en el centro", "dificultad": "-1"}]',
    progresiones = '["5v3 libre → 5v3 2 toques → 5v3 1 toque", "Añadir tiempo límite por posesión", "Reducir espacio a 12x12"]',
    regresiones = '["Aumentar espacio a 16x16", "Permitir 3 toques", "Reducir a 5v2"]',
    material = '["Petos 2 colores (5+3)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Entrenador pasa balón al equipo poseedor desde fuera',
    como_finaliza = 'Robo de balón, balón fuera del cuadrado, o tras 10 pases consecutivos'
WHERE codigo = 'RND-004';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, capacidad aeróbica',
    objetivo_psicologico = 'Visión periférica, toma de decisiones rápidas',
    reglas_tecnicas = '["2 toques máximo", "Pase firme a ras de suelo", "Recepción orientada"]',
    reglas_tacticas = '["Cambio de campo obligatorio cada 5 pases", "No más de 3 pases seguidos en un cuadrado"]',
    reglas_psicologicas = '["Competición entre cuadrados", "Contar pases en voz alta"]',
    consignas_ofensivas = '["Levantar la cabeza para ver el otro campo", "Anticipar el cambio de orientación", "Apoyos constantes"]',
    consignas_defensivas = '["Cerrar líneas de cambio", "Presión tras pérdida inmediata", "Comunicar cambios"]',
    errores_comunes = '["No mirar al otro cuadrado", "Pases flojos en el cambio", "Quedarse en el mismo lado"]',
    variantes = '[{"nombre": "1 toque en cambio", "descripcion": "El pase de cambio debe ser a 1 toque", "dificultad": "+1"}, {"nombre": "3 cuadrados", "descripcion": "Añadir un tercer cuadrado", "dificultad": "+1"}]',
    progresiones = '["Reducir a 4 pases para cambiar", "Añadir límite de tiempo", "1 toque obligatorio"]',
    regresiones = '["Aumentar a 7 pases para cambiar", "Permitir 3 toques", "Agrandar cuadrados"]',
    material = '["Petos 3 colores (4+4+4)", "Conos delimitadores x8", "Balones x8"]',
    como_inicia = 'Entrenador pasa a uno de los dos cuadrados',
    como_finaliza = 'Tras 3 cambios de campo exitosos o robo de balón'
WHERE codigo = 'RND-005';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica de baja-media intensidad',
    objetivo_psicologico = 'Paciencia en posesión, control emocional',
    reglas_tecnicas = '["Máximo 2 toques", "Pase tenso", "Control con pierna alejada"]',
    reglas_tacticas = '["Usar toda la amplitud", "No precipitarse", "Buscar superioridad"]',
    reglas_psicologicas = '["Mantener la calma bajo presión", "Celebrar series largas"]',
    consignas_ofensivas = '["Ocupar bien los espacios", "Ofrecer siempre línea de pase", "Paciencia, no precipitarse"]',
    consignas_defensivas = '["Coordinación de pressing", "No ir los dos al balón", "Cerrar espacios interiores"]',
    errores_comunes = '["Precipitarse con el pase", "No usar la amplitud", "Defensores sin coordinación"]',
    variantes = '[{"nombre": "7v2", "descripcion": "Mayor superioridad", "dificultad": "-1"}, {"nombre": "6v2 1 toque", "descripcion": "Solo 1 toque permitido", "dificultad": "+1"}]',
    progresiones = '["Reducir toques a 1", "Añadir objetivo de pases", "Reducir espacio"]',
    regresiones = '["Permitir 3 toques", "Agrandar espacio", "Pasar a 7v2"]',
    material = '["Petos 2 colores (6+2)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 6 desde el entrenador',
    como_finaliza = 'Robo de balón o 15 pases consecutivos'
WHERE codigo = 'RND-006';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de reacción, potencia anaeróbica',
    objetivo_psicologico = 'Velocidad mental, anticipación',
    reglas_tecnicas = '["1 toque obligatorio", "Pase firme y raso", "Perfilarse antes de recibir"]',
    reglas_tacticas = '["Triangulaciones rápidas", "No dar pase atrás", "Movilidad constante"]',
    reglas_psicologicas = '["Alta exigencia mental", "Competición individual"]',
    consignas_ofensivas = '["Pensar antes de recibir", "Cuerpo siempre orientado", "Velocidad en la decisión"]',
    consignas_defensivas = '["Presión agresiva al balón", "Anticipar líneas de pase", "Recuperación explosiva"]',
    errores_comunes = '["Recibir sin orientación", "Pensar después de recibir", "Pase lento"]',
    variantes = '[{"nombre": "4v1", "descripcion": "Añadir un jugador", "dificultad": "-1"}, {"nombre": "3v1 en movimiento", "descripcion": "Cuadrado móvil", "dificultad": "+1"}]',
    progresiones = '["Reducir espacio a 6x6", "Añadir segundo defensor tras 5 pases", "Tiempo límite 30s"]',
    regresiones = '["Permitir 2 toques en primera recepción", "Agrandar espacio", "Defensor pasivo"]',
    material = '["Petos 2 colores (3+1)", "Conos delimitadores x4", "Balones x4"]',
    como_inicia = 'Pase del entrenador al grupo de 3',
    como_finaliza = 'Robo, balón fuera, o 8 pases seguidos'
WHERE codigo = 'RND-007';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, transiciones físicas',
    objetivo_psicologico = 'Reacción al cambio, adaptabilidad',
    reglas_tecnicas = '["2 toques máximo", "Control orientado", "Pase al hueco"]',
    reglas_tacticas = '["Transición inmediata al robo", "Comodines siempre con posesión", "Buscar profundidad en transición"]',
    reglas_psicologicas = '["Mentalidad de transición", "Agresividad en el robo"]',
    consignas_ofensivas = '["Usar comodines para descansar", "Buscar hombre libre", "Amplitud con profundidad"]',
    consignas_defensivas = '["Presión inmediata tras pérdida", "Cerrar espacios al comodín", "Repliegue rápido"]',
    errores_comunes = '["No reaccionar a la pérdida", "Comodines estáticos", "Transición lenta"]',
    variantes = '[{"nombre": "5v5+2", "descripcion": "Más jugadores", "dificultad": "0"}, {"nombre": "Gol en transición", "descripcion": "Porterías para finalizar transición", "dificultad": "+1"}]',
    progresiones = '["Añadir porterías", "Reducir comodines a 1", "1 toque obligatorio"]',
    regresiones = '["Añadir tercer comodín", "Permitir 3 toques", "Agrandar espacio"]',
    material = '["Petos 3 colores (4+4+2)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón al equipo con comodines desde el entrenador',
    como_finaliza = 'Gol, 10 pases, o transición completada'
WHERE codigo = 'RND-008';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, recuperación activa',
    objetivo_psicologico = 'Concentración sostenida, gestión del esfuerzo',
    reglas_tecnicas = '["2 toques máximo", "Pase al pie", "Control con interior"]',
    reglas_tacticas = '["Rotación automática al robo", "Mantener estructura", "Circulación fluida"]',
    reglas_psicologicas = '["Aceptar el error", "Mantener intensidad constante"]',
    consignas_ofensivas = '["Apoyos permanentes", "Comunicación constante", "Paciencia en circulación"]',
    consignas_defensivas = '["Pressing coordinado", "Rotación inmediata", "No rendirse en la presión"]',
    errores_comunes = '["Rotación lenta", "Perder intensidad", "Falta de comunicación"]',
    variantes = '[{"nombre": "6v2", "descripcion": "Añadir un jugador", "dificultad": "-1"}, {"nombre": "5v2 direccional", "descripcion": "Con objetivo de pase", "dificultad": "+1"}]',
    progresiones = '["Reducir a 1 toque", "Rotación cada 20 segundos", "Reducir espacio"]',
    regresiones = '["Permitir 3 toques", "Agrandar espacio", "Rotación cada 45 segundos"]',
    material = '["Petos 2 colores (5+2)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 5 desde el entrenador',
    como_finaliza = 'Robo de balón o tiempo de serie'
WHERE codigo = 'RND-009';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, cambios de ritmo',
    objetivo_psicologico = 'Visión de juego, anticipación',
    reglas_tecnicas = '["2 toques máximo", "Pase firme", "Control orientado al comodín"]',
    reglas_tacticas = '["Objetivo: pasar al comodín opuesto", "Progresión obligatoria", "Usar el ancho"]',
    reglas_psicologicas = '["Buscar la progresión", "Paciencia táctica"]',
    consignas_ofensivas = '["Mirar siempre al comodín objetivo", "Crear líneas de pase", "Fijar para soltar"]',
    consignas_defensivas = '["Cerrar línea al comodín", "Pressing en embudo", "Anticipar el pase largo"]',
    errores_comunes = '["No mirar al objetivo", "Precipitarse", "Pase sin intención"]',
    variantes = '[{"nombre": "5v2+2", "descripcion": "Dos comodines por lado", "dificultad": "-1"}, {"nombre": "4v3+1", "descripcion": "Aumentar defensores", "dificultad": "+1"}]',
    progresiones = '["Reducir a 1 toque", "Limitar tiempo de posesión", "Reducir espacio"]',
    regresiones = '["Permitir 3 toques", "Agrandar espacio", "Añadir comodín central"]',
    material = '["Petos 3 colores (4+2+1)", "Conos delimitadores x6", "Balones x6"]',
    como_inicia = 'Balón al equipo de 4 desde el entrenador',
    como_finaliza = 'Pase exitoso al comodín opuesto = punto'
WHERE codigo = 'RND-010';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, capacidad de recuperación',
    objetivo_psicologico = 'Competitividad, gestión de la presión',
    reglas_tecnicas = '["2 toques máximo", "Pase tenso", "Primera orientada"]',
    reglas_tacticas = '["Sistema de puntos: 10 pases = 1 punto", "Pressing coordinado en triángulo"]',
    reglas_psicologicas = '["Competición por puntos", "Celebrar logros del equipo"]',
    consignas_ofensivas = '["Contar pases en voz alta", "Buscar ritmo alto", "Apoyos constantes"]',
    consignas_defensivas = '["Pressing en triángulo", "Cerrar líneas de pase", "Comunicar la presión"]',
    errores_comunes = '["Perder la cuenta de pases", "Pressing descoordinado", "Bajar intensidad"]',
    variantes = '[{"nombre": "6v3 con zonas", "descripcion": "Dividir en zonas", "dificultad": "+1"}, {"nombre": "7v3", "descripcion": "Mayor superioridad", "dificultad": "-1"}]',
    progresiones = '["8 pases = punto", "Reducir espacio", "1 toque obligatorio"]',
    regresiones = '["12 pases = punto", "Agrandar espacio", "Permitir 3 toques"]',
    material = '["Petos 2 colores (6+3)", "Conos delimitadores x4", "Balones x6", "Marcador visible"]',
    como_inicia = 'Balón al equipo de 6 desde el entrenador',
    como_finaliza = 'Tiempo de serie o primer equipo en llegar a X puntos'
WHERE codigo = 'RND-011';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de reacción, transiciones físicas',
    objetivo_psicologico = 'Adaptabilidad, mentalidad de transición',
    reglas_tecnicas = '["2 toques máximo", "Pase rápido", "Control orientado"]',
    reglas_tacticas = '["Cambio de rol inmediato al robo", "Transición mental rápida"]',
    reglas_psicologicas = '["Aceptar el cambio de rol", "Intensidad constante"]',
    consignas_ofensivas = '["Reaccionar al robo", "Buscar superioridad inmediata", "Amplitud rápida"]',
    consignas_defensivas = '["Transición inmediata al perder", "Presión agresiva", "No lamentarse"]',
    errores_comunes = '["Reacción lenta al cambio", "Seguir en rol anterior", "Bajar intensidad tras pérdida"]',
    variantes = '[{"nombre": "5v2 cambio color", "descripcion": "Más jugadores", "dificultad": "0"}, {"nombre": "Con porterías", "descripcion": "Finalizar tras robo", "dificultad": "+1"}]',
    progresiones = '["Añadir porterías", "1 toque obligatorio", "Reducir espacio"]',
    regresiones = '["Permitir 3 segundos de transición", "Agrandar espacio", "3 toques permitidos"]',
    material = '["Petos 2 colores intercambiables (4+2)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 4 desde el entrenador',
    como_finaliza = 'Tiempo de serie con conteo de robos por equipo'
WHERE codigo = 'RND-012';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, recuperación entre esfuerzos',
    objetivo_psicologico = 'Cooperación, comunicación entre equipos',
    reglas_tecnicas = '["2 toques máximo", "Pase a ras de suelo", "Control con el interior"]',
    reglas_tacticas = '["Dos equipos atacan vs uno defiende", "Rotación al perder 3 balones"]',
    reglas_psicologicas = '["Colaboración entre equipos atacantes", "Gestión de la frustración defensiva"]',
    consignas_ofensivas = '["Usar la superioridad", "Cambiar el juego", "Apoyos triangulares"]',
    consignas_defensivas = '["Pressing inteligente", "Recuperación activa", "No desesperarse"]',
    errores_comunes = '["No aprovechar superioridad", "Pressing individual", "Perder la calma defendiendo"]',
    variantes = '[{"nombre": "4v4+4", "descripcion": "Más jugadores por equipo", "dificultad": "0"}, {"nombre": "Rotación por tiempo", "descripcion": "Cambio cada 2 minutos", "dificultad": "0"}]',
    progresiones = '["Reducir a 1 toque", "2 pérdidas para rotar", "Reducir espacio"]',
    regresiones = '["4 pérdidas para rotar", "Permitir 3 toques", "Agrandar espacio"]',
    material = '["Petos 3 colores (3+3+3)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón a uno de los equipos atacantes',
    como_finaliza = 'Rotación tras pérdidas o tiempo establecido'
WHERE codigo = 'RND-013';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, gestión del esfuerzo',
    objetivo_psicologico = 'Competitividad, gestión de la fatiga mental',
    reglas_tecnicas = '["2 toques máximo", "Pase firme", "Control orientado"]',
    reglas_tacticas = '["Relevo de defensores cada 30 segundos", "Mantener intensidad de pressing"]',
    reglas_psicologicas = '["Máxima intensidad en turno de pressing", "Recuperación activa fuera"]',
    consignas_ofensivas = '["Aprovechar fatiga defensiva", "Circulación rápida", "Buscar errores"]',
    consignas_defensivas = '["Máxima intensidad 30 segundos", "Pressing agresivo", "No guardar energía"]',
    errores_comunes = '["Bajar intensidad antes del relevo", "Pressing pasivo", "No aprovechar relevos"]',
    variantes = '[{"nombre": "Relevo cada 20s", "descripcion": "Mayor rotación", "dificultad": "+1"}, {"nombre": "Relevo cada 45s", "descripcion": "Menor rotación", "dificultad": "-1"}]',
    progresiones = '["Relevo cada 20 segundos", "Añadir defensor", "Reducir espacio"]',
    regresiones = '["Relevo cada 45 segundos", "Quitar defensor", "Agrandar espacio"]',
    material = '["Petos 2 colores (5+4)", "Conos delimitadores x4", "Balones x6", "Cronómetro visible"]',
    como_inicia = 'Balón al equipo de 5 desde el entrenador',
    como_finaliza = 'Tiempo total de serie con rotaciones'
WHERE codigo = 'RND-014';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, cambios de orientación',
    objetivo_psicologico = 'Visión periférica, anticipación del cambio',
    reglas_tecnicas = '["2 toques por cuadrado", "Pase de cambio firme", "Control orientado al otro cuadrado"]',
    reglas_tacticas = '["Pase obligatorio al otro cuadrado cada 4 toques", "Defender solo en tu cuadrado"]',
    reglas_psicologicas = '["Anticipar el cambio", "Comunicación entre cuadrados"]',
    consignas_ofensivas = '["Mirar siempre al otro cuadrado", "Preparar el cambio", "Pase firme en el cambio"]',
    consignas_defensivas = '["Cerrar línea de cambio", "Anticipar el pase largo", "Presión intensa en tu zona"]',
    errores_comunes = '["No mirar al otro cuadrado", "Pase de cambio flojo", "Defender en zona contraria"]',
    variantes = '[{"nombre": "3 cuadrados", "descripcion": "Añadir tercer cuadrado", "dificultad": "+1"}, {"nombre": "Cambio cada 3", "descripcion": "Reducir pases para cambio", "dificultad": "+1"}]',
    progresiones = '["Cambio cada 3 pases", "1 toque en cambio", "Reducir espacio"]',
    regresiones = '["Cambio cada 6 pases", "Sin limitación de toques en cambio", "Agrandar cuadrados"]',
    material = '["Petos 2 colores (4+2)", "Conos delimitadores x8", "Balones x6"]',
    como_inicia = 'Balón a un cuadrado desde el entrenador',
    como_finaliza = 'Robo de balón o número de cambios exitosos'
WHERE codigo = 'RND-015';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica de grupo grande',
    objetivo_psicologico = 'Comunicación en grupo grande, liderazgo',
    reglas_tecnicas = '["2 toques máximo", "Pase al suelo", "Control con pierna alejada"]',
    reglas_tacticas = '["Usar toda la amplitud", "Circulación por todo el perímetro", "Cambios de orientación"]',
    reglas_psicologicas = '["Comunicación clara", "Liderazgo en la organización"]',
    consignas_ofensivas = '["Usar todo el espacio", "No agruparse", "Comunicar movimientos"]',
    consignas_defensivas = '["Dividir el espacio", "Pressing coordinado", "Cerrar líneas de pase"]',
    errores_comunes = '["Agruparse en una zona", "Pases cortos repetitivos", "Falta de comunicación"]',
    variantes = '[{"nombre": "9v4", "descripcion": "Añadir un jugador", "dificultad": "0"}, {"nombre": "8v4 con zonas", "descripcion": "Dividir en zonas", "dificultad": "+1"}]',
    progresiones = '["Reducir a 1 toque", "Añadir zonas obligatorias", "Reducir espacio"]',
    regresiones = '["Permitir 3 toques", "Agrandar espacio", "Reducir a 3 defensores"]',
    material = '["Petos 2 colores (8+4)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón al equipo de 8 desde el entrenador',
    como_finaliza = 'Robo de balón o 15 pases consecutivos'
WHERE codigo = 'RND-016';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de reacción, potencia',
    objetivo_psicologico = 'Concentración, reacción al estímulo',
    reglas_tecnicas = '["2 toques máximo", "Pase rápido", "Primera orientada"]',
    reglas_tacticas = '["Defensores de espaldas hasta primer pase", "Reacción al estímulo"]',
    reglas_psicologicas = '["Concentración máxima", "Reacción explosiva"]',
    consignas_ofensivas = '["Primer pase rápido", "Aprovechar desventaja defensiva", "Circulación veloz"]',
    consignas_defensivas = '["Reacción explosiva al girar", "Orientarse rápido", "Presión inmediata"]',
    errores_comunes = '["Primer pase lento", "No aprovechar ventaja inicial", "Reacción lenta del defensor"]',
    variantes = '[{"nombre": "5v2 espaldas", "descripcion": "Añadir jugador", "dificultad": "-1"}, {"nombre": "4v2 doble estímulo", "descripcion": "Girar con señal visual y auditiva", "dificultad": "+1"}]',
    progresiones = '["1 toque obligatorio", "Reducir espacio", "Añadir segundo defensor"]',
    regresiones = '["Permitir 3 toques", "Agrandar espacio", "Defensor de frente"]',
    material = '["Petos 2 colores (4+2)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Entrenador da señal, defensores giran y balón entra en juego',
    como_finaliza = 'Robo de balón o 8 pases consecutivos'
WHERE codigo = 'RND-017';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, movilidad articular',
    objetivo_psicologico = 'Disciplina posicional, paciencia',
    reglas_tecnicas = '["2 toques máximo", "Pase al pie", "Control orientado a siguiente posición"]',
    reglas_tacticas = '["Posiciones fijas en hexágono", "Movimiento solo dentro de tu zona", "Pase al adyacente"]',
    reglas_psicologicas = '["Disciplina posicional", "Paciencia en circulación"]',
    consignas_ofensivas = '["Respetar posiciones", "Orientar hacia siguiente estación", "Comunicación de recepción"]',
    consignas_defensivas = '["Cerrar líneas directas", "Pressing por el interior", "Coordinación de movimientos"]',
    errores_comunes = '["Salir de la posición", "Pase al no adyacente", "Perder la estructura"]',
    variantes = '[{"nombre": "Hexágono móvil", "descripcion": "Posiciones rotativas", "dificultad": "+1"}, {"nombre": "7v2", "descripcion": "Añadir centro", "dificultad": "-1"}]',
    progresiones = '["1 toque obligatorio", "Añadir posición central", "Rotación de posiciones"]',
    regresiones = '["Permitir 3 toques", "Reducir a 5 posiciones", "Quitar defensor"]',
    material = '["Petos 2 colores (6+2)", "Conos delimitadores x6 (hexágono)", "Balones x6"]',
    como_inicia = 'Balón a una de las posiciones del hexágono',
    como_finaliza = 'Robo de balón o vuelta completa al hexágono'
WHERE codigo = 'RND-018';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, cambios de dirección',
    objetivo_psicologico = 'Comprensión zonal, toma de decisiones',
    reglas_tecnicas = '["2 toques máximo", "Pase firme entre zonas", "Control orientado a zona siguiente"]',
    reglas_tacticas = '["Mínimo 2 pases por zona antes de cambiar", "Progresión por zonas"]',
    reglas_psicologicas = '["Paciencia para cumplir regla", "Concentración en conteo"]',
    consignas_ofensivas = '["Contar pases por zona", "Buscar progresión", "Usar amplitud de cada zona"]',
    consignas_defensivas = '["Presionar según zona", "Cerrar líneas de progresión", "Coordinación zonal"]',
    errores_comunes = '["No cumplir mínimo de pases", "Saltarse zonas", "Perder cuenta de pases"]',
    variantes = '[{"nombre": "3 pases por zona", "descripcion": "Aumentar requisito", "dificultad": "+1"}, {"nombre": "1 pase por zona", "descripcion": "Reducir requisito", "dificultad": "-1"}]',
    progresiones = '["3 pases mínimo por zona", "1 toque obligatorio", "Reducir espacio de zonas"]',
    regresiones = '["1 pase mínimo por zona", "Permitir 3 toques", "Agrandar zonas"]',
    material = '["Petos 2 colores (5+3)", "Conos delimitadores x6 (3 zonas)", "Balones x6"]',
    como_inicia = 'Balón en primera zona desde el entrenador',
    como_finaliza = 'Llegada a tercera zona o robo de balón'
WHERE codigo = 'RND-019';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, gestión de esfuerzo',
    objetivo_psicologico = 'Competitividad en pressing, trabajo en equipo',
    reglas_tecnicas = '["2 toques máximo", "Pase tenso", "Control rápido"]',
    reglas_tacticas = '["Relevo de defensores externos", "Pressing intenso con relevos", "Mantener estructura"]',
    reglas_psicologicas = '["Máxima intensidad en turno activo", "Apoyo al compañero"]',
    consignas_ofensivas = '["Aprovechar cansancio defensivo", "Circulación para provocar relevo", "Buscar errores"]',
    consignas_defensivas = '["30 segundos de máxima intensidad", "Comunicar el relevo", "Entrar fresco al relevo"]',
    errores_comunes = '["No mantener intensidad", "Relevo descoordinado", "Entrar pasivo al campo"]',
    variantes = '[{"nombre": "Relevo cada 20s", "descripcion": "Mayor frecuencia", "dificultad": "+1"}, {"nombre": "4v2 sin relevos", "descripcion": "Sin sistema de relevos", "dificultad": "-1"}]',
    progresiones = '["Relevo cada 20 segundos", "Añadir tercer defensor activo", "Reducir espacio"]',
    regresiones = '["Relevo cada 45 segundos", "Solo 1 defensor activo", "Agrandar espacio"]',
    material = '["Petos 2 colores (4+4)", "Conos delimitadores x4", "Balones x6", "Cronómetro"]',
    como_inicia = 'Balón al equipo de 4 poseedores',
    como_finaliza = 'Tiempo de serie con conteo de robos'
WHERE codigo = 'RND-020';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, amplitud funcional',
    objetivo_psicologico = 'Uso del hombre libre, paciencia',
    reglas_tecnicas = '["2 toques máximo", "Pase al comodín firme", "Control orientado"]',
    reglas_tacticas = '["Comodines siempre con posesión", "Usar bandas para descanso", "Amplitud obligatoria"]',
    reglas_psicologicas = '["Buscar apoyo en comodines", "No precipitarse al centro"]',
    consignas_ofensivas = '["Usar comodines para cambiar juego", "Amplitud máxima", "Apoyos en diagonal"]',
    consignas_defensivas = '["No salir a comodines", "Cerrar espacios interiores", "Pressing inteligente"]',
    errores_comunes = '["No usar comodines", "Juego solo por el centro", "Comodines estáticos"]',
    variantes = '[{"nombre": "3v3+4", "descripcion": "Añadir comodines", "dificultad": "-1"}, {"nombre": "4v4+2", "descripcion": "Reducir comodines", "dificultad": "+1"}]',
    progresiones = '["1 toque para comodines", "Comodines móviles", "Reducir espacio"]',
    regresiones = '["Comodines con 3 toques", "Añadir comodines", "Agrandar espacio"]',
    material = '["Petos 3 colores (3+3+2)", "Conos delimitadores x6", "Balones x6"]',
    como_inicia = 'Balón a uno de los equipos centrales',
    como_finaliza = 'Robo de balón o 12 pases consecutivos'
WHERE codigo = 'RND-021';

-- ============================================================================
-- JUEGO DE POSICIÓN (JDP) - 15 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica de baja intensidad',
    objetivo_psicologico = 'Comprensión del modelo de juego, paciencia',
    reglas_tecnicas = '["Máximo 2 toques en zona defensiva", "3 toques permitidos en presión", "Pase al suelo obligatorio"]',
    reglas_tacticas = '["Salida por centrales", "Pivote como opción de descarga", "Laterales en amplitud"]',
    reglas_psicologicas = '["Calma bajo presión", "Confianza en el sistema"]',
    consignas_ofensivas = '["Portero como jugador+", "Ofrecer siempre línea de pase", "Escalonamiento correcto"]',
    consignas_defensivas = '["Pressing en bloque", "Cerrar línea al pivote", "No perseguir balón individualmente"]',
    errores_comunes = '["Pase largo precipitado", "No usar al portero", "Laterales pegados a la línea"]',
    variantes = '[{"nombre": "7+POR vs 5", "descripcion": "Aumentar pressing", "dificultad": "+1"}, {"nombre": "6+POR vs 3", "descripcion": "Reducir pressing", "dificultad": "-1"}]',
    progresiones = '["Añadir presión a 5 jugadores", "Limitar toques a 2", "Reducir tiempo de posesión"]',
    regresiones = '["Reducir presión a 3", "Permitir 3 toques", "Ampliar zona de salida"]',
    material = '["Petos 2 colores (6+4)", "Conos para delimitar zonas x8", "Balones x6", "Portería reglamentaria x1"]',
    como_inicia = 'Saque de portero o pase del entrenador al central',
    como_finaliza = 'Balón supera línea de medio campo o pérdida de posesión'
WHERE codigo = 'JDP-003';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica media, desplazamientos tácticos',
    objetivo_psicologico = 'Comprensión del 4-3-3, automatismos posicionales',
    reglas_tecnicas = '["2 toques en zona 1", "3 toques en zona 2", "Libre en zona 3"]',
    reglas_tacticas = '["Estructura 4-3-3 obligatoria", "Pivote siempre disponible", "Interiores entre líneas"]',
    reglas_psicologicas = '["Paciencia en construcción", "Confianza en compañeros"]',
    consignas_ofensivas = '["Escalonamiento en 3 líneas", "Ofrecer triángulos", "Movilidad de interiores"]',
    consignas_defensivas = '["Pressing por zonas", "Cerrar pivote", "Repliegue ordenado"]',
    errores_comunes = '["Interiores no se ofrecen", "Pivote estático", "Extremos muy abiertos"]',
    variantes = '[{"nombre": "8+POR vs 7", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "7+POR vs 5", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Aumentar pressing", "Reducir toques", "Añadir tiempo límite"]',
    regresiones = '["Reducir pressing", "Más toques permitidos", "Ampliar espacios"]',
    material = '["Petos 2 colores (7+6)", "Conos para zonas x12", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque de portero o balón al central',
    como_finaliza = 'Gol, pérdida, o llegada a zona de finalización'
WHERE codigo = 'JDP-004';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, reacción bajo presión',
    objetivo_psicologico = 'Gestión del estrés, toma de decisiones rápida',
    reglas_tecnicas = '["Máximo 2 toques", "Primera orientada obligatoria", "Pase firme"]',
    reglas_tacticas = '["Superar pressing por corto o largo", "Opciones claras de salida", "Tercer hombre activo"]',
    reglas_psicologicas = '["Mantener calma bajo presión intensa", "Confianza en el plan"]',
    consignas_ofensivas = '["Ofrecer dos líneas de pase mínimo", "Tercer hombre activo", "Salida rápida si hay espacio"]',
    consignas_defensivas = '["Pressing alto coordinado", "Cerrar salidas por banda", "Forzar error"]',
    errores_comunes = '["Pánico bajo presión", "No usar al portero", "Pase precipitado"]',
    variantes = '[{"nombre": "6+POR vs 6", "descripcion": "Igualdad numérica", "dificultad": "+1"}, {"nombre": "7+POR vs 4", "descripcion": "Menor presión", "dificultad": "-1"}]',
    progresiones = '["Igualdad numérica", "Reducir tiempo de reacción", "Pressing más agresivo"]',
    regresiones = '["Reducir presión", "Más tiempo de decisión", "Añadir comodín"]',
    material = '["Petos 2 colores (6+5)", "Conos delimitadores x8", "Balones x6", "Portería x1"]',
    como_inicia = 'Pressing activa con pase del entrenador al portero',
    como_finaliza = 'Superación del pressing o pérdida de balón'
WHERE codigo = 'JDP-005';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, movilidad táctica',
    objetivo_psicologico = 'Comprensión de superioridades, paciencia',
    reglas_tecnicas = '["2 toques en construcción", "3 toques en creación", "Libre en finalización"]',
    reglas_tacticas = '["Crear superioridad 2v1 en zona", "Tercer hombre obligatorio", "Cambio de orientación"]',
    reglas_psicologicas = '["Buscar ventaja numérica", "No forzar si no hay superioridad"]',
    consignas_ofensivas = '["Identificar zona de superioridad", "Atraer para soltar", "Fijar y pasar"]',
    consignas_defensivas = '["Cerrar espacios de superioridad", "Pressing zonal", "Repliegue rápido"]',
    errores_comunes = '["No identificar superioridad", "Forzar pases", "Juego predecible"]',
    variantes = '[{"nombre": "9+POR vs 8", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "7+POR vs 6", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "Menos toques", "Tiempo límite"]',
    regresiones = '["Menos oposición", "Más toques", "Sin tiempo límite"]',
    material = '["Petos 2 colores (8+7)", "Conos para zonas x12", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque de portero al central',
    como_finaliza = 'Gol o pérdida de posesión'
WHERE codigo = 'JDP-006';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia de baja intensidad, desplazamientos cortos',
    objetivo_psicologico = 'Comprensión del doble pivote, coordinación',
    reglas_tecnicas = '["2 toques máximo", "Pase al suelo", "Recepción perfilada"]',
    reglas_tacticas = '["Doble pivote siempre escalonado", "Uno ofrece, otro cubre", "Triangulación obligatoria"]',
    reglas_psicologicas = '["Coordinación entre pivotes", "Comunicación constante"]',
    consignas_ofensivas = '["Pivotes nunca en línea horizontal", "Ofrecer pared", "Movilidad coordinada"]',
    consignas_defensivas = '["Cerrar a los pivotes", "Pressing por dentro", "Forzar pase atrás"]',
    errores_comunes = '["Pivotes en línea", "No comunicar", "Movimientos iguales"]',
    variantes = '[{"nombre": "7+POR vs 6", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "6+POR vs 4", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Aumentar presión", "1 toque para pivotes", "Reducir espacio"]',
    regresiones = '["Reducir presión", "3 toques permitidos", "Ampliar espacio"]',
    material = '["Petos 2 colores (6+5)", "Conos delimitadores x8", "Balones x6", "Portería x1"]',
    como_inicia = 'Pase del portero o central al pivote',
    como_finaliza = 'Superación del pressing o pérdida'
WHERE codigo = 'JDP-007';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica baja, timing de movimientos',
    objetivo_psicologico = 'Comprensión del tercer hombre, anticipación',
    reglas_tecnicas = '["2 toques máximo", "Pase al primer toque del receptor", "Control orientado"]',
    reglas_tacticas = '["Pase al tercer hombre obligatorio", "No devolver al pasador directo", "Triangulación continua"]',
    reglas_psicologicas = '["Pensar dos pases adelante", "Anticipación colectiva"]',
    consignas_ofensivas = '["El tercer hombre siempre libre", "Movimiento antes del pase", "Lectura anticipada"]',
    consignas_defensivas = '["Cerrar al tercer hombre", "Anticipar la combinación", "Pressing al segundo pase"]',
    errores_comunes = '["Devolver al pasador", "No ofrecer tercera opción", "Movimiento tarde"]',
    variantes = '[{"nombre": "6+POR vs 5", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "5+POR vs 3", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "1 toque obligatorio", "Tiempo límite"]',
    regresiones = '["Menos oposición", "3 toques", "Sin tiempo límite"]',
    material = '["Petos 2 colores (5+4)", "Conos delimitadores x8", "Balones x6", "Portería x1"]',
    como_inicia = 'Pase del entrenador al defensor',
    como_finaliza = 'Llegada al tercio final o pérdida'
WHERE codigo = 'JDP-008';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica media, desplazamientos largos',
    objetivo_psicologico = 'Timing de incorporación, decisión de momento',
    reglas_tecnicas = '["2 toques para laterales", "3 toques para centrales", "Pase al espacio"]',
    reglas_tacticas = '["Laterales en altura cuando el balón progresa", "Superioridad en banda", "Centro al área"]',
    reglas_psicologicas = '["Timing de subida", "No precipitarse", "Comunicar la subida"]',
    consignas_ofensivas = '["Lateral sube cuando el balón llega a zona 2", "Crear 2v1 en banda", "Centro al segundo palo"]',
    consignas_defensivas = '["Cerrar al lateral", "Repliegue de extremo", "Vigilar el centro"]',
    errores_comunes = '["Subir antes de tiempo", "No volver a posición", "Centro precipitado"]',
    variantes = '[{"nombre": "8+POR vs 7", "descripcion": "Más oposición", "dificultad": "+1"}, {"nombre": "7+POR vs 5", "descripcion": "Menos oposición", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "1 toque para lateral", "Tiempo límite para centro"]',
    regresiones = '["Menos oposición", "3 toques", "Sin límite de tiempo"]',
    material = '["Petos 2 colores (7+6)", "Conos para zonas x10", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque del portero al lateral',
    como_finaliza = 'Centro y finalización o pérdida'
WHERE codigo = 'JDP-009';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, movimientos de ruptura',
    objetivo_psicologico = 'Comprensión de espacios entre líneas, timing',
    reglas_tecnicas = '["2 toques máximo", "Control orientado hacia portería", "Pase filtrado"]',
    reglas_tacticas = '["Interior recibe entre líneas", "Movimiento de aclarado", "Giro y encarar"]',
    reglas_psicologicas = '["Buscar el espacio", "Valentía para recibir de cara", "Decisión rápida"]',
    consignas_ofensivas = '["Interior ataca el espacio entre líneas", "Compañeros aclaran", "Giro rápido al recibir"]',
    consignas_defensivas = '["Cerrar línea de pase interior", "Basculación", "Achicar espacios"]',
    errores_comunes = '["Recibir de espaldas", "No atacar el espacio", "Giro lento"]',
    variantes = '[{"nombre": "7+POR vs 6", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "6+POR vs 4", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "1 toque tras recibir", "Tiempo límite"]',
    regresiones = '["Menos oposición", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (6+5)", "Conos para zonas x8", "Balones x6", "Porterías x2"]',
    como_inicia = 'Pase al central desde el portero',
    como_finaliza = 'Finalización tras recepción entre líneas o pérdida'
WHERE codigo = 'JDP-010';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, conducción bajo presión',
    objetivo_psicologico = 'Valentía para conducir, lectura del espacio',
    reglas_tecnicas = '["Conducción con cabeza levantada", "Pase al espacio", "Cambio de ritmo"]',
    reglas_tacticas = '["Central conduce si hay espacio", "Atraer rival y soltar", "Crear superioridad en zona media"]',
    reglas_psicologicas = '["Valentía para salir con balón", "Lectura del momento", "Confianza"]',
    consignas_ofensivas = '["Conducir si nadie presiona", "Atraer y soltar", "Buscar línea de pase avanzada"]',
    consignas_defensivas = '["Presionar al central con balón", "Cerrar línea de conducción", "Basculación"]',
    errores_comunes = '["Conducir con cabeza baja", "No soltar a tiempo", "Conducir sin espacio"]',
    variantes = '[{"nombre": "7+POR vs 6", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "6+POR vs 4", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "Tiempo límite de conducción", "Zona de conducción reducida"]',
    regresiones = '["Menos oposición", "Sin límite", "Zona ampliada"]',
    material = '["Petos 2 colores (6+5)", "Conos para zonas x8", "Balones x6", "Porterías x2"]',
    como_inicia = 'Pase del portero al central',
    como_finaliza = 'Llegada a zona de creación o pérdida'
WHERE codigo = 'JDP-011';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia baja, juego con pies del portero',
    objetivo_psicologico = 'Confianza del portero, integración en el juego',
    reglas_tecnicas = '["Portero máximo 3 toques", "Pase al suelo", "No pase largo directo"]',
    reglas_tacticas = '["Portero como jugador+", "Superioridad numérica en salida", "Línea de 3 con portero"]',
    reglas_psicologicas = '["Confianza en el portero", "Comunicación con defensa", "Calma"]',
    consignas_ofensivas = '["Portero siempre opción de descarga", "Crear superioridad 6v5 con portero", "Paciencia en salida"]',
    consignas_defensivas = '["Presionar al portero", "Cerrar líneas cortas", "Forzar pase largo"]',
    errores_comunes = '["No usar al portero", "Portero precipitado", "Pase arriesgado del portero"]',
    variantes = '[{"nombre": "6+POR vs 5", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "5+POR vs 3", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "2 toques para portero", "Tiempo límite"]',
    regresiones = '["Menos oposición", "4 toques", "Sin límite"]',
    material = '["Petos 2 colores (5+4)", "Conos delimitadores x6", "Balones x6", "Portería x1"]',
    como_inicia = 'Balón al portero desde el entrenador',
    como_finaliza = 'Superación del pressing o pérdida'
WHERE codigo = 'JDP-012';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, desmarques de ruptura',
    objetivo_psicologico = 'Lectura de espacios, decisión de movimiento',
    reglas_tecnicas = '["2 toques máximo", "Control orientado interior", "Pase al espacio"]',
    reglas_tacticas = '["Extremo entra a zona interior", "Lateral ocupa banda", "Crear superioridad interior"]',
    reglas_psicologicas = '["Timing del movimiento interior", "Comunicación con lateral", "Decisión rápida"]',
    consignas_ofensivas = '["Extremo ataca espacio interior cuando lateral sube", "Movimiento diagonal", "Ocupar el espacio dejado"]',
    consignas_defensivas = '["Seguir al extremo", "Comunicar el movimiento", "Cerrar espacio interior"]',
    errores_comunes = '["Entrar muy pronto", "No comunicar con lateral", "Quedarse en banda"]',
    variantes = '[{"nombre": "8+POR vs 7", "descripcion": "Más oposición", "dificultad": "+1"}, {"nombre": "7+POR vs 5", "descripcion": "Menos oposición", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "1 toque interior", "Tiempo límite"]',
    regresiones = '["Menos oposición", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (7+6)", "Conos para zonas x10", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Finalización o pérdida'
WHERE codigo = 'JDP-013';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, desplazamientos largos',
    objetivo_psicologico = 'Visión de cambio de orientación, paciencia',
    reglas_tecnicas = '["2 toques máximo", "Pase largo preciso", "Control orientado al lado contrario"]',
    reglas_tacticas = '["Cambio de orientación obligatorio cada 5 pases", "Atacar lado débil", "Amplitud máxima"]',
    reglas_psicologicas = '["Paciencia para encontrar el cambio", "No precipitar el cambio", "Visión de juego"]',
    consignas_ofensivas = '["Preparar el cambio con circulación", "Jugador de lado débil atento", "Cambio en largo o corto-corto-largo"]',
    consignas_defensivas = '["Basculación rápida", "Cerrar lado débil", "Anticipar el cambio"]',
    errores_comunes = '["Cambio precipitado", "No ocupar lado débil", "Basculación lenta"]',
    variantes = '[{"nombre": "9+POR vs 8", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "8+POR vs 6", "descripcion": "Menos oposición", "dificultad": "-1"}]',
    progresiones = '["Cambio cada 4 pases", "1 toque en cambio", "Tiempo límite"]',
    regresiones = '["Cambio cada 7 pases", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (8+7)", "Conos para zonas x12", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Cambio de orientación exitoso y finalización o pérdida'
WHERE codigo = 'JDP-014';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, movimientos de desmarque',
    objetivo_psicologico = 'Comprensión del falso 9, creatividad',
    reglas_tecnicas = '["2 toques máximo", "Control orientado", "Pase al espacio"]',
    reglas_tacticas = '["Delantero baja a zona media", "Centrales no siguen", "Extremos atacan espacio dejado"]',
    reglas_psicologicas = '["Timing de bajada", "Crear incertidumbre", "Decisión rápida tras recibir"]',
    consignas_ofensivas = '["Falso 9 baja para recibir", "Extremos atacan espacio de 9", "Interiores se incorporan"]',
    consignas_defensivas = '["Decidir si seguir al 9", "Cerrar espacios centrales", "Comunicación defensiva"]',
    errores_comunes = '["Bajar sin timing", "Extremos no atacan espacio", "Central sigue dejando hueco"]',
    variantes = '[{"nombre": "8+POR vs 7", "descripcion": "Más oposición", "dificultad": "+1"}, {"nombre": "7+POR vs 5", "descripcion": "Menos oposición", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "1 toque para falso 9", "Tiempo límite"]',
    regresiones = '["Menos oposición", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (7+6)", "Conos para zonas x10", "Balones x8", "Porterías x2"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Finalización tras movimiento de falso 9 o pérdida'
WHERE codigo = 'JDP-015';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica completa, trabajo de equipo',
    objetivo_psicologico = 'Comprensión global del sistema, liderazgo',
    reglas_tecnicas = '["2 toques en zona defensiva", "3 toques en zona media", "Libre en zona de finalización"]',
    reglas_tacticas = '["Sistema completo 4-3-3 o 3-4-3", "Todas las fases de juego", "Transiciones incluidas"]',
    reglas_psicologicas = '["Liderazgo en el campo", "Comunicación constante", "Gestión del partido"]',
    consignas_ofensivas = '["Respetar posiciones", "Escalonamiento correcto", "Movimientos coordinados"]',
    consignas_defensivas = '["Pressing según zona", "Repliegue ordenado", "Basculación"]',
    errores_comunes = '["Perder estructura", "No comunicar", "Transiciones lentas"]',
    variantes = '[{"nombre": "10+POR vs 9", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "9+POR vs 7", "descripcion": "Menos oposición", "dificultad": "-1"}]',
    progresiones = '["Igualdad numérica", "Reducir toques", "Tiempo de posesión limitado"]',
    regresiones = '["Superioridad", "Más toques", "Sin límite"]',
    material = '["Petos 2 colores (9+8)", "Conos para zonas x16", "Balones x10", "Porterías x2"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Gol o tiempo de posesión agotado'
WHERE codigo = 'JDP-016';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, transición de ritmo',
    objetivo_psicologico = 'Decisión post-pressing, verticalidad',
    reglas_tecnicas = '["2 toques tras superar pressing", "Pase vertical prioritario", "Conducción si hay espacio"]',
    reglas_tacticas = '["Una vez superado el pressing, verticalidad", "Buscar profundidad inmediata", "No volver atrás"]',
    reglas_psicologicas = '["Cambio de mentalidad al superar pressing", "Agresividad ofensiva", "Decisión rápida"]',
    consignas_ofensivas = '["Superar pressing y atacar", "Buscar espacio a la espalda", "Verticalidad inmediata"]',
    consignas_defensivas = '["Repliegue rápido tras ser superados", "Cerrar espacios centrales", "Ganar tiempo"]',
    errores_comunes = '["Volver atrás tras superar pressing", "Perder tiempo", "No atacar el espacio"]',
    variantes = '[{"nombre": "7+POR vs 6", "descripcion": "Más presión", "dificultad": "+1"}, {"nombre": "6+POR vs 4", "descripcion": "Menos presión", "dificultad": "-1"}]',
    progresiones = '["Más oposición", "Tiempo límite para finalizar", "1 toque tras superar"]',
    regresiones = '["Menos oposición", "Sin límite", "3 toques"]',
    material = '["Petos 2 colores (6+5)", "Conos para zonas x10", "Balones x6", "Porterías x2"]',
    como_inicia = 'Pressing intenso al portero',
    como_finaliza = 'Finalización tras superar pressing o pérdida'
WHERE codigo = 'JDP-017';

-- ============================================================================
-- POSESIÓN (POS) - 18 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica intermitente',
    objetivo_psicologico = 'Trabajo en equipo, comunicación inter-equipos',
    reglas_tecnicas = '["2 toques máximo", "Pase al suelo", "Control orientado"]',
    reglas_tacticas = '["Dos equipos poseen vs uno defiende", "Rotar equipo defensor", "Cambio rápido de mentalidad"]',
    reglas_psicologicas = '["Colaboración entre equipos atacantes", "Gestión de la fatiga mental defensiva"]',
    consignas_ofensivas = '["Usar superioridad 12v6", "Cambiar el juego constantemente", "Apoyos en amplitud"]',
    consignas_defensivas = '["Pressing inteligente", "No perseguir", "Recuperación activa"]',
    errores_comunes = '["No aprovechar superioridad", "Juego predecible", "Pressing desorganizado"]',
    variantes = '[{"nombre": "7v7v7", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "5v5v5", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["1 toque obligatorio", "Reducir espacio", "Añadir porterías"]',
    regresiones = '["3 toques permitidos", "Agrandar espacio", "Reducir defensores"]',
    material = '["Petos 3 colores (6+6+6)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón a uno de los equipos atacantes',
    como_finaliza = 'Robo y 3 pases o rotación por tiempo'
WHERE codigo = 'POS-003';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, transiciones físicas',
    objetivo_psicologico = 'Adaptabilidad, reacción al cambio',
    reglas_tecnicas = '["2 toques máximo", "Pase firme", "Control orientado a transición"]',
    reglas_tacticas = '["Comodines con equipo poseedor", "Transición inmediata al robo", "Buscar profundidad"]',
    reglas_psicologicas = '["Mentalidad de transición constante", "Reacción rápida al cambio"]',
    consignas_ofensivas = '["Usar comodines para descansar", "Amplitud en posesión", "Transición vertical rápida"]',
    consignas_defensivas = '["Pressing inmediato tras pérdida", "Cerrar a comodines", "Repliegue rápido"]',
    errores_comunes = '["Comodines estáticos", "Transición lenta", "No usar la superioridad"]',
    variantes = '[{"nombre": "6v6+6", "descripcion": "Más comodines", "dificultad": "-1"}, {"nombre": "5v5+4", "descripcion": "Menos comodines", "dificultad": "+1"}]',
    progresiones = '["Reducir comodines", "1 toque", "Añadir porterías"]',
    regresiones = '["Más comodines", "3 toques", "Sin transición obligatoria"]',
    material = '["Petos 3 colores (5+5+5)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón al equipo con comodines',
    como_finaliza = 'Gol, 10 pases, o transición completada'
WHERE codigo = 'POS-004';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, movilidad zonal',
    objetivo_psicologico = 'Comprensión zonal, disciplina táctica',
    reglas_tecnicas = '["2 toques máximo", "Pase entre zonas preciso", "Control orientado"]',
    reglas_tacticas = '["Comodines en zonas específicas", "Circulación por todas las zonas", "No agruparse"]',
    reglas_psicologicas = '["Disciplina de zonas", "Paciencia en circulación"]',
    consignas_ofensivas = '["Usar todas las zonas", "No saltarse zonas", "Comodines como pivotes"]',
    consignas_defensivas = '["Pressing zonal", "No salir de zona", "Basculación dentro de zona"]',
    errores_comunes = '["Salir de zona", "Ignorar comodines", "Agruparse en una zona"]',
    variantes = '[{"nombre": "5v5+5 zonas", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "3v3+3 zonas", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["1 toque en comodines", "Más zonas", "Tiempo límite por zona"]',
    regresiones = '["3 toques", "Menos zonas", "Sin límite de tiempo"]',
    material = '["Petos 3 colores (4+4+4)", "Conos para zonas x12", "Balones x6"]',
    como_inicia = 'Balón en zona central',
    como_finaliza = 'Robo o circulación por todas las zonas'
WHERE codigo = 'POS-005';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica de media intensidad',
    objetivo_psicologico = 'Uso de la superioridad, paciencia',
    reglas_tecnicas = '["2 toques máximo", "Pase al suelo", "Control limpio"]',
    reglas_tacticas = '["Usar superioridad numérica", "No precipitarse", "Circulación amplia"]',
    reglas_psicologicas = '["Paciencia con balón", "No forzar", "Confianza en la superioridad"]',
    consignas_ofensivas = '["Aprovechar el hombre de más", "Amplitud máxima", "Mover al rival"]',
    consignas_defensivas = '["Pressing inteligente", "No desgastarse", "Cerrar líneas principales"]',
    errores_comunes = '["No usar superioridad", "Precipitarse", "Juego previsible"]',
    variantes = '[{"nombre": "7v4", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "6v5", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    progresiones = '["Reducir superioridad", "1 toque", "Tiempo límite"]',
    regresiones = '["Aumentar superioridad", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (6+4)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 6',
    como_finaliza = 'Robo o 15 pases consecutivos'
WHERE codigo = 'POS-006';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, desplazamientos largos',
    objetivo_psicologico = 'Visión de juego amplia, comunicación',
    reglas_tecnicas = '["2 toques máximo", "Pase largo preciso", "Control orientado"]',
    reglas_tacticas = '["Circulación en espacio grande", "Cambios de orientación", "Amplitud máxima"]',
    reglas_psicologicas = '["Paciencia en posesión larga", "Comunicación constante"]',
    consignas_ofensivas = '["Usar todo el campo", "Cambiar el juego", "Apoyos en profundidad y amplitud"]',
    consignas_defensivas = '["Basculación rápida", "Pressing coordinado", "No dividirse"]',
    errores_comunes = '["Juego corto predecible", "No cambiar orientación", "Agruparse"]',
    variantes = '[{"nombre": "9v9", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "7v7", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["1 toque", "Tiempo de posesión", "Porterías añadidas"]',
    regresiones = '["3 toques", "Sin límite", "Espacio más grande"]',
    material = '["Petos 2 colores (8+8)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón a un equipo desde el entrenador',
    como_finaliza = 'Robo o tiempo de posesión'
WHERE codigo = 'POS-007';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, cambios de dirección',
    objetivo_psicologico = 'Uso del pivote, juego asociativo',
    reglas_tecnicas = '["2 toques máximo", "Pase al pivote firme", "Control orientado"]',
    reglas_tacticas = '["Comodín central siempre disponible", "Jugar a través del pivote", "Triangulaciones"]',
    reglas_psicologicas = '["Confianza en el pivote", "Buscar la pared", "Paciencia"]',
    consignas_ofensivas = '["Usar al comodín central", "Triangular con pivote", "No ignorar al pivote"]',
    consignas_defensivas = '["Cerrar al pivote", "Presión sin perseguir", "Anticipar la pared"]',
    errores_comunes = '["No usar al pivote", "Pivote estático", "Pases predecibles"]',
    variantes = '[{"nombre": "6v6+2", "descripcion": "Dos pivotes", "dificultad": "-1"}, {"nombre": "5v5 sin comodín", "descripcion": "Sin pivote", "dificultad": "+1"}]',
    progresiones = '["1 toque para pivote", "Pivote móvil", "Reducir espacio"]',
    regresiones = '["3 toques para pivote", "Añadir segundo pivote", "Agrandar espacio"]',
    material = '["Petos 3 colores (5+5+1)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón a un equipo con pase al pivote obligatorio',
    como_finaliza = 'Robo o 12 pases con uso del pivote'
WHERE codigo = 'POS-008';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, trabajo de amplitud',
    objetivo_psicologico = 'Uso de los espacios laterales, paciencia',
    reglas_tecnicas = '["2 toques máximo", "Pase al comodín de banda", "Control orientado"]',
    reglas_tacticas = '["Comodines en bandas siempre con posesión", "Usar amplitud", "Cambios de orientación"]',
    reglas_psicologicas = '["Buscar la amplitud", "No precipitarse por el centro"]',
    consignas_ofensivas = '["Usar comodines de banda", "Cambiar el juego", "No jugar solo por el centro"]',
    consignas_defensivas = '["No salir a comodines", "Cerrar centro", "Basculación"]',
    errores_comunes = '["Ignorar comodines", "Juego solo central", "Comodines no se ofrecen"]',
    variantes = '[{"nombre": "5v5+4", "descripcion": "Más comodines", "dificultad": "-1"}, {"nombre": "4v4+1", "descripcion": "Menos comodines", "dificultad": "+1"}]',
    progresiones = '["1 toque para comodines", "Comodines móviles", "Reducir espacio central"]',
    regresiones = '["3 toques", "Añadir comodines", "Agrandar espacio"]',
    material = '["Petos 3 colores (4+4+2)", "Conos delimitadores x6", "Balones x6"]',
    como_inicia = 'Balón a un equipo desde banda',
    como_finaliza = 'Robo o circulación por ambas bandas'
WHERE codigo = 'POS-009';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, intensidad alta',
    objetivo_psicologico = 'Competitividad, objetivo claro',
    reglas_tecnicas = '["2 toques máximo", "Pase preciso a portería", "Control orientado"]',
    reglas_tacticas = '["Objetivo: pasar por mini porterías", "Posesión con dirección", "Crear espacios"]',
    reglas_psicologicas = '["Competitividad por puntos", "Objetivo claro"]',
    consignas_ofensivas = '["Buscar las porterías", "Crear espacios para el pase", "Atacar las porterías"]',
    consignas_defensivas = '["Cerrar porterías", "Pressing alto", "Anticipar la jugada"]',
    errores_comunes = '["Posesión sin objetivo", "No buscar porterías", "Forzar el pase"]',
    variantes = '[{"nombre": "8v8 más porterías", "descripcion": "Más opciones de gol", "dificultad": "-1"}, {"nombre": "6v6 menos porterías", "descripcion": "Menos opciones", "dificultad": "+1"}]',
    progresiones = '["Reducir porterías", "1 toque", "Tiempo límite"]',
    regresiones = '["Más porterías", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (7+7)", "Mini porterías x4-6", "Conos x8", "Balones x8"]',
    como_inicia = 'Balón a un equipo desde el centro',
    como_finaliza = 'Gol por portería o tiempo'
WHERE codigo = 'POS-010';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica fluida',
    objetivo_psicologico = 'Creatividad, fluidez de juego',
    reglas_tecnicas = '["2 toques máximo", "Pase limpio", "Control fluido"]',
    reglas_tacticas = '["Comodines móviles en todo el campo", "Juego libre", "Superioridad numérica"]',
    reglas_psicologicas = '["Creatividad", "Libertad táctica", "Disfrutar el juego"]',
    consignas_ofensivas = '["Comodines se mueven libremente", "Usar la superioridad", "Juego asociativo"]',
    consignas_defensivas = '["Seguir a comodines", "Pressing coordinado", "No desorganizarse"]',
    errores_comunes = '["Comodines estáticos", "No usar superioridad", "Juego predecible"]',
    variantes = '[{"nombre": "7v7+3", "descripcion": "Más comodines", "dificultad": "-1"}, {"nombre": "6v6+1", "descripcion": "Menos comodines", "dificultad": "+1"}]',
    progresiones = '["Reducir comodines", "1 toque", "Añadir objetivos"]',
    regresiones = '["Más comodines", "3 toques", "Sin restricciones"]',
    material = '["Petos 3 colores (6+6+2)", "Conos delimitadores x4", "Balones x8"]',
    como_inicia = 'Balón libre a cualquier equipo',
    como_finaliza = 'Tiempo de posesión o 15 pases'
WHERE codigo = 'POS-011';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica alta',
    objetivo_psicologico = 'Competitividad máxima, presión de resultado',
    reglas_tecnicas = '["2 toques máximo", "Pase rápido", "Control limpio"]',
    reglas_tacticas = '["10 pases = 1 punto", "Presión máxima", "Transiciones rápidas"]',
    reglas_psicologicas = '["Competitividad por puntos", "Gestión de la presión"]',
    consignas_ofensivas = '["Contar pases en voz alta", "Ritmo alto", "No perder el balón"]',
    consignas_defensivas = '["Presión máxima", "No dejar respirar", "Robar antes de 10"]',
    errores_comunes = '["Perder la cuenta", "Bajar la intensidad", "Pases arriesgados"]',
    variantes = '[{"nombre": "6v6 8 pases", "descripcion": "Menos pases", "dificultad": "+1"}, {"nombre": "5v5 12 pases", "descripcion": "Más pases", "dificultad": "-1"}]',
    progresiones = '["8 pases = punto", "Reducir espacio", "1 toque"]',
    regresiones = '["12 pases = punto", "Agrandar espacio", "3 toques"]',
    material = '["Petos 2 colores (5+5)", "Conos delimitadores x4", "Balones x6", "Marcador"]',
    como_inicia = 'Balón a un equipo, comienza la cuenta',
    como_finaliza = 'Primer equipo en X puntos o tiempo'
WHERE codigo = 'POS-012';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia media, rotación de esfuerzo',
    objetivo_psicologico = 'Dominio de posesión, gestión del cansancio rival',
    reglas_tecnicas = '["2 toques máximo", "Pase tenso", "Control rápido"]',
    reglas_tacticas = '["Superioridad 8v4 con rotación", "Cansar a los defensores", "Circulación constante"]',
    reglas_psicologicas = '["Aprovechar superioridad", "No relajarse", "Mantener intensidad"]',
    consignas_ofensivas = '["Mover el balón rápido", "Cansar al rival", "Usar toda la amplitud"]',
    consignas_defensivas = '["30 segundos máxima intensidad", "Rotación inteligente", "No rendirse"]',
    errores_comunes = '["Relajarse con superioridad", "Rotación descoordinada", "Bajar el ritmo"]',
    variantes = '[{"nombre": "9v4", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "8v5", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    progresiones = '["Añadir defensor", "1 toque", "Reducir espacio"]',
    regresiones = '["Quitar defensor", "3 toques", "Agrandar espacio"]',
    material = '["Petos 2 colores (8+4)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 8',
    como_finaliza = 'Rotación de defensores o tiempo'
WHERE codigo = 'POS-013';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, alta intensidad',
    objetivo_psicologico = 'Concentración bajo presión máxima',
    reglas_tecnicas = '["2 toques máximo", "Pase rápido y corto", "Control instantáneo"]',
    reglas_tacticas = '["Espacio muy reducido", "Velocidad de juego", "Sin tiempo para pensar"]',
    reglas_psicologicas = '["Concentración máxima", "Reacción instantánea"]',
    consignas_ofensivas = '["Pensar antes de recibir", "Pase inmediato", "Movilidad constante"]',
    consignas_defensivas = '["Pressing agresivo", "No dar espacio", "Anticipación"]',
    errores_comunes = '["Pensar después de recibir", "Pase lento", "Quedarse quieto"]',
    variantes = '[{"nombre": "5v5 reducido", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "3v3 reducido", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["1 toque", "Reducir más espacio", "Tiempo límite"]',
    regresiones = '["3 toques", "Agrandar espacio", "Sin límite"]',
    material = '["Petos 2 colores (4+4)", "Conos delimitadores x4", "Balones x4"]',
    como_inicia = 'Balón al centro del espacio',
    como_finaliza = 'Robo o salida del balón'
WHERE codigo = 'POS-014';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia intermitente, progresión física',
    objetivo_psicologico = 'Visión de progresión, objetivo claro',
    reglas_tecnicas = '["2 toques máximo", "Pase progresivo", "Control orientado adelante"]',
    reglas_tacticas = '["Posesión con dirección", "Llegar a zona objetivo", "Progresión constante"]',
    reglas_psicologicas = '["Mentalidad de avance", "No conformarse con posesión"]',
    consignas_ofensivas = '["Buscar profundidad", "No jugar atrás innecesariamente", "Atacar el espacio"]',
    consignas_defensivas = '["Cerrar líneas de progresión", "Pressing alto", "No dejar avanzar"]',
    errores_comunes = '["Posesión lateral sin progresión", "Forzar la progresión", "No defender la zona"]',
    variantes = '[{"nombre": "7v7 direccional", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "5v5 direccional", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["1 toque", "Reducir espacio", "Tiempo límite para llegar"]',
    regresiones = '["3 toques", "Agrandar espacio", "Sin límite"]',
    material = '["Petos 2 colores (6+6)", "Conos para zonas x8", "Balones x6"]',
    como_inicia = 'Balón en zona inicial',
    como_finaliza = 'Llegada a zona objetivo o pérdida'
WHERE codigo = 'POS-015';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, múltiples opciones',
    objetivo_psicologico = 'Lectura del juego, múltiples soluciones',
    reglas_tecnicas = '["2 toques máximo", "Pase variado", "Control orientado"]',
    reglas_tacticas = '["3 comodines en diferentes zonas", "Usar todas las opciones", "Superioridad múltiple"]',
    reglas_psicologicas = '["Elegir la mejor opción", "No automatizar", "Creatividad"]',
    consignas_ofensivas = '["Usar todos los comodines", "Variar el juego", "No ser predecible"]',
    consignas_defensivas = '["Cerrar opciones principales", "Basculación", "Comunicación"]',
    errores_comunes = '["Usar siempre el mismo comodín", "No variar", "Comodines estáticos"]',
    variantes = '[{"nombre": "6v6+4", "descripcion": "Más comodines", "dificultad": "-1"}, {"nombre": "5v5+2", "descripcion": "Menos comodines", "dificultad": "+1"}]',
    progresiones = '["1 toque comodines", "Reducir comodines", "Tiempo límite"]',
    regresiones = '["3 toques", "Más comodines", "Sin límite"]',
    material = '["Petos 3 colores (5+5+3)", "Conos delimitadores x6", "Balones x6"]',
    como_inicia = 'Balón libre',
    como_finaliza = 'Tiempo o circulación completa'
WHERE codigo = 'POS-016';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, resistencia a la presión',
    objetivo_psicologico = 'Calma bajo presión intensa, no precipitarse',
    reglas_tecnicas = '["2 toques máximo", "Pase firme", "Control seguro"]',
    reglas_tacticas = '["Equipo en inferioridad presiona máximo", "Conservar bajo presión", "Buscar huecos"]',
    reglas_psicologicas = '["No perder la calma", "Confianza en superioridad", "Gestión del estrés"]',
    consignas_ofensivas = '["Usar superioridad aunque presionen", "Pase seguro", "Circular hasta encontrar hueco"]',
    consignas_defensivas = '["Presión máxima en inferioridad", "No rendirse", "Intensidad 100%"]',
    errores_comunes = '["Precipitarse bajo presión", "No usar superioridad", "Pressing desordenado"]',
    variantes = '[{"nombre": "8v5", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "7v6", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    progresiones = '["Reducir superioridad", "1 toque", "Tiempo límite"]',
    regresiones = '["Más superioridad", "3 toques", "Sin límite"]',
    material = '["Petos 2 colores (7+5)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al equipo de 7',
    como_finaliza = 'Robo o tiempo de posesión'
WHERE codigo = 'POS-017';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica, amplitud máxima',
    objetivo_psicologico = 'Uso de toda la cancha, visión periférica',
    reglas_tecnicas = '["2 toques máximo", "Pase largo preciso", "Control orientado"]',
    reglas_tacticas = '["Comodines en esquinas", "Usar toda la amplitud", "Cambios de orientación obligatorios"]',
    reglas_psicologicas = '["Visión panorámica", "Paciencia para encontrar el hueco"]',
    consignas_ofensivas = '["Usar comodines de esquina", "Cambiar el juego diagonalmente", "No agruparse"]',
    consignas_defensivas = '["No salir a esquinas", "Cerrar centro", "Basculación rápida"]',
    errores_comunes = '["No usar esquinas", "Juego central", "Comodines olvidados"]',
    variantes = '[{"nombre": "7v7+6", "descripcion": "Más comodines", "dificultad": "-1"}, {"nombre": "6v6+2", "descripcion": "Menos comodines", "dificultad": "+1"}]',
    progresiones = '["1 toque comodines", "Reducir comodines", "Tiempo límite"]',
    regresiones = '["3 toques", "Más comodines", "Sin límite"]',
    material = '["Petos 3 colores (6+6+4)", "Conos delimitadores x8", "Balones x8"]',
    como_inicia = 'Balón desde una esquina',
    como_finaliza = 'Circulación por las 4 esquinas o tiempo'
WHERE codigo = 'POS-018';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, velocidad de juego',
    objetivo_psicologico = 'Velocidad mental, decisiones instantáneas',
    reglas_tecnicas = '["2 toques MÁXIMO", "Primera orientada", "Pase rápido"]',
    reglas_tacticas = '["Limitación de toques", "Juego rápido", "Anticipar el siguiente pase"]',
    reglas_psicologicas = '["Pensar antes de recibir", "No dudar", "Decisión rápida"]',
    consignas_ofensivas = '["Saber qué hacer antes de recibir", "Movilidad constante", "Ofrecer siempre"]',
    consignas_defensivas = '["Presionar al primer toque", "Anticipar", "No dar tiempo"]',
    errores_comunes = '["Pensar después de recibir", "Recibir sin opción", "Parar el balón"]',
    variantes = '[{"nombre": "1 toque obligatorio", "descripcion": "Más velocidad", "dificultad": "+1"}, {"nombre": "3 toques permitidos", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["1 toque obligatorio", "Reducir espacio", "Tiempo límite"]',
    regresiones = '["3 toques", "Agrandar espacio", "Sin límite"]',
    material = '["Petos 2 colores (5+5)", "Conos delimitadores x4", "Balones x6"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Robo o tiempo de posesión'
WHERE codigo = 'POS-019';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, transiciones físicas',
    objetivo_psicologico = 'Mentalidad de transición, reacción',
    reglas_tecnicas = '["2 toques máximo", "Pase de transición rápido", "Control orientado adelante"]',
    reglas_tacticas = '["Transición inmediata al robo", "Comodines apoyan transición", "Verticalidad"]',
    reglas_psicologicas = '["Mentalidad ganadora en transición", "Reacción inmediata", "Agresividad"]',
    consignas_ofensivas = '["Robo = transición vertical inmediata", "Usar comodines", "Buscar profundidad"]',
    consignas_defensivas = '["Transición defensiva tras pérdida", "Repliegue rápido", "Cerrar espacios"]',
    errores_comunes = '["Transición lenta", "No usar comodines", "Volver a posesión estática"]',
    variantes = '[{"nombre": "9v9+3", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "7v7+2", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Reducir comodines", "Tiempo límite transición", "Porterías obligatorias"]',
    regresiones = '["Más comodines", "Sin límite", "Sin porterías"]',
    material = '["Petos 3 colores (8+8+2)", "Conos delimitadores x6", "Balones x8", "Porterías x2"]',
    como_inicia = 'Balón a un equipo',
    como_finaliza = 'Gol en transición o posesión de 10 pases'
WHERE codigo = 'POS-020';

-- ============================================================================
-- EVOLUCIONES/OLEADAS (EVO) - 20 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, velocidad máxima',
    objetivo_psicologico = 'Toma de decisiones rápida en superioridad',
    reglas_tecnicas = '["Pase al espacio", "Control orientado a portería", "Finalización a primera"]',
    reglas_tacticas = '["Máximo 10 segundos para finalizar", "Buscar superioridad", "Transición vertical"]',
    reglas_psicologicas = '["Agresividad ofensiva", "No dudar en el disparo", "Mentalidad de gol"]',
    consignas_ofensivas = '["Atacar el espacio inmediatamente", "Buscar el 2v1", "Finalizar antes de que llegue ayuda"]',
    consignas_defensivas = '["Retrasar el ataque", "No ir al suelo", "Cerrar ángulo de tiro"]',
    errores_comunes = '["Perder tiempo en decisión", "No buscar profundidad", "Tiro precipitado"]',
    variantes = '[{"nombre": "5v4", "descripcion": "Más atacantes", "dificultad": "-1"}, {"nombre": "4v4", "descripcion": "Igualdad numérica", "dificultad": "+1"}]',
    progresiones = '["Reducir tiempo a 8s", "Igualdad numérica", "Añadir defensor"]',
    regresiones = '["Aumentar tiempo", "Más superioridad", "Quitar defensor"]',
    material = '["Petos 2 colores", "Balones x10", "Portería reglamentaria x2", "Conos x8"]',
    como_inicia = 'Pase del entrenador al primer atacante en carrera',
    como_finaliza = 'Gol, parada del portero, o balón fuera'
WHERE codigo = 'EVO-003';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, repetición de esfuerzos',
    objetivo_psicologico = 'Automatización de movimientos, concentración',
    reglas_tecnicas = '["Pase al hueco", "Control orientado", "Finalización variada"]',
    reglas_tacticas = '["Oleadas continuas", "Superioridad 3v2", "Atacar por el centro"]',
    reglas_psicologicas = '["Mantener intensidad en cada oleada", "No relajarse", "Concentración constante"]',
    consignas_ofensivas = '["Movimiento de apoyo y ruptura", "Buscar el disparo", "Rechaces al segundo palo"]',
    consignas_defensivas = '["Cerrar líneas de pase", "No dividirse", "Proteger la portería"]',
    errores_comunes = '["Oleadas sin intensidad", "No rematar rechaces", "Movimientos predecibles"]',
    variantes = '[{"nombre": "4v3", "descripcion": "Más atacantes", "dificultad": "-1"}, {"nombre": "3v3", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad numérica", "Tiempo límite", "Añadir defensor"]',
    regresiones = '["Más superioridad", "Sin tiempo límite", "Menos defensores"]',
    material = '["Petos 2 colores", "Balones x12", "Portería x2", "Conos x6"]',
    como_inicia = 'Entrenador pasa al primer atacante, oleada comienza',
    como_finaliza = 'Gol o pérdida, siguiente oleada inmediata'
WHERE codigo = 'EVO-004';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, sprints repetidos',
    objetivo_psicologico = 'Precisión en el centro, timing de llegada',
    reglas_tecnicas = '["Centro al primer o segundo palo", "Remate de cabeza o volea", "Control del tiempo"]',
    reglas_tacticas = '["Superioridad en banda", "Centro obligatorio", "Ataque al área"]',
    reglas_psicologicas = '["Anticipación del centro", "Agresividad en área", "No tener miedo"]',
    consignas_ofensivas = '["Ganar la espalda al defensor", "Atacar el centro", "Pedir el balón"]',
    consignas_defensivas = '["No perder la marca", "Despejar lejos", "Comunicar posiciones"]',
    errores_comunes = '["Centro sin compañero", "Llegada tarde al remate", "No atacar el balón"]',
    variantes = '[{"nombre": "3v2 con centro", "descripcion": "Más atacantes", "dificultad": "-1"}, {"nombre": "2v2 con centro", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad en área", "Defensor en banda", "Tiempo límite"]',
    regresiones = '["Más superioridad", "Sin defensor en banda", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Portería x1", "Conos x6"]',
    como_inicia = 'Pase al extremo que inicia conducción',
    como_finaliza = 'Gol, parada, o balón fuera tras centro'
WHERE codigo = 'EVO-005';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica completa, alta intensidad',
    objetivo_psicologico = 'Toma de decisiones en velocidad, coordinación',
    reglas_tecnicas = '["Combinación rápida", "Pase al espacio", "Finalización variada"]',
    reglas_tacticas = '["Evolución completa de ataque", "Superioridad 5v4", "Múltiples opciones"]',
    reglas_psicologicas = '["Leer la defensa", "Elegir la mejor opción", "No precipitarse"]',
    consignas_ofensivas = '["Buscar la combinación que abra la defensa", "Usar amplitud y profundidad", "Finalizar con calidad"]',
    consignas_defensivas = '["Organización defensiva", "Comunicación", "No dejar espacios"]',
    errores_comunes = '["Forzar jugadas", "No usar todas las opciones", "Finalización precipitada"]',
    variantes = '[{"nombre": "6v5", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "5v5", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad numérica", "Tiempo límite 12s", "Añadir pressing"]',
    regresiones = '["Más superioridad", "Sin tiempo límite", "Menos pressing"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Balón al primer atacante desde zona media',
    como_finaliza = 'Gol o pérdida de posesión'
WHERE codigo = 'EVO-006';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, cambios de ritmo',
    objetivo_psicologico = 'Competitividad en igualdad, presión de resultado',
    reglas_tecnicas = '["Regate permitido", "Pase rápido", "Finalización a primera"]',
    reglas_tacticas = '["Igualdad numérica", "Transición bidireccional", "Máxima intensidad"]',
    reglas_psicologicas = '["Ganar cada duelo", "No rendirse", "Competitividad máxima"]',
    consignas_ofensivas = '["Buscar el 1v1 favorable", "Cambios de ritmo", "Atacar el espacio"]',
    consignas_defensivas = '["No ir al suelo", "Temporizar", "Forzar el error"]',
    errores_comunes = '["Precipitarse en igualdad", "No defender en transición", "Falta de intensidad"]',
    variantes = '[{"nombre": "4v4", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "2v2", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Campo más grande", "Tiempo extendido"]',
    regresiones = '["Menos jugadores", "Campo más pequeño", "Sin tiempo"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón neutral, disputan posesión',
    como_finaliza = 'Gol o tiempo agotado'
WHERE codigo = 'EVO-007';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, sprints diagonales',
    objetivo_psicologico = 'Visión diagonal, timing de llegada',
    reglas_tecnicas = '["Pase diagonal al espacio", "Control orientado", "Finalización cruzada"]',
    reglas_tacticas = '["Ataque diagonal obligatorio", "Superioridad 4v3", "Cambio de carril"]',
    reglas_psicologicas = '["Buscar el hueco diagonal", "No ser predecible", "Atacar el espacio"]',
    consignas_ofensivas = '["Movimiento diagonal constante", "Cruzar la carrera del compañero", "Atacar segundo palo"]',
    consignas_defensivas = '["Cerrar diagonales", "No perder referencias", "Comunicar cruces"]',
    errores_comunes = '["Ataque frontal predecible", "No cruzar carreras", "Timing incorrecto"]',
    variantes = '[{"nombre": "5v4 diagonal", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "4v4 diagonal", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Defensor extra", "Tiempo límite 10s"]',
    regresiones = '["Más superioridad", "Menos defensores", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Pase diagonal del entrenador',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-008';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, automatización',
    objetivo_psicologico = 'Automatizar la decisión 2v1',
    reglas_tecnicas = '["Pared obligatoria", "Pase al espacio", "Finalización a primera"]',
    reglas_tacticas = '["2v1 repetido", "Siempre superioridad", "Finalización rápida"]',
    reglas_psicologicas = '["No dudar en la pared", "Confianza en el compañero", "Automatismo"]',
    consignas_ofensivas = '["Fijar al defensor", "Pared al espacio", "Atacar el hueco"]',
    consignas_defensivas = '["Retrasar", "No ir al suelo", "Cerrar ángulo"]',
    errores_comunes = '["Pared telegráfica", "No atacar el espacio", "Finalización mala"]',
    variantes = '[{"nombre": "3v2", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "2v0", "descripcion": "Sin oposición", "dificultad": "-1"}]',
    progresiones = '["Añadir defensor", "Tiempo límite 5s", "Defensor activo"]',
    regresiones = '["Sin defensor", "Sin límite", "Defensor pasivo"]',
    material = '["Petos 2 colores", "Balones x12", "Portería x1", "Conos x4"]',
    como_inicia = 'Pase al primer atacante que inicia 2v1',
    como_finaliza = 'Gol o parada, siguiente repetición'
WHERE codigo = 'EVO-009';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica, sprint largo',
    objetivo_psicologico = 'Gestión del espacio largo, decisión en velocidad',
    reglas_tecnicas = '["Pase largo preciso", "Control en carrera", "Finalización en velocidad"]',
    reglas_tacticas = '["Contraataque desde campo propio", "Superioridad 5v4", "Verticalidad máxima"]',
    reglas_psicologicas = '["Mentalidad de contraataque", "No frenar", "Aprovechar el espacio"]',
    consignas_ofensivas = '["Primer pase vertical", "Carreras de apoyo y ruptura", "No parar hasta el gol"]',
    consignas_defensivas = '["Repliegue intenso", "Ganar tiempo", "Cerrar espacios centrales"]',
    errores_comunes = '["Frenar el contraataque", "Pase horizontal", "No acompañar"]',
    variantes = '[{"nombre": "6v5", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "5v5", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Tiempo límite 12s", "Defensor persigue"]',
    regresiones = '["Más superioridad", "Sin límite", "Sin persecución"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x6"]',
    como_inicia = 'Portero saca rápido al primer atacante',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-010';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, segundas acciones',
    objetivo_psicologico = 'Anticipación del rechace, no rendirse',
    reglas_tecnicas = '["Disparo potente", "Rechace al segundo palo", "Remate de volea"]',
    reglas_tacticas = '["Atacar rechaces", "Posicionamiento anticipado", "Segundas jugadas"]',
    reglas_psicologicas = '["Nunca dar el balón por perdido", "Anticipar el rechace", "Agresividad"]',
    consignas_ofensivas = '["Posición de rechace", "Atacar el segundo palo", "No quedarse mirando"]',
    consignas_defensivas = '["Despejar lejos", "Bloquear segundas jugadas", "Anticipar"]',
    errores_comunes = '["Quedarse parado tras disparo", "No atacar rechace", "Posición incorrecta"]',
    variantes = '[{"nombre": "4v3 rechaces", "descripcion": "Más atacantes", "dificultad": "-1"}, {"nombre": "3v3 rechaces", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Dos disparos obligatorios", "Tiempo límite"]',
    regresiones = '["Más superioridad", "Un disparo", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x12", "Porterías x2", "Conos x6"]',
    como_inicia = 'Disparo inicial desde fuera del área',
    como_finaliza = 'Gol o balón controlado por defensa'
WHERE codigo = 'EVO-011';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, combinación rápida',
    objetivo_psicologico = 'Timing de pared, automatismo',
    reglas_tecnicas = '["Pared a un toque", "Control orientado", "Finalización inmediata"]',
    reglas_tacticas = '["Pared obligatoria antes de disparo", "Combinación rápida", "Finalización tras pared"]',
    reglas_psicologicas = '["Confianza en la pared", "No dudar", "Automatismo de finalización"]',
    consignas_ofensivas = '["Pared al primer toque", "Atacar el espacio tras pared", "Disparo inmediato"]',
    consignas_defensivas = '["Cerrar línea de pase", "Anticipar la pared", "Bloquear disparo"]',
    errores_comunes = '["Pared lenta", "No atacar el espacio", "Disparo precipitado"]',
    variantes = '[{"nombre": "Doble pared", "descripcion": "Más combinación", "dificultad": "+1"}, {"nombre": "Pared libre", "descripcion": "Sin obligación", "dificultad": "-1"}]',
    progresiones = '["Doble pared", "Defensor activo", "Tiempo límite 6s"]',
    regresiones = '["Una pared", "Sin defensor", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x12", "Portería x1", "Conos x4"]',
    como_inicia = 'Pase al jugador que inicia la pared',
    como_finaliza = 'Gol o parada tras pared'
WHERE codigo = 'EVO-012';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, transición bidireccional',
    objetivo_psicologico = 'Mentalidad de transición, adaptabilidad',
    reglas_tecnicas = '["Pase rápido", "Control orientado a portería", "Finalización variada"]',
    reglas_tacticas = '["Igualdad 4v4", "Transición a ambas porterías", "Bidireccional"]',
    reglas_psicologicas = '["Reacción inmediata al cambio", "No lamentarse", "Siguiente acción"]',
    consignas_ofensivas = '["Transición vertical inmediata", "Buscar superioridad momentánea", "Finalizar rápido"]',
    consignas_defensivas = '["Transición defensiva inmediata", "Repliegue activo", "No dejar espacios"]',
    errores_comunes = '["Transición lenta", "Quedarse lamentando", "No defender tras pérdida"]',
    variantes = '[{"nombre": "5v5 bidireccional", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "3v3 bidireccional", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Campo más grande", "Tiempo extendido"]',
    regresiones = '["Menos jugadores", "Campo más pequeño", "Series cortas"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón neutral en el centro',
    como_finaliza = 'Gol o tiempo de serie'
WHERE codigo = 'EVO-013';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica máxima, duelo',
    objetivo_psicologico = 'Ganar el duelo individual, competitividad',
    reglas_tecnicas = '["Regate", "Cambio de ritmo", "Finalización 1v1 con portero"]',
    reglas_tacticas = '["Duelo 1v1 puro", "Ganar al defensor", "Finalizar"]',
    reglas_psicologicas = '["Confianza en el 1v1", "No tener miedo", "Ganar el duelo mental"]',
    consignas_ofensivas = '["Encarar al defensor", "Cambio de ritmo", "Buscar el disparo"]',
    consignas_defensivas = '["No ir al suelo", "Temporizar", "Cerrar ángulo"]',
    errores_comunes = '["Regate predecible", "No encarar", "Disparo precipitado"]',
    variantes = '[{"nombre": "1v1 desde banda", "descripcion": "Diferente ángulo", "dificultad": "0"}, {"nombre": "1v1 con tiempo", "descripcion": "Presión temporal", "dificultad": "+1"}]',
    progresiones = '["Tiempo límite 5s", "Defensor activo", "Desde más lejos"]',
    regresiones = '["Sin tiempo", "Defensor pasivo", "Más cerca"]',
    material = '["Petos 2 colores", "Balones x10", "Portería x1", "Conos x4"]',
    como_inicia = 'Pase al atacante que encara al defensor',
    como_finaliza = 'Gol o recuperación defensiva'
WHERE codigo = 'EVO-014';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, llegada al área',
    objetivo_psicologico = 'Timing de centro, ataque al área',
    reglas_tecnicas = '["Centro al área", "Remate de cabeza/volea", "Llegada al área"]',
    reglas_tacticas = '["Superioridad en banda", "Centro obligatorio", "Ataque coordinado al área"]',
    reglas_psicologicas = '["Atacar el centro con convicción", "No tener miedo", "Timing de llegada"]',
    consignas_ofensivas = '["Ganar la posición en área", "Atacar primer y segundo palo", "Rechace preparado"]',
    consignas_defensivas = '["No perder marca", "Despejar al primer contacto", "Cubrir los palos"]',
    errores_comunes = '["Centro sin compañero", "Llegada tarde", "No atacar el balón"]',
    variantes = '[{"nombre": "Centro desde córner corto", "descripcion": "Variante de centro", "dificultad": "+1"}, {"nombre": "Centro sin oposición", "descripcion": "Sin defensa", "dificultad": "-1"}]',
    progresiones = '["Añadir defensor en área", "Tiempo límite", "Centro a primera"]',
    regresiones = '["Sin defensor", "Sin límite", "Centro preparado"]',
    material = '["Petos 2 colores", "Balones x12", "Portería x1", "Conos x6"]',
    como_inicia = 'Pase al extremo que centra',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'EVO-015';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad máxima, potencia anaeróbica',
    objetivo_psicologico = 'Decisión en velocidad máxima',
    reglas_tecnicas = '["Pase al espacio", "Control en velocidad", "Finalización rápida"]',
    reglas_tacticas = '["Contraataque rápido 3v2", "Máxima velocidad", "Finalizar antes de ayuda"]',
    reglas_psicologicas = '["No frenar", "Decisión instantánea", "Mentalidad de gol"]',
    consignas_ofensivas = '["Sprint máximo", "Primer pase vertical", "Finalizar en 8 segundos"]',
    consignas_defensivas = '["Repliegue a máxima velocidad", "Ganar tiempo", "No ir al suelo"]',
    errores_comunes = '["Frenar el ataque", "Pase horizontal", "Esperar a compañeros"]',
    variantes = '[{"nombre": "4v3 rápido", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "3v3 rápido", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Tiempo límite 6s", "Defensor persigue"]',
    regresiones = '["Más superioridad", "Sin límite", "Sin persecución"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x6"]',
    como_inicia = 'Pase largo del portero',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-016';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, combinación interior',
    objetivo_psicologico = 'Visión de juego interior, creatividad',
    reglas_tecnicas = '["Pase entre líneas", "Control orientado", "Combinación rápida"]',
    reglas_tacticas = '["Juego interior obligatorio", "Combinación entre líneas", "Finalización tras combinación"]',
    reglas_psicologicas = '["Buscar el hueco entre líneas", "Paciencia para encontrar el pase", "Creatividad"]',
    consignas_ofensivas = '["Buscar al jugador entre líneas", "Combinación rápida interior", "Finalizar tras pared"]',
    consignas_defensivas = '["Cerrar espacios interiores", "Basculación", "No dejar recibir"]',
    errores_comunes = '["Juego solo exterior", "No buscar el interior", "Combinación lenta"]',
    variantes = '[{"nombre": "5v4 interior", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "4v4 interior", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Obligatorio 2 pases interiores", "Tiempo límite"]',
    regresiones = '["Más superioridad", "1 pase interior", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al jugador de zona media',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-017';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, desmarque de ruptura',
    objetivo_psicologico = 'Timing de ruptura, anticipación',
    reglas_tecnicas = '["Pase filtrado", "Desmarque de ruptura", "Control en carrera"]',
    reglas_tacticas = '["Desmarque obligatorio", "Pase a la espalda", "Finalización tras ruptura"]',
    reglas_psicologicas = '["Anticipar el pase", "Timing perfecto", "Confianza en el desmarque"]',
    consignas_ofensivas = '["Desmarque cuando el pasador levanta la cabeza", "Atacar el espacio", "Pedir el balón"]',
    consignas_defensivas = '["No perder la espalda", "Comunicar el desmarque", "Anticipar"]',
    errores_comunes = '["Desmarque antes de tiempo", "No pedir el balón", "Frenar en el desmarque"]',
    variantes = '[{"nombre": "Ruptura doble", "descripcion": "Dos desmarques", "dificultad": "+1"}, {"nombre": "Ruptura con apoyo", "descripcion": "Con jugador de apoyo", "dificultad": "-1"}]',
    progresiones = '["Dos rupturas", "Defensor activo", "Tiempo límite"]',
    regresiones = '["Una ruptura", "Defensor pasivo", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Portería x1", "Conos x6"]',
    como_inicia = 'Pase al mediocampista que busca la ruptura',
    como_finaliza = 'Gol o parada'
WHERE codigo = 'EVO-018';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, transición desde portero',
    objetivo_psicologico = 'Reacción al saque, anticipación',
    reglas_tecnicas = '["Saque rápido del portero", "Control en carrera", "Finalización en transición"]',
    reglas_tacticas = '["Contraataque desde saque", "Transición vertical", "Superioridad momentánea"]',
    reglas_psicologicas = '["Anticipar el saque", "Reacción inmediata", "Mentalidad de gol"]',
    consignas_ofensivas = '["Movimiento antes del saque", "Atacar el espacio inmediatamente", "No frenar"]',
    consignas_defensivas = '["Repliegue desde el saque rival", "Cerrar espacios", "Ganar tiempo"]',
    errores_comunes = '["No anticipar saque", "Frenar tras recibir", "Esperar a compañeros"]',
    variantes = '[{"nombre": "6v5 saque", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "5v5 saque", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Tiempo límite 10s", "Saque obligatorio corto"]',
    regresiones = '["Más superioridad", "Sin límite", "Saque libre"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x6"]',
    como_inicia = 'Portero saca rápido tras parada',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-019';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia a la potencia, circulación final',
    objetivo_psicologico = 'Paciencia en zona de finalización, no precipitarse',
    reglas_tecnicas = '["Circulación en zona final", "Pase de finalización", "Disparo colocado"]',
    reglas_tacticas = '["Circulación obligatoria antes de finalizar", "Buscar el hueco", "No precipitarse"]',
    reglas_psicologicas = '["Paciencia para encontrar el hueco", "No disparar por disparar", "Calidad sobre cantidad"]',
    consignas_ofensivas = '["Circular hasta encontrar el hueco", "Movimientos de desmarque", "Finalización con criterio"]',
    consignas_defensivas = '["Mantener la forma", "Cerrar líneas de tiro", "No abrir huecos"]',
    errores_comunes = '["Disparar sin hueco", "No circular", "Precipitarse"]',
    variantes = '[{"nombre": "7v6 circulación", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "6v6 circulación", "descripcion": "Igualdad", "dificultad": "+1"}]',
    progresiones = '["Igualdad", "Mínimo 5 pases antes de disparo", "Tiempo límite"]',
    regresiones = '["Más superioridad", "3 pases mínimo", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón en zona de creación',
    como_finaliza = 'Gol o pérdida tras circulación'
WHERE codigo = 'EVO-020';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, juego de espaldas',
    objetivo_psicologico = 'Control de espaldas, protección del balón',
    reglas_tecnicas = '["Control de espaldas", "Protección del balón", "Giro y disparo"]',
    reglas_tacticas = '["Delantero recibe de espaldas", "Apoyo para descargar", "Giro y finalización"]',
    reglas_psicologicas = '["Confianza para recibir de espaldas", "Protección física", "Decisión rápida"]',
    consignas_ofensivas = '["Pedir el balón de espaldas", "Proteger y girar", "Buscar el apoyo o el giro"]',
    consignas_defensivas = '["Presión al pivote", "No dejar girar", "Anticipar la descarga"]',
    errores_comunes = '["Perder el balón en el control", "Girar sin espacio", "No usar el apoyo"]',
    variantes = '[{"nombre": "Pivote con 2 apoyos", "descripcion": "Más opciones", "dificultad": "-1"}, {"nombre": "Pivote 1v1", "descripcion": "Sin apoyo", "dificultad": "+1"}]',
    progresiones = '["Solo un apoyo", "Defensor más agresivo", "Tiempo límite"]',
    regresiones = '["Dos apoyos", "Defensor pasivo", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Portería x1", "Conos x4"]',
    como_inicia = 'Pase al delantero de espaldas',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-021';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica completa',
    objetivo_psicologico = 'Gestión de superioridad mínima, presión',
    reglas_tecnicas = '["Pase al espacio", "Control orientado", "Finalización variada"]',
    reglas_tacticas = '["Superioridad mínima 6v5", "Atacar antes de que llegue ayuda", "Verticalidad"]',
    reglas_psicologicas = '["Aprovechar la ventaja", "No desperdiciar superioridad", "Decisión correcta"]',
    consignas_ofensivas = '["Usar la superioridad inteligentemente", "Buscar el hombre libre", "Finalizar con criterio"]',
    consignas_defensivas = '["Retrasar el ataque", "Ganar tiempo para ayuda", "Cerrar opciones principales"]',
    errores_comunes = '["Desperdiciar superioridad", "No buscar al libre", "Finalización precipitada"]',
    variantes = '[{"nombre": "7v6", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "5v4", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Tiempo límite 10s", "Defensor persigue"]',
    regresiones = '["Menos jugadores", "Sin límite", "Sin persecución"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Pase al primer atacante',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'EVO-022';

-- ============================================================================
-- ATAQUE VS DEFENSA (AVD) - 18 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica de partido',
    objetivo_psicologico = 'Competitividad sectorial, concentración',
    reglas_tecnicas = '["Juego libre técnico", "Control orientado", "Finalización variada"]',
    reglas_tacticas = '["Ataque organizado vs defensa organizada", "Fases de juego reales", "Transiciones incluidas"]',
    reglas_psicologicas = '["Competir como en partido", "Concentración máxima", "Gestión del resultado"]',
    consignas_ofensivas = '["Crear ocasiones de gol", "Movimientos coordinados", "Paciencia y verticalidad"]',
    consignas_defensivas = '["Organización defensiva", "Presión coordinada", "No conceder espacios"]',
    errores_comunes = '["Falta de intensidad", "No aplicar conceptos", "Transiciones lentas"]',
    variantes = '[{"nombre": "8v8+POR", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "6v6+POR", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Tiempo de partido", "Condiciones específicas"]',
    regresiones = '["Menos jugadores", "Sin tiempo", "Sin condiciones"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x12"]',
    como_inicia = 'Saque del portero o balón al defensor',
    como_finaliza = 'Gol, fuera de juego, o tiempo'
WHERE codigo = 'AVD-003';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica sectorial',
    objetivo_psicologico = 'Automatismos defensivos, comunicación',
    reglas_tecnicas = '["Despeje seguro", "Pase de salida", "Anticipación"]',
    reglas_tacticas = '["Línea defensiva coordinada", "Pressing en bloque", "Coberturas"]',
    reglas_psicologicas = '["Comunicación defensiva", "Concentración constante", "Liderazgo"]',
    consignas_ofensivas = '["Buscar espacios entre líneas", "Desmarques de ruptura", "Atacar la espalda"]',
    consignas_defensivas = '["Línea adelantada o atrasada según balón", "Basculación", "Coberturas laterales"]',
    errores_comunes = '["Línea descoordinada", "No comunicar", "Espacios entre centrales"]',
    variantes = '[{"nombre": "Línea de 5", "descripcion": "Más defensores", "dificultad": "-1"}, {"nombre": "Línea de 3", "descripcion": "Menos defensores", "dificultad": "+1"}]',
    progresiones = '["Menos defensores", "Más atacantes", "Tiempo límite"]',
    regresiones = '["Más defensores", "Menos atacantes", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Balón al equipo atacante',
    como_finaliza = 'Gol o recuperación defensiva'
WHERE codigo = 'AVD-004';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia a la fuerza, duelos',
    objetivo_psicologico = 'Ganar duelos individuales, agresividad',
    reglas_tecnicas = '["Duelo aéreo", "Protección de balón", "Anticipación"]',
    reglas_tacticas = '["Duelos 1v1 en todo el campo", "Ayudas defensivas", "Coberturas"]',
    reglas_psicologicas = '["Ganar cada duelo", "No rendirse", "Agresividad controlada"]',
    consignas_ofensivas = '["Ganar el 1v1", "Proteger el balón", "Buscar la falta"]',
    consignas_defensivas = '["No dejar girar", "Temporizar", "Pedir ayuda"]',
    errores_comunes = '["Perder duelos fáciles", "No pedir ayuda", "Exceso de agresividad"]',
    variantes = '[{"nombre": "Con ayudas", "descripcion": "Coberturas permitidas", "dificultad": "-1"}, {"nombre": "Sin ayudas", "descripcion": "Duelo puro", "dificultad": "+1"}]',
    progresiones = '["Sin ayudas", "Más espacio", "Tiempo de duelo"]',
    regresiones = '["Con ayudas", "Menos espacio", "Sin tiempo"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al atacante, comienza duelo',
    como_finaliza = 'Gol o recuperación'
WHERE codigo = 'AVD-005';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, pressing alto',
    objetivo_psicologico = 'Coordinación de pressing, intensidad',
    reglas_tecnicas = '["Presión al primer pase", "Orientación corporal", "Anticipación"]',
    reglas_tacticas = '["Pressing alto coordinado", "Gatillos de pressing", "Coberturas tras presión"]',
    reglas_psicologicas = '["Intensidad máxima", "Comunicación", "No rendirse en la presión"]',
    consignas_ofensivas = '["Superar el pressing", "Usar al portero", "Pase al hombre libre"]',
    consignas_defensivas = '["Presionar al gatillo", "Cerrar líneas de pase", "No ir todos al balón"]',
    errores_comunes = '["Pressing descoordinado", "Ir todos al balón", "No cerrar líneas"]',
    variantes = '[{"nombre": "Pressing ultra alto", "descripcion": "Desde saque", "dificultad": "+1"}, {"nombre": "Pressing medio", "descripcion": "Desde medio campo", "dificultad": "-1"}]',
    progresiones = '["Pressing más alto", "Menos tiempo para salir", "Más presionadores"]',
    regresiones = '["Pressing más bajo", "Más tiempo", "Menos presionadores"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque del portero, pressing activa',
    como_finaliza = 'Superación del pressing o robo'
WHERE codigo = 'AVD-006';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, repliegue',
    objetivo_psicologico = 'Disciplina en repliegue, no precipitarse',
    reglas_tecnicas = '["Carrera defensiva", "Posición de repliegue", "Temporización"]',
    reglas_tacticas = '["Repliegue intensivo", "Defensa en inferioridad temporal", "Organización rápida"]',
    reglas_psicologicas = '["No desesperarse", "Orden en el caos", "Comunicación"]',
    consignas_ofensivas = '["Atacar antes de que replieguen", "Buscar superioridad", "Verticalidad"]',
    consignas_defensivas = '["Repliegue a máxima velocidad", "Ganar tiempo", "Organizar la defensa"]',
    errores_comunes = '["Repliegue lento", "No organizarse", "Entrar en pánico"]',
    variantes = '[{"nombre": "Repliegue desde corner", "descripcion": "Situación real", "dificultad": "+1"}, {"nombre": "Repliegue con ventaja", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["Menos tiempo", "Más atacantes", "Desde más lejos"]',
    regresiones = '["Más tiempo", "Menos atacantes", "Desde más cerca"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Pérdida de balón, inicia repliegue',
    como_finaliza = 'Defensa organizada o gol rival'
WHERE codigo = 'AVD-007';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, trabajo de banda',
    objetivo_psicologico = 'Coordinación lateral-extremo, timing',
    reglas_tecnicas = '["Centro preciso", "Desmarque de ruptura", "Cobertura lateral"]',
    reglas_tacticas = '["Ataque por banda", "Superioridad en banda", "Centro al área"]',
    reglas_psicologicas = '["Timing de incorporación", "Comunicación lateral", "Paciencia"]',
    consignas_ofensivas = '["Crear superioridad en banda", "Centro con criterio", "Atacar el área"]',
    consignas_defensivas = '["No dejar centrar", "Cerrar el 1v1", "Cobertura del central"]',
    errores_comunes = '["Centro sin receptor", "No crear superioridad", "Dejar centrar fácil"]',
    variantes = '[{"nombre": "Ataque ambas bandas", "descripcion": "Dos opciones", "dificultad": "+1"}, {"nombre": "Ataque una banda", "descripcion": "Una opción", "dificultad": "-1"}]',
    progresiones = '["Ambas bandas", "Defensor extra", "Tiempo límite"]',
    regresiones = '["Una banda", "Sin defensor extra", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al lateral o extremo',
    como_finaliza = 'Centro y remate o pérdida'
WHERE codigo = 'AVD-008';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, basculación',
    objetivo_psicologico = 'Concentración en basculación, no perder referencias',
    reglas_tecnicas = '["Basculación rápida", "Posición corporal", "Anticipación"]',
    reglas_tacticas = '["Basculación defensiva", "Cerrar lado fuerte", "No perder lado débil"]',
    reglas_psicologicas = '["Concentración constante", "Comunicar posiciones", "No relajarse"]',
    consignas_ofensivas = '["Cambiar el juego", "Atacar lado débil", "Paciencia"]',
    consignas_defensivas = '["Bascular al balón", "No perder referencias", "Comunicar"]',
    errores_comunes = '["Basculación lenta", "Perder lado débil", "No comunicar"]',
    variantes = '[{"nombre": "Campo completo", "descripcion": "Más espacio", "dificultad": "+1"}, {"nombre": "Medio campo", "descripcion": "Menos espacio", "dificultad": "-1"}]',
    progresiones = '["Más espacio", "Más cambios obligatorios", "Tiempo límite"]',
    regresiones = '["Menos espacio", "Menos cambios", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Balón en una banda',
    como_finaliza = 'Gol tras cambio de orientación o pérdida'
WHERE codigo = 'AVD-009';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, finalización',
    objetivo_psicologico = 'Calma en área, decisión de finalización',
    reglas_tecnicas = '["Finalización variada", "Control en área", "Remate de cabeza"]',
    reglas_tacticas = '["Ataque al área", "Movimientos de desmarque", "Segundas jugadas"]',
    reglas_psicologicas = '["Calma para definir", "Atacar el balón", "No precipitarse"]',
    consignas_ofensivas = '["Movimientos coordinados en área", "Atacar primer y segundo palo", "Rechaces"]',
    consignas_defensivas = '["No perder marca", "Despejar al primer toque", "Comunicar"]',
    errores_comunes = '["Definición precipitada", "No atacar rechaces", "Perder marca"]',
    variantes = '[{"nombre": "Con centro", "descripcion": "Centro obligatorio", "dificultad": "0"}, {"nombre": "Sin centro", "descripcion": "Juego combinativo", "dificultad": "+1"}]',
    progresiones = '["Sin centro", "Más defensores", "Tiempo límite"]',
    regresiones = '["Con centro", "Menos defensores", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x12", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón en zona de creación',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'AVD-010';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia a la fuerza, juego aéreo',
    objetivo_psicologico = 'Dominio aéreo, valentía',
    reglas_tecnicas = '["Salto y timing", "Despeje de cabeza", "Remate de cabeza"]',
    reglas_tacticas = '["Duelo aéreo en área", "Posicionamiento", "Segundas jugadas"]',
    reglas_psicologicas = '["No tener miedo al contacto", "Atacar el balón", "Concentración"]',
    consignas_ofensivas = '["Ganar la posición", "Atacar el balón", "Rechaces"]',
    consignas_defensivas = '["No perder el duelo", "Despejar lejos", "Anticipar"]',
    errores_comunes = '["Llegar tarde al salto", "No anticipar", "Miedo al contacto"]',
    variantes = '[{"nombre": "Solo cabeza", "descripcion": "Remate obligatorio de cabeza", "dificultad": "+1"}, {"nombre": "Cabeza o volea", "descripcion": "Más opciones", "dificultad": "-1"}]',
    progresiones = '["Solo cabeza", "Más defensores", "Centro más rápido"]',
    regresiones = '["Libre", "Menos defensores", "Centro preparado"]',
    material = '["Petos 2 colores", "Balones x12", "Porterías x2", "Conos x6"]',
    como_inicia = 'Centro al área',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'AVD-011';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, contraataque',
    objetivo_psicologico = 'Mentalidad de transición, no relajarse',
    reglas_tecnicas = '["Pase vertical", "Control en carrera", "Finalización rápida"]',
    reglas_tacticas = '["Transición ataque tras recuperación", "Verticalidad inmediata", "Buscar superioridad"]',
    reglas_psicologicas = '["Mentalidad de gol en transición", "No frenar", "Agresividad"]',
    consignas_ofensivas = '["Robo = verticalidad", "Buscar profundidad", "Finalizar antes de repliegue"]',
    consignas_defensivas = '["Transición defensiva inmediata", "Repliegue intensivo", "No rendirse"]',
    errores_comunes = '["Transición lenta", "No buscar profundidad", "Repliegue pasivo"]',
    variantes = '[{"nombre": "Transición con comodín", "descripcion": "Ayuda en transición", "dificultad": "-1"}, {"nombre": "Transición pura", "descripcion": "Sin ayuda", "dificultad": "+1"}]',
    progresiones = '["Sin ayuda", "Tiempo límite 8s", "Más defensores"]',
    regresiones = '["Con ayuda", "Sin límite", "Menos defensores"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Robo de balón',
    como_finaliza = 'Gol en transición o pérdida'
WHERE codigo = 'AVD-012';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, bloque bajo',
    objetivo_psicologico = 'Paciencia defensiva, no precipitarse',
    reglas_tecnicas = '["Posición defensiva baja", "Despeje seguro", "Temporización"]',
    reglas_tacticas = '["Bloque bajo defensivo", "Cerrar espacios", "Contraataque"]',
    reglas_psicologicas = '["Paciencia", "No desesperarse", "Esperar el momento"]',
    consignas_ofensivas = '["Buscar espacios en bloque bajo", "Paciencia", "Cambio de ritmo"]',
    consignas_defensivas = '["Mantener el bloque", "No abrir huecos", "Contraataque al robo"]',
    errores_comunes = '["Romper el bloque", "Precipitarse", "No contraatacar"]',
    variantes = '[{"nombre": "Bloque muy bajo", "descripcion": "Cerca del área", "dificultad": "+1"}, {"nombre": "Bloque medio", "descripcion": "Más adelante", "dificultad": "-1"}]',
    progresiones = '["Bloque más bajo", "Más tiempo de ataque", "Sin contraataque"]',
    regresiones = '["Bloque más alto", "Menos tiempo", "Con contraataque"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Balón al equipo atacante',
    como_finaliza = 'Gol o contraataque exitoso'
WHERE codigo = 'AVD-013';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, circulación ofensiva',
    objetivo_psicologico = 'Paciencia en ataque, no precipitarse',
    reglas_tecnicas = '["Circulación rápida", "Pase al hueco", "Finalización con criterio"]',
    reglas_tacticas = '["Circulación para abrir huecos", "Movimientos de desmarque", "Paciencia"]',
    reglas_psicologicas = '["No forzar", "Buscar el hueco", "Calidad sobre cantidad"]',
    consignas_ofensivas = '["Circular hasta encontrar hueco", "Movimientos coordinados", "Finalizar con criterio"]',
    consignas_defensivas = '["Mantener forma", "Cerrar líneas", "No abrir huecos"]',
    errores_comunes = '["Forzar la jugada", "No circular", "Finalización sin criterio"]',
    variantes = '[{"nombre": "Circulación con tiempo", "descripcion": "Tiempo límite", "dificultad": "+1"}, {"nombre": "Circulación libre", "descripcion": "Sin tiempo", "dificultad": "-1"}]',
    progresiones = '["Con tiempo límite", "Más defensores", "Menos toques"]',
    regresiones = '["Sin límite", "Menos defensores", "Más toques"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Balón al equipo atacante',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'AVD-014';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, marcaje',
    objetivo_psicologico = 'Concentración en marcaje, no perder al hombre',
    reglas_tecnicas = '["Posición de marcaje", "Anticipación", "Interceptación"]',
    reglas_tacticas = '["Marcaje individual o zonal", "No perder referencias", "Ayudas"]',
    reglas_psicologicas = '["Concentración total", "No desconectar", "Comunicar"]',
    consignas_ofensivas = '["Desmarques para perder marca", "Movimientos coordinados", "Crear espacios"]',
    consignas_defensivas = '["No perder al hombre", "Anticipar el desmarque", "Comunicar"]',
    errores_comunes = '["Perder al hombre", "No comunicar", "Desconectar"]',
    variantes = '[{"nombre": "Marcaje individual", "descripcion": "Cada uno su hombre", "dificultad": "+1"}, {"nombre": "Marcaje zonal", "descripcion": "Por zonas", "dificultad": "-1"}]',
    progresiones = '["Marcaje individual", "Más atacantes", "Más movilidad"]',
    regresiones = '["Marcaje zonal", "Menos atacantes", "Menos movilidad"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al equipo atacante',
    como_finaliza = 'Gol o recuperación'
WHERE codigo = 'AVD-015';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, pressing tras pérdida',
    objetivo_psicologico = 'Reacción inmediata a la pérdida',
    reglas_tecnicas = '["Presión al balón", "Orientación corporal", "Anticipación"]',
    reglas_tacticas = '["Pressing tras pérdida 6 segundos", "Recuperar o replegar", "Coordinación"]',
    reglas_psicologicas = '["Reacción instantánea", "No lamentarse", "Máxima intensidad"]',
    consignas_ofensivas = '["Superar el pressing", "Usar el tiempo", "Salir de la presión"]',
    consignas_defensivas = '["Pressing inmediato", "6 segundos máxima intensidad", "Replegar si no recuperas"]',
    errores_comunes = '["No presionar tras pérdida", "Pressing desordenado", "No replegar"]',
    variantes = '[{"nombre": "Pressing 4 segundos", "descripcion": "Más intenso", "dificultad": "+1"}, {"nombre": "Pressing 8 segundos", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["4 segundos", "Más presionadores", "Campo más grande"]',
    regresiones = '["8 segundos", "Menos presionadores", "Campo más pequeño"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Pérdida de balón, inicia pressing',
    como_finaliza = 'Recuperación o repliegue completado'
WHERE codigo = 'AVD-016';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, salida de balón',
    objetivo_psicologico = 'Calma bajo presión, confianza',
    reglas_tecnicas = '["Pase de salida", "Control bajo presión", "Orientación"]',
    reglas_tacticas = '["Salida de balón jugada", "Superar pressing", "Usar al portero"]',
    reglas_psicologicas = '["Calma", "Confianza en el plan", "No precipitarse"]',
    consignas_ofensivas = '["Presionar la salida", "Cerrar opciones", "Forzar error"]',
    consignas_defensivas = '["Ofrecer líneas de pase", "Usar al portero", "Paciencia"]',
    errores_comunes = '["Precipitarse", "No usar al portero", "Pase arriesgado"]',
    variantes = '[{"nombre": "Salida presionada", "descripcion": "Pressing alto rival", "dificultad": "+1"}, {"nombre": "Salida libre", "descripcion": "Sin pressing", "dificultad": "-1"}]',
    progresiones = '["Más pressing", "Menos toques", "Tiempo límite"]',
    regresiones = '["Menos pressing", "Más toques", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Superación del pressing o pérdida'
WHERE codigo = 'AVD-017';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica completa',
    objetivo_psicologico = 'Competitividad máxima, como partido',
    reglas_tecnicas = '["Todas las técnicas", "Juego real", "Finalización variada"]',
    reglas_tacticas = '["Partido sectorial completo", "Todas las fases", "Transiciones"]',
    reglas_psicologicas = '["Competir al máximo", "Concentración total", "Gestión emocional"]',
    consignas_ofensivas = '["Aplicar conceptos de partido", "Crear ocasiones", "Finalizar"]',
    consignas_defensivas = '["Defender como en partido", "Comunicación", "No conceder"]',
    errores_comunes = '["No competir", "No aplicar conceptos", "Falta de intensidad"]',
    variantes = '[{"nombre": "11v11 sectorial", "descripcion": "Completo", "dificultad": "+1"}, {"nombre": "7v7 sectorial", "descripcion": "Reducido", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Más tiempo", "Condiciones de partido"]',
    regresiones = '["Menos jugadores", "Menos tiempo", "Sin condiciones"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x12"]',
    como_inicia = 'Saque de centro o portero',
    como_finaliza = 'Tiempo de partido o goles'
WHERE codigo = 'AVD-018';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, defensa de área',
    objetivo_psicologico = 'Concentración en área, no conceder',
    reglas_tecnicas = '["Despeje seguro", "Posición defensiva", "Anticipación"]',
    reglas_tacticas = '["Defensa del área", "Cerrar espacios de remate", "Segundas jugadas"]',
    reglas_psicologicas = '["Concentración máxima", "No conceder", "Valentía"]',
    consignas_ofensivas = '["Crear ocasiones en área", "Movimientos de desmarque", "Atacar rechaces"]',
    consignas_defensivas = '["Cerrar el área", "No dejar rematar", "Despejar lejos"]',
    errores_comunes = '["Dejar rematar fácil", "No despejar", "Perder segundas jugadas"]',
    variantes = '[{"nombre": "Defensa con menos", "descripcion": "Inferioridad", "dificultad": "+1"}, {"nombre": "Defensa con más", "descripcion": "Superioridad", "dificultad": "-1"}]',
    progresiones = '["Inferioridad defensiva", "Más atacantes", "Tiempo de ataque"]',
    regresiones = '["Superioridad defensiva", "Menos atacantes", "Sin tiempo"]',
    material = '["Petos 2 colores", "Balones x12", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón en zona de finalización',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'AVD-019';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, pressing coordinado',
    objetivo_psicologico = 'Coordinación de equipo, comunicación',
    reglas_tecnicas = '["Presión al balón", "Cobertura", "Anticipación"]',
    reglas_tacticas = '["Pressing coordinado por zonas", "Gatillos claros", "Coberturas"]',
    reglas_psicologicas = '["Trabajo en equipo", "Comunicación", "No ir solo"]',
    consignas_ofensivas = '["Superar pressing", "Usar tiempos", "Salir por banda o centro"]',
    consignas_defensivas = '["Pressing al gatillo", "Cerrar opciones", "No ir todos"]',
    errores_comunes = '["Pressing individual", "No cerrar opciones", "Ir todos al balón"]',
    variantes = '[{"nombre": "Pressing alto", "descripcion": "Desde saque", "dificultad": "+1"}, {"nombre": "Pressing medio", "descripcion": "Desde medio campo", "dificultad": "-1"}]',
    progresiones = '["Pressing más alto", "Más presionadores", "Gatillo más estricto"]',
    regresiones = '["Pressing más bajo", "Menos presionadores", "Gatillo más flexible"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque del portero rival',
    como_finaliza = 'Recuperación o superación del pressing'
WHERE codigo = 'AVD-020';

-- ============================================================================
-- PARTIDO CONDICIONADO (PCO) - 18 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Resistencia de partido, todas las capacidades',
    objetivo_psicologico = 'Aplicar conceptos en competición real',
    reglas_tecnicas = '["Juego libre", "Aplicar técnica en contexto", "Finalización variada"]',
    reglas_tacticas = '["Partido real con condiciones", "Transferencia al partido", "Fases de juego completas"]',
    reglas_psicologicas = '["Competir al máximo", "Aplicar lo entrenado", "Gestión emocional"]',
    consignas_ofensivas = '["Aplicar modelo de juego", "Crear ocasiones", "Finalizar con criterio"]',
    consignas_defensivas = '["Defender según plan", "Organización", "No conceder fácil"]',
    errores_comunes = '["No aplicar condiciones", "Falta de intensidad", "No competir"]',
    variantes = '[{"nombre": "10v10", "descripcion": "Casi completo", "dificultad": "+1"}, {"nombre": "7v7", "descripcion": "Reducido", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Más condiciones", "Tiempo de partido"]',
    regresiones = '["Menos jugadores", "Menos condiciones", "Menos tiempo"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías reglamentarias x2", "Conos x12"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-002';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia de partido con transiciones',
    objetivo_psicologico = 'Mentalidad de transición constante',
    reglas_tecnicas = '["Transiciones rápidas", "Control orientado", "Finalización en velocidad"]',
    reglas_tacticas = '["Énfasis en transiciones", "Verticalidad tras robo", "Repliegue tras pérdida"]',
    reglas_psicologicas = '["Reacción inmediata", "No lamentarse", "Siguiente acción"]',
    consignas_ofensivas = '["Robo = ataque inmediato", "Buscar profundidad", "No frenar"]',
    consignas_defensivas = '["Pérdida = defensa inmediata", "Repliegue rápido", "Organizar"]',
    errores_comunes = '["Transición lenta", "No aplicar la condición", "Quedarse lamentando"]',
    variantes = '[{"nombre": "Transición en 5s", "descripcion": "Muy rápido", "dificultad": "+1"}, {"nombre": "Transición en 10s", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["5 segundos", "Campo más grande", "Gol doble en transición"]',
    regresiones = '["10 segundos", "Campo más pequeño", "Gol normal"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-003';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia aeróbica con toques limitados',
    objetivo_psicologico = 'Velocidad mental, decisión rápida',
    reglas_tecnicas = '["Máximo 2-3 toques", "Control orientado", "Pase rápido"]',
    reglas_tacticas = '["Juego rápido obligatorio", "Pensar antes de recibir", "Movilidad constante"]',
    reglas_psicologicas = '["Anticipar el pase", "No dudar", "Velocidad mental"]',
    consignas_ofensivas = '["Pensar antes de recibir", "Ofrecer siempre", "Juego asociativo"]',
    consignas_defensivas = '["Presionar al primer toque", "Anticipar", "No dar tiempo"]',
    errores_comunes = '["Pensar después de recibir", "No ofrecer opciones", "Juego lento"]',
    variantes = '[{"nombre": "2 toques", "descripcion": "Más rápido", "dificultad": "+1"}, {"nombre": "3 toques", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["2 toques", "Espacio reducido", "Tiempo corto"]',
    regresiones = '["3 toques", "Espacio amplio", "Más tiempo"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-004';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con pressing alto',
    objetivo_psicologico = 'Intensidad de pressing, coordinación',
    reglas_tecnicas = '["Presión al balón", "Orientación corporal", "Anticipación"]',
    reglas_tacticas = '["Pressing alto obligatorio", "Recuperar en campo rival", "Gatillos claros"]',
    reglas_psicologicas = '["Intensidad máxima en pressing", "No rendirse", "Trabajo en equipo"]',
    consignas_ofensivas = '["Superar pressing", "Usar al portero", "Paciencia"]',
    consignas_defensivas = '["Pressing al gatillo", "Cerrar opciones", "No ir todos"]',
    errores_comunes = '["Pressing descoordinado", "Bajar la intensidad", "No respetar gatillos"]',
    variantes = '[{"nombre": "Gol doble en pressing", "descripcion": "Incentivo", "dificultad": "+1"}, {"nombre": "Pressing normal", "descripcion": "Sin incentivo", "dificultad": "-1"}]',
    progresiones = '["Gol doble", "Pressing más alto", "Más tiempo"]',
    regresiones = '["Gol normal", "Pressing medio", "Menos tiempo"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-005';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con zonas obligatorias',
    objetivo_psicologico = 'Disciplina posicional, comprensión táctica',
    reglas_tecnicas = '["Pase entre zonas", "Control orientado", "Circulación"]',
    reglas_tacticas = '["Pasar por zonas específicas antes de finalizar", "Progresión ordenada", "No saltarse zonas"]',
    reglas_psicologicas = '["Paciencia", "Disciplina táctica", "No precipitarse"]',
    consignas_ofensivas = '["Respetar las zonas", "Progresión ordenada", "Paciencia"]',
    consignas_defensivas = '["Cerrar zonas de progresión", "Pressing zonal", "Comunicar"]',
    errores_comunes = '["Saltarse zonas", "Precipitarse", "No respetar condición"]',
    variantes = '[{"nombre": "3 zonas", "descripcion": "Más progresión", "dificultad": "+1"}, {"nombre": "2 zonas", "descripcion": "Menos zonas", "dificultad": "-1"}]',
    progresiones = '["Más zonas", "Menos tiempo en zona", "Más defensores"]',
    regresiones = '["Menos zonas", "Más tiempo", "Menos defensores"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x16"]',
    como_inicia = 'Saque del portero',
    como_finaliza = 'Gol tras pasar por zonas o tiempo'
WHERE codigo = 'PCO-006';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con superioridad/inferioridad',
    objetivo_psicologico = 'Gestión de ventaja/desventaja numérica',
    reglas_tecnicas = '["Adaptación al número", "Juego inteligente", "Decisiones correctas"]',
    reglas_tacticas = '["Jugar con más o menos", "Usar superioridad", "Defender en inferioridad"]',
    reglas_psicologicas = '["Gestión de la ventaja", "No rendirse en inferioridad", "Inteligencia"]',
    consignas_ofensivas = '["Usar la superioridad", "Paciencia", "Buscar el hueco"]',
    consignas_defensivas = '["Cerrar espacios en inferioridad", "No conceder", "Contraataque"]',
    errores_comunes = '["No usar superioridad", "Rendirse en inferioridad", "Falta de paciencia"]',
    variantes = '[{"nombre": "2 jugadores de diferencia", "descripcion": "Más diferencia", "dificultad": "+1"}, {"nombre": "1 jugador de diferencia", "descripcion": "Menos diferencia", "dificultad": "-1"}]',
    progresiones = '["Más diferencia", "Cambios de ventaja", "Tiempo"]',
    regresiones = '["Menos diferencia", "Ventaja fija", "Menos tiempo"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque con ventaja para un equipo',
    como_finaliza = 'Tiempo o cambio de ventaja'
WHERE codigo = 'PCO-007';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con comodines',
    objetivo_psicologico = 'Uso del hombre libre, inteligencia',
    reglas_tecnicas = '["Pase al comodín", "Control orientado", "Triangulaciones"]',
    reglas_tacticas = '["Comodines siempre con posesión", "Usar superioridad", "No ignorar comodines"]',
    reglas_psicologicas = '["Buscar al libre", "No precipitarse", "Inteligencia táctica"]',
    consignas_ofensivas = '["Usar comodines", "Superioridad numérica", "Triangular"]',
    consignas_defensivas = '["No salir a comodines", "Cerrar centro", "Pressing inteligente"]',
    errores_comunes = '["Ignorar comodines", "Comodines estáticos", "No usar superioridad"]',
    variantes = '[{"nombre": "3 comodines", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "1 comodín", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    progresiones = '["Menos comodines", "1 toque comodines", "Espacio reducido"]',
    regresiones = '["Más comodines", "Libre comodines", "Espacio amplio"]',
    material = '["Petos 3 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-008';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con porterías múltiples',
    objetivo_psicologico = 'Visión de juego, opciones múltiples',
    reglas_tecnicas = '["Finalización variada", "Cambio de orientación", "Pase preciso"]',
    reglas_tacticas = '["Atacar varias porterías", "Defender varias porterías", "Cambio de juego"]',
    reglas_psicologicas = '["Visión periférica", "Decisión correcta", "No predecible"]',
    consignas_ofensivas = '["Buscar la portería libre", "Cambiar el juego", "No ser predecible"]',
    consignas_defensivas = '["Cerrar porterías", "Basculación", "Comunicar"]',
    errores_comunes = '["Atacar siempre la misma", "No cambiar", "Predecible"]',
    variantes = '[{"nombre": "4 porterías", "descripcion": "Más opciones", "dificultad": "+1"}, {"nombre": "2 porterías", "descripcion": "Normal", "dificultad": "-1"}]',
    progresiones = '["Más porterías", "Porterías pequeñas", "Campo más grande"]',
    regresiones = '["Menos porterías", "Porterías grandes", "Campo más pequeño"]',
    material = '["Petos 2 colores", "Balones x10", "Mini porterías x4-6", "Conos x12"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-009';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con puntuación especial',
    objetivo_psicologico = 'Objetivos específicos, motivación extra',
    reglas_tecnicas = '["Técnica según objetivo", "Finalización variada", "Juego adaptado"]',
    reglas_tacticas = '["Puntuación según objetivo táctico", "Buscar goles de más valor", "Adaptar el juego"]',
    reglas_psicologicas = '["Buscar objetivos de alto valor", "Gestión de puntuación", "Motivación"]',
    consignas_ofensivas = '["Buscar goles de más puntos", "Adaptar el juego", "Ser inteligente"]',
    consignas_defensivas = '["No conceder goles de alto valor", "Priorizar", "Organización"]',
    errores_comunes = '["Ignorar puntuación especial", "No adaptar", "Falta de motivación"]',
    variantes = '[{"nombre": "Gol de transición x3", "descripcion": "Incentivo transición", "dificultad": "+1"}, {"nombre": "Gol de cabeza x2", "descripcion": "Incentivo aéreo", "dificultad": "0"}]',
    progresiones = '["Más tipos de gol especial", "Valores más altos", "Más condiciones"]',
    regresiones = '["Menos tipos", "Valores menores", "Menos condiciones"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10", "Marcador"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo o puntuación objetivo'
WHERE codigo = 'PCO-010';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con inicio condicionado',
    objetivo_psicologico = 'Adaptación a situaciones específicas',
    reglas_tecnicas = '["Técnica de salida", "Control bajo presión", "Decisión rápida"]',
    reglas_tacticas = '["Inicio desde situación específica", "Aplicar solución", "Transición"]',
    reglas_psicologicas = '["Reacción al inicio", "Concentración", "Aplicar lo entrenado"]',
    consignas_ofensivas = '["Aplicar solución de salida", "Superar presión", "Progresar"]',
    consignas_defensivas = '["Presionar el inicio", "Cerrar opciones", "Forzar error"]',
    errores_comunes = '["No aplicar la solución", "Precipitarse", "No reaccionar"]',
    variantes = '[{"nombre": "Inicio con pressing", "descripcion": "Bajo presión", "dificultad": "+1"}, {"nombre": "Inicio libre", "descripcion": "Sin presión", "dificultad": "-1"}]',
    progresiones = '["Más pressing", "Menos tiempo", "Situación más difícil"]',
    regresiones = '["Menos pressing", "Más tiempo", "Situación más fácil"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Situación específica (saque lateral, falta, etc.)',
    como_finaliza = 'Finalización o pérdida'
WHERE codigo = 'PCO-011';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con finalización obligatoria',
    objetivo_psicologico = 'Buscar el gol, mentalidad ofensiva',
    reglas_tecnicas = '["Finalización variada", "Disparo a portería", "Remate"]',
    reglas_tacticas = '["Finalizar antes de X tiempo/pases", "Buscar el gol", "No conservar"]',
    reglas_psicologicas = '["Mentalidad de gol", "No conformarse", "Buscar siempre el gol"]',
    consignas_ofensivas = '["Buscar finalización", "No conservar", "Disparar con criterio"]',
    consignas_defensivas = '["Cerrar líneas de tiro", "No dejar finalizar", "Bloquear"]',
    errores_comunes = '["No finalizar", "Conservar el balón", "Disparo sin criterio"]',
    variantes = '[{"nombre": "Finalizar en 6 pases", "descripcion": "Muy directo", "dificultad": "+1"}, {"nombre": "Finalizar en 10 pases", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["Menos pases", "Tiempo límite", "Zona de finalización"]',
    regresiones = '["Más pases", "Sin tiempo", "Sin zona"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Finalización o pérdida del turno'
WHERE codigo = 'PCO-012';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con cambio de campo',
    objetivo_psicologico = 'Visión de cambio, paciencia',
    reglas_tecnicas = '["Pase largo preciso", "Control orientado", "Cambio de juego"]',
    reglas_tacticas = '["Cambio de orientación obligatorio", "Atacar lado débil", "No ser directo"]',
    reglas_psicologicas = '["Paciencia", "Buscar el cambio", "No precipitarse"]',
    consignas_ofensivas = '["Cambiar el juego", "Atacar lado débil", "Paciencia"]',
    consignas_defensivas = '["Basculación rápida", "No perder lado débil", "Comunicar"]',
    errores_comunes = '["No cambiar", "Cambio precipitado", "Basculación lenta"]',
    variantes = '[{"nombre": "Cambio cada 5 pases", "descripcion": "Frecuente", "dificultad": "+1"}, {"nombre": "Cambio cada 10 pases", "descripcion": "Menos frecuente", "dificultad": "-1"}]',
    progresiones = '["Más frecuente", "Campo más grande", "Tiempo límite"]',
    regresiones = '["Menos frecuente", "Campo más pequeño", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x12"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-013';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con línea de fuera de juego',
    objetivo_psicologico = 'Timing de desmarque, concentración',
    reglas_tecnicas = '["Desmarque de ruptura", "Pase filtrado", "Control del timing"]',
    reglas_tacticas = '["Línea de fuera de juego activa", "Desmarques coordinados", "Trampa del fuera de juego"]',
    reglas_psicologicas = '["Timing perfecto", "Concentración", "Comunicación"]',
    consignas_ofensivas = '["No caer en fuera de juego", "Timing de desmarque", "Pase al momento"]',
    consignas_defensivas = '["Adelantar línea coordinadamente", "Trampa del fuera de juego", "Comunicar"]',
    errores_comunes = '["Caer en fuera de juego", "Línea descoordinada", "No comunicar"]',
    variantes = '[{"nombre": "Línea muy activa", "descripcion": "Trampa constante", "dificultad": "+1"}, {"nombre": "Línea pasiva", "descripcion": "Menos trampa", "dificultad": "-1"}]',
    progresiones = '["Más activa", "Campo más corto", "Fuera de juego = punto rival"]',
    regresiones = '["Menos activa", "Campo más largo", "Sin penalización"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-014';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con reanudaciones',
    objetivo_psicologico = 'Concentración en reanudaciones, aprovechar situaciones',
    reglas_tecnicas = '["Saque rápido", "Posicionamiento", "Aprovechamiento"]',
    reglas_tacticas = '["Reanudaciones rápidas", "Aprovechar desorganización", "Estar preparado"]',
    reglas_psicologicas = '["Concentración constante", "Aprovechar oportunidades", "No relajarse"]',
    consignas_ofensivas = '["Sacar rápido si hay ventaja", "Posicionarse rápido", "Aprovechar"]',
    consignas_defensivas = '["Organizarse rápido", "No relajarse", "Estar preparado"]',
    errores_comunes = '["No aprovechar", "Relajarse en reanudación", "Desorganización"]',
    variantes = '[{"nombre": "Saque en 3s", "descripcion": "Muy rápido", "dificultad": "+1"}, {"nombre": "Saque en 6s", "descripcion": "Más tiempo", "dificultad": "-1"}]',
    progresiones = '["Menos tiempo", "Gol doble en reanudación", "Más reanudaciones"]',
    regresiones = '["Más tiempo", "Gol normal", "Menos reanudaciones"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Reanudación (lateral, falta, etc.)',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-015';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia completa de partido',
    objetivo_psicologico = 'Simulación de partido real',
    reglas_tecnicas = '["Todas las técnicas", "Juego real", "Aplicar todo"]',
    reglas_tacticas = '["Partido con mínimas condiciones", "Aplicar modelo de juego", "Transferencia total"]',
    reglas_psicologicas = '["Competir al máximo", "Concentración total", "Gestión de partido"]',
    consignas_ofensivas = '["Aplicar todo lo entrenado", "Crear ocasiones", "Finalizar"]',
    consignas_defensivas = '["Defender según modelo", "No conceder", "Organización total"]',
    errores_comunes = '["No aplicar conceptos", "Falta de intensidad", "No competir"]',
    variantes = '[{"nombre": "11v11", "descripcion": "Completo", "dificultad": "+1"}, {"nombre": "9v9", "descripcion": "Casi completo", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Más tiempo", "Condiciones de competición"]',
    regresiones = '["Menos jugadores", "Menos tiempo", "Sin condiciones"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías reglamentarias x2", "Conos x12"]',
    como_inicia = 'Saque de centro',
    como_finaliza = 'Tiempo de partido real'
WHERE codigo = 'PCO-016';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con pressing tras gol',
    objetivo_psicologico = 'Reacción al gol, no relajarse',
    reglas_tecnicas = '["Presión inmediata", "Orientación", "Anticipación"]',
    reglas_tacticas = '["Pressing inmediato tras marcar", "No relajarse", "Buscar el segundo"]',
    reglas_psicologicas = '["No conformarse", "Mentalidad ganadora", "Intensidad constante"]',
    consignas_ofensivas = '["Superar pressing post-gol", "Calma", "Salir bien"]',
    consignas_defensivas = '["Pressing máximo tras marcar", "Buscar el segundo", "No relajarse"]',
    errores_comunes = '["Relajarse tras gol", "No presionar", "Conformarse"]',
    variantes = '[{"nombre": "Gol doble en pressing", "descripcion": "Incentivo", "dificultad": "+1"}, {"nombre": "Sin incentivo", "descripcion": "Normal", "dificultad": "-1"}]',
    progresiones = '["Gol doble", "Pressing 30s", "Campo más grande"]',
    regresiones = '["Sin incentivo", "Pressing 15s", "Campo más pequeño"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque tras gol',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-017';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con gestión de resultado',
    objetivo_psicologico = 'Gestión de ventaja/desventaja',
    reglas_tecnicas = '["Juego inteligente", "Gestión del tiempo", "Decisiones correctas"]',
    reglas_tacticas = '["Gestionar resultado", "Jugar según marcador", "Adaptación"]',
    reglas_psicologicas = '["No relajarse ganando", "No rendirse perdiendo", "Inteligencia emocional"]',
    consignas_ofensivas = '["Buscar gol si perdemos", "Gestionar si ganamos", "Ser inteligente"]',
    consignas_defensivas = '["No conceder si ganamos", "Arriesgar si perdemos", "Adaptación"]',
    errores_comunes = '["Relajarse ganando", "Rendirse perdiendo", "No adaptarse"]',
    variantes = '[{"nombre": "Resultado ficticio", "descripcion": "Simular resultado", "dificultad": "+1"}, {"nombre": "Resultado real", "descripcion": "Marcador actual", "dificultad": "-1"}]',
    progresiones = '["Resultado adverso", "Poco tiempo", "Más presión"]',
    regresiones = '["Resultado favorable", "Más tiempo", "Menos presión"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10", "Marcador"]',
    como_inicia = 'Con resultado establecido',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-018';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con porteros-jugadores',
    objetivo_psicologico = 'Integración del portero, confianza',
    reglas_tecnicas = '["Portero con los pies", "Pase corto", "Control bajo presión"]',
    reglas_tacticas = '["Portero como jugador extra", "Salida jugada obligatoria", "Superioridad en salida"]',
    reglas_psicologicas = '["Confianza en el portero", "No precipitarse", "Usar al portero"]',
    consignas_ofensivas = '["Usar al portero", "Superioridad en salida", "Paciencia"]',
    consignas_defensivas = '["Presionar al portero", "Cerrar opciones", "No dejar salir jugado"]',
    errores_comunes = '["No usar al portero", "Portero precipitado", "Pase arriesgado"]',
    variantes = '[{"nombre": "Portero obligatorio cada 5", "descripcion": "Más uso", "dificultad": "+1"}, {"nombre": "Portero opcional", "descripcion": "Uso libre", "dificultad": "-1"}]',
    progresiones = '["Uso obligatorio frecuente", "Pressing al portero", "Tiempo límite"]',
    regresiones = '["Uso opcional", "Sin pressing", "Sin límite"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x10"]',
    como_inicia = 'Saque del portero obligatorio jugado',
    como_finaliza = 'Tiempo de partido'
WHERE codigo = 'PCO-019';

-- ============================================================================
-- SMALL SIDED GAMES / FÚTBOL REDUCIDO (SSG) - 20 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica, duelos de alta intensidad',
    objetivo_psicologico = 'Competitividad máxima en espacio reducido',
    reglas_tecnicas = '["Regate en espacio corto", "Pase rápido", "Finalización inmediata"]',
    reglas_tacticas = '["Juego reducido 3v3", "Alta densidad", "Transiciones constantes"]',
    reglas_psicologicas = '["Ganar cada duelo", "Intensidad máxima", "No rendirse"]',
    consignas_ofensivas = '["Buscar el 1v1", "Finalizar rápido", "Movimiento constante"]',
    consignas_defensivas = '["Presión inmediata", "No dejar pensar", "Ganar el duelo"]',
    errores_comunes = '["Falta de intensidad", "No finalizar", "Duelos perdidos"]',
    variantes = '[{"nombre": "4v4", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "2v2", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Menos espacio", "Más tiempo"]',
    regresiones = '["Menos jugadores", "Más espacio", "Menos tiempo"]',
    material = '["Petos 2 colores", "Balones x6", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-002';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica, sprints repetidos',
    objetivo_psicologico = 'Resistencia mental en fatiga',
    reglas_tecnicas = '["Control rápido", "Pase corto", "Disparo potente"]',
    reglas_tacticas = '["4v4 intensivo", "Transiciones rápidas", "Alta densidad de acciones"]',
    reglas_psicologicas = '["No bajar intensidad", "Competir hasta el final", "Gestión de fatiga"]',
    consignas_ofensivas = '["Atacar el espacio", "Finalizar con potencia", "Movimiento sin balón"]',
    consignas_defensivas = '["Pressing agresivo", "No dejar respirar", "Ganar duelos"]',
    errores_comunes = '["Bajar intensidad", "No presionar", "Falta de movimiento"]',
    variantes = '[{"nombre": "5v5", "descripcion": "Más jugadores", "dificultad": "+1"}, {"nombre": "3v3", "descripcion": "Menos jugadores", "dificultad": "-1"}]',
    progresiones = '["Más jugadores", "Más tiempo", "Series más largas"]',
    regresiones = '["Menos jugadores", "Menos tiempo", "Series más cortas"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo de serie'
WHERE codigo = 'SSG-003';

UPDATE tareas SET
    objetivo_fisico = 'Fuerza resistencia, duelos físicos',
    objetivo_psicologico = 'Agresividad controlada, ganar contactos',
    reglas_tecnicas = '["Protección de balón", "Regate en contacto", "Disparo bajo presión"]',
    reglas_tacticas = '["SSG con énfasis en duelos", "Ganar el 1v1", "Superioridad por duelo"]',
    reglas_psicologicas = '["Agresividad", "No tener miedo al contacto", "Ganar cada choque"]',
    consignas_ofensivas = '["Ganar el duelo para progresar", "Proteger el balón", "Buscar la falta"]',
    consignas_defensivas = '["Ganar el cuerpo", "No dejar girar", "Presión física"]',
    errores_comunes = '["Evitar el contacto", "Perder duelos", "Falta de agresividad"]',
    variantes = '[{"nombre": "Con porteros", "descripcion": "Más real", "dificultad": "+1"}, {"nombre": "Sin porteros", "descripcion": "Mini porterías", "dificultad": "-1"}]',
    progresiones = '["Con porteros", "Más duelos obligatorios", "Menos espacio"]',
    regresiones = '["Sin porteros", "Duelos opcionales", "Más espacio"]',
    material = '["Petos 2 colores", "Balones x8", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-004';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica, resistencia a esfuerzos',
    objetivo_psicologico = 'Concentración en fatiga',
    reglas_tecnicas = '["Técnica bajo fatiga", "Pase preciso cansado", "Finalización en fatiga"]',
    reglas_tacticas = '["SSG con series largas", "Mantener calidad", "No bajar nivel"]',
    reglas_psicologicas = '["Mantener concentración", "No rendirse físicamente", "Calidad en fatiga"]',
    consignas_ofensivas = '["Mantener nivel técnico", "No precipitarse", "Finalizar bien"]',
    consignas_defensivas = '["No bajar intensidad defensiva", "Comunicar", "Ayudas"]',
    errores_comunes = '["Bajar calidad técnica", "Rendirse físicamente", "Perder concentración"]',
    variantes = '[{"nombre": "Series de 5 min", "descripcion": "Más largo", "dificultad": "+1"}, {"nombre": "Series de 2 min", "descripcion": "Más corto", "dificultad": "-1"}]',
    progresiones = '["Series más largas", "Menos descanso", "Más jugadores"]',
    regresiones = '["Series más cortas", "Más descanso", "Menos jugadores"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Tiempo de serie'
WHERE codigo = 'SSG-005';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de reacción, cambios de dirección',
    objetivo_psicologico = 'Reacción rápida a estímulos',
    reglas_tecnicas = '["Control instantáneo", "Pase a primera", "Finalización rápida"]',
    reglas_tacticas = '["SSG con estímulos", "Reacción al silbato", "Transiciones al estímulo"]',
    reglas_psicologicas = '["Concentración en el estímulo", "Reacción explosiva", "No anticipar"]',
    consignas_ofensivas = '["Reaccionar al estímulo", "Atacar inmediatamente", "Finalizar rápido"]',
    consignas_defensivas = '["Transición al estímulo", "No anticipar", "Reacción defensiva"]',
    errores_comunes = '["Anticipar el estímulo", "Reacción lenta", "No transicionar"]',
    variantes = '[{"nombre": "Estímulo visual", "descripcion": "Señal visual", "dificultad": "+1"}, {"nombre": "Estímulo auditivo", "descripcion": "Silbato", "dificultad": "-1"}]',
    progresiones = '["Estímulo visual", "Más estímulos", "Menos tiempo de reacción"]',
    regresiones = '["Estímulo auditivo", "Menos estímulos", "Más tiempo"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8", "Silbato"]',
    como_inicia = 'Estímulo del entrenador',
    como_finaliza = 'Finalización o pérdida'
WHERE codigo = 'SSG-006';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica con finalizaciones',
    objetivo_psicologico = 'Mentalidad de gol, no rendirse',
    reglas_tecnicas = '["Finalización variada", "Disparo desde cualquier posición", "Remate de volea"]',
    reglas_tacticas = '["SSG con énfasis en gol", "Disparar siempre que sea posible", "Rechaces"]',
    reglas_psicologicas = '["Buscar el gol", "No conformarse", "Atacar rechaces"]',
    consignas_ofensivas = '["Disparar con criterio", "Atacar rechaces", "No desaprovechar"]',
    consignas_defensivas = '["Bloquear disparos", "No dejar rematar", "Despejar lejos"]',
    errores_comunes = '["No disparar", "Desaprovechar ocasiones", "No ir a rechaces"]',
    variantes = '[{"nombre": "Gol fuera área x2", "descripcion": "Incentivo distancia", "dificultad": "+1"}, {"nombre": "Gol normal", "descripcion": "Sin incentivo", "dificultad": "-1"}]',
    progresiones = '["Incentivo distancia", "Menos tiempo para disparar", "Más porteros"]',
    regresiones = '["Sin incentivo", "Más tiempo", "Menos porteros"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-007';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica, trabajo intermitente',
    objetivo_psicologico = 'Gestión del esfuerzo, intensidad variable',
    reglas_tecnicas = '["Técnica en intensidad variable", "Control en velocidad", "Pase preciso"]',
    reglas_tacticas = '["SSG con pausas activas", "Intensidad variable", "Recuperación activa"]',
    reglas_psicologicas = '["Gestionar la intensidad", "No rendirse en picos", "Recuperar en pausas"]',
    consignas_ofensivas = '["Máxima intensidad en juego", "Recuperar en pausas", "Atacar en picos"]',
    consignas_defensivas = '["Mantener pressing", "Recuperar posición en pausas", "No bajar"]',
    errores_comunes = '["No variar intensidad", "No recuperar", "Bajar demasiado"]',
    variantes = '[{"nombre": "30s juego / 15s pausa", "descripcion": "Más intenso", "dificultad": "+1"}, {"nombre": "45s juego / 30s pausa", "descripcion": "Más pausa", "dificultad": "-1"}]',
    progresiones = '["Menos pausa", "Más tiempo de juego", "Más series"]',
    regresiones = '["Más pausa", "Menos tiempo de juego", "Menos series"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8", "Cronómetro"]',
    como_inicia = 'Silbato inicio',
    como_finaliza = 'Silbato fin de serie'
WHERE codigo = 'SSG-008';

UPDATE tareas SET
    objetivo_fisico = 'Fuerza explosiva, arranques',
    objetivo_psicologico = 'Explosividad mental y física',
    reglas_tecnicas = '["Arranque explosivo", "Control en velocidad", "Finalización potente"]',
    reglas_tacticas = '["SSG con arranques", "Duelos de velocidad", "Transiciones explosivas"]',
    reglas_psicologicas = '["Explosividad", "Ganar la carrera", "No dudar"]',
    consignas_ofensivas = '["Arranques explosivos", "Ganar el espacio", "Finalizar en velocidad"]',
    consignas_defensivas = '["Reacción explosiva", "No perder la carrera", "Anticipar"]',
    errores_comunes = '["Arranque lento", "Perder carreras", "No ser explosivo"]',
    variantes = '[{"nombre": "Arranque desde parado", "descripcion": "Explosividad pura", "dificultad": "+1"}, {"nombre": "Arranque en movimiento", "descripcion": "Con inercia", "dificultad": "-1"}]',
    progresiones = '["Desde parado", "Más distancia", "Con oposición"]',
    regresiones = '["En movimiento", "Menos distancia", "Sin oposición"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x10"]',
    como_inicia = 'Estímulo de arranque',
    como_finaliza = 'Finalización o pérdida'
WHERE codigo = 'SSG-009';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia a la fuerza, contacto continuo',
    objetivo_psicologico = 'Resistir el contacto físico',
    reglas_tecnicas = '["Juego en contacto", "Protección continua", "Pase bajo presión física"]',
    reglas_tacticas = '["SSG físico", "Duelos constantes", "Ganar el cuerpo"]',
    reglas_psicologicas = '["No temer el contacto", "Resistir físicamente", "Ganar duelos físicos"]',
    consignas_ofensivas = '["Aguantar el contacto", "Progresar en el duelo", "Finalizar bajo presión"]',
    consignas_defensivas = '["Presión física constante", "No dejar recibir cómodo", "Ganar el cuerpo"]',
    errores_comunes = '["Evitar contacto", "Perder duelos físicos", "No aguantar"]',
    variantes = '[{"nombre": "Contacto permitido total", "descripcion": "Muy físico", "dificultad": "+1"}, {"nombre": "Contacto limitado", "descripcion": "Menos físico", "dificultad": "-1"}]',
    progresiones = '["Más contacto", "Menos espacio", "Más jugadores"]',
    regresiones = '["Menos contacto", "Más espacio", "Menos jugadores"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-010';

UPDATE tareas SET
    objetivo_fisico = 'Potencia aeróbica con transiciones',
    objetivo_psicologico = 'Mentalidad de transición constante',
    reglas_tecnicas = '["Transición técnica rápida", "Control orientado", "Pase de transición"]',
    reglas_tacticas = '["SSG con énfasis en transiciones", "Robo = ataque", "Pérdida = defensa"]',
    reglas_psicologicas = '["Reacción inmediata", "No lamentarse", "Siguiente acción"]',
    consignas_ofensivas = '["Transición vertical al robo", "No frenar", "Finalizar rápido"]',
    consignas_defensivas = '["Transición defensiva inmediata", "Repliegue rápido", "Pressing"]',
    errores_comunes = '["Transición lenta", "Lamentarse", "No reaccionar"]',
    variantes = '[{"nombre": "Gol en transición x2", "descripcion": "Incentivo", "dificultad": "+1"}, {"nombre": "Sin incentivo", "descripcion": "Normal", "dificultad": "-1"}]',
    progresiones = '["Con incentivo", "Tiempo límite transición", "Más espacio"]',
    regresiones = '["Sin incentivo", "Sin límite", "Menos espacio"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-011';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica, cambios de ritmo',
    objetivo_psicologico = 'Gestión de cambios de intensidad',
    reglas_tecnicas = '["Control en cambio de ritmo", "Pase en velocidad", "Finalización variada"]',
    reglas_tacticas = '["SSG con cambios de ritmo", "Acelerar/frenar", "Leer el momento"]',
    reglas_psicologicas = '["Leer cuándo acelerar", "No precipitarse", "Gestionar ritmo"]',
    consignas_ofensivas = '["Cambiar ritmo para desequilibrar", "No ser predecible", "Acelerar en ventaja"]',
    consignas_defensivas = '["Seguir cambios de ritmo", "No perder referencias", "Anticipar aceleración"]',
    errores_comunes = '["Ritmo constante predecible", "No acelerar en ventaja", "Perder el ritmo"]',
    variantes = '[{"nombre": "Cambio obligatorio cada 30s", "descripcion": "Estructurado", "dificultad": "+1"}, {"nombre": "Cambio libre", "descripcion": "Natural", "dificultad": "-1"}]',
    progresiones = '["Cambios obligatorios", "Menos tiempo entre cambios", "Más diferencia de ritmo"]',
    regresiones = '["Cambios libres", "Más tiempo", "Menos diferencia"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-012';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica con 1v1',
    objetivo_psicologico = 'Ganar duelos individuales',
    reglas_tecnicas = '["Regate efectivo", "Protección de balón", "Finalización en 1v1"]',
    reglas_tacticas = '["SSG con énfasis en 1v1", "Resolver en individual", "Crear superioridad por duelo"]',
    reglas_psicologicas = '["Confianza en el 1v1", "No evitar el duelo", "Ganar mentalmente"]',
    consignas_ofensivas = '["Buscar el 1v1", "Encarar con confianza", "Resolver en individual"]',
    consignas_defensivas = '["Ganar el 1v1 defensivo", "No ir al suelo", "Temporizar si es necesario"]',
    errores_comunes = '["Evitar el 1v1", "Perder confianza", "Ir al suelo precipitadamente"]',
    variantes = '[{"nombre": "1v1 obligatorio para gol", "descripcion": "Muy individual", "dificultad": "+1"}, {"nombre": "1v1 opcional", "descripcion": "Libre", "dificultad": "-1"}]',
    progresiones = '["1v1 obligatorio", "Menos espacio", "Más defensores"]',
    regresiones = '["1v1 opcional", "Más espacio", "Menos defensores"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-013';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia específica, alta densidad',
    objetivo_psicologico = 'Concentración en espacio reducido',
    reglas_tecnicas = '["Técnica en espacio mínimo", "Control corto", "Pase preciso"]',
    reglas_tacticas = '["SSG en espacio muy reducido", "Alta densidad de acciones", "Decisión rápida"]',
    reglas_psicologicas = '["Concentración máxima", "No agobiarse", "Decisión instantánea"]',
    consignas_ofensivas = '["Juego rápido", "No retener", "Movimiento constante"]',
    consignas_defensivas = '["Pressing asfixiante", "No dar espacio", "Anticipar"]',
    errores_comunes = '["Retener el balón", "No moverse", "Agobiarse"]',
    variantes = '[{"nombre": "10x10m", "descripcion": "Muy reducido", "dificultad": "+1"}, {"nombre": "15x15m", "descripcion": "Algo más grande", "dificultad": "-1"}]',
    progresiones = '["Menos espacio", "Más jugadores", "Menos toques"]',
    regresiones = '["Más espacio", "Menos jugadores", "Más toques"]',
    material = '["Petos 2 colores", "Balones x6", "Mini porterías x2", "Conos x4"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-014';

UPDATE tareas SET
    objetivo_fisico = 'Potencia con finalización de cabeza',
    objetivo_psicologico = 'Valentía en el juego aéreo',
    reglas_tecnicas = '["Remate de cabeza", "Salto y timing", "Centro preciso"]',
    reglas_tacticas = '["SSG con goles de cabeza", "Centros obligatorios", "Ataque al área"]',
    reglas_psicologicas = '["No tener miedo", "Atacar el balón", "Valentía"]',
    consignas_ofensivas = '["Buscar el centro", "Atacar el remate", "Timing de salto"]',
    consignas_defensivas = '["Ganar el duelo aéreo", "Despejar de cabeza", "Anticipar"]',
    errores_comunes = '["No atacar el balón", "Timing incorrecto", "Miedo al contacto"]',
    variantes = '[{"nombre": "Solo gol de cabeza", "descripcion": "Obligatorio", "dificultad": "+1"}, {"nombre": "Cabeza vale doble", "descripcion": "Incentivo", "dificultad": "-1"}]',
    progresiones = '["Solo cabeza", "Más centros", "Más defensores"]',
    regresiones = '["Cabeza doble", "Menos centros", "Menos defensores"]',
    material = '["Petos 2 colores", "Balones x10", "Porterías x2", "Conos x8"]',
    como_inicia = 'Centro obligatorio',
    como_finaliza = 'Gol de cabeza o tiempo'
WHERE codigo = 'SSG-015';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica con pressing',
    objetivo_psicologico = 'Intensidad de pressing constante',
    reglas_tecnicas = '["Presión al balón", "Orientación", "Robo activo"]',
    reglas_tacticas = '["SSG con pressing obligatorio", "No dejar jugar", "Recuperar rápido"]',
    reglas_psicologicas = '["Intensidad de pressing", "No rendirse", "Presión mental"]',
    consignas_ofensivas = '["Superar pressing", "Usar espacios", "Calma bajo presión"]',
    consignas_defensivas = '["Pressing máximo", "No dejar respirar", "Intensidad 100%"]',
    errores_comunes = '["Pressing pasivo", "Dejar jugar", "Bajar intensidad"]',
    variantes = '[{"nombre": "Pressing 3 segundos", "descripcion": "Ultra intenso", "dificultad": "+1"}, {"nombre": "Pressing 5 segundos", "descripcion": "Intenso", "dificultad": "-1"}]',
    progresiones = '["3 segundos", "Más presionadores", "Menos espacio"]',
    regresiones = '["5 segundos", "Menos presionadores", "Más espacio"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al equipo que sufre pressing',
    como_finaliza = 'Robo o escape del pressing'
WHERE codigo = 'SSG-016';

UPDATE tareas SET
    objetivo_fisico = 'Potencia anaeróbica máxima',
    objetivo_psicologico = 'Competitividad extrema',
    reglas_tecnicas = '["Todas las técnicas en máxima intensidad", "Ejecución bajo presión", "Finalización decisiva"]',
    reglas_tacticas = '["SSG competitivo máximo", "Ganar a toda costa", "Sin tregua"]',
    reglas_psicologicas = '["Competir al máximo", "No rendirse nunca", "Mentalidad ganadora"]',
    consignas_ofensivas = '["Buscar el gol siempre", "No conformarse", "Atacar hasta el final"]',
    consignas_defensivas = '["No conceder nada", "Defender cada balón", "Máxima concentración"]',
    errores_comunes = '["No competir", "Rendirse", "Bajar intensidad"]',
    variantes = '[{"nombre": "Eliminación", "descripcion": "Perdedor sale", "dificultad": "+1"}, {"nombre": "Por puntos", "descripcion": "Acumulativo", "dificultad": "-1"}]',
    progresiones = '["Eliminación", "Series cortas", "Más presión"]',
    regresiones = '["Por puntos", "Series largas", "Menos presión"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x2", "Conos x8", "Marcador"]',
    como_inicia = 'Saque competitivo',
    como_finaliza = 'Gol o tiempo de eliminación'
WHERE codigo = 'SSG-017';

UPDATE tareas SET
    objetivo_fisico = 'Resistencia con comodines',
    objetivo_psicologico = 'Uso inteligente del hombre libre',
    reglas_tecnicas = '["Pase al comodín", "Triangulación", "Finalización tras pared"]',
    reglas_tacticas = '["SSG con comodines", "Superioridad numérica", "Usar al libre"]',
    reglas_psicologicas = '["Buscar al libre", "No ignorar comodín", "Juego inteligente"]',
    consignas_ofensivas = '["Usar comodines", "Crear superioridad", "Triangular"]',
    consignas_defensivas = '["No salir a comodines", "Cerrar centro", "Pressing inteligente"]',
    errores_comunes = '["Ignorar comodines", "Comodines estáticos", "No usar superioridad"]',
    variantes = '[{"nombre": "2 comodines", "descripcion": "Más superioridad", "dificultad": "-1"}, {"nombre": "1 comodín", "descripcion": "Menos superioridad", "dificultad": "+1"}]',
    progresiones = '["Menos comodines", "1 toque comodín", "Menos espacio"]',
    regresiones = '["Más comodines", "Libre comodín", "Más espacio"]',
    material = '["Petos 3 colores", "Balones x8", "Mini porterías x2", "Conos x8"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-018';

UPDATE tareas SET
    objetivo_fisico = 'Potencia con porterías múltiples',
    objetivo_psicologico = 'Visión de juego, opciones múltiples',
    reglas_tecnicas = '["Finalización variada", "Cambio de orientación", "Disparo preciso"]',
    reglas_tacticas = '["SSG con 4 porterías", "Atacar cualquiera", "Defender todas"]',
    reglas_psicologicas = '["Visión 360°", "Elegir la mejor opción", "No ser predecible"]',
    consignas_ofensivas = '["Buscar portería libre", "Cambiar orientación", "Sorprender"]',
    consignas_defensivas = '["Cerrar todas las porterías", "Basculación rápida", "Comunicar"]',
    errores_comunes = '["Atacar siempre la misma", "No defender todas", "Predecible"]',
    variantes = '[{"nombre": "6 porterías", "descripcion": "Más opciones", "dificultad": "+1"}, {"nombre": "4 porterías", "descripcion": "Estándar", "dificultad": "-1"}]',
    progresiones = '["Más porterías", "Porterías más pequeñas", "Menos tiempo"]',
    regresiones = '["Menos porterías", "Porterías más grandes", "Más tiempo"]',
    material = '["Petos 2 colores", "Balones x8", "Mini porterías x4-6", "Conos x12"]',
    como_inicia = 'Balón al centro',
    como_finaliza = 'Gol o tiempo'
WHERE codigo = 'SSG-019';

UPDATE tareas SET
    objetivo_fisico = 'Capacidad anaeróbica con oleadas',
    objetivo_psicologico = 'Mantener intensidad en repeticiones',
    reglas_tecnicas = '["Técnica repetida", "Ejecución consistente", "Finalización en cada oleada"]',
    reglas_tacticas = '["SSG en oleadas", "Repetición de situaciones", "Automatismos"]',
    reglas_psicologicas = '["Mantener intensidad", "No bajar en repeticiones", "Consistencia"]',
    consignas_ofensivas = '["Misma intensidad cada oleada", "Finalizar siempre", "No relajarse"]',
    consignas_defensivas = '["Defender cada oleada igual", "No bajar", "Concentración"]',
    errores_comunes = '["Bajar en oleadas", "Perder concentración", "Inconsistencia"]',
    variantes = '[{"nombre": "10 oleadas", "descripcion": "Muchas repeticiones", "dificultad": "+1"}, {"nombre": "5 oleadas", "descripcion": "Menos repeticiones", "dificultad": "-1"}]',
    progresiones = '["Más oleadas", "Menos descanso", "Más jugadores"]',
    regresiones = '["Menos oleadas", "Más descanso", "Menos jugadores"]',
    material = '["Petos 2 colores", "Balones x12", "Porterías x2", "Conos x8"]',
    como_inicia = 'Silbato de inicio de oleada',
    como_finaliza = 'Finalización de oleada'
WHERE codigo = 'SSG-020';

UPDATE tareas SET
    objetivo_fisico = 'Potencia máxima en torneo',
    objetivo_psicologico = 'Competitividad de torneo, presión',
    reglas_tecnicas = '["Todas las técnicas", "Ejecución bajo presión de resultado", "Finalización decisiva"]',
    reglas_tacticas = '["Torneo SSG", "Formato competitivo", "Eliminación o puntos"]',
    reglas_psicologicas = '["Presión de torneo", "Gestión de resultados", "Competitividad máxima"]',
    consignas_ofensivas = '["Ganar cada partido", "No conformarse", "Buscar el gol"]',
    consignas_defensivas = '["No conceder", "Defender cada punto", "Concentración total"]',
    errores_comunes = '["No competir", "Rendirse", "Falta de concentración"]',
    variantes = '[{"nombre": "Eliminación directa", "descripcion": "Alta presión", "dificultad": "+1"}, {"nombre": "Liga", "descripcion": "Todos contra todos", "dificultad": "-1"}]',
    progresiones = '["Eliminación", "Partidos más cortos", "Más equipos"]',
    regresiones = '["Liga", "Partidos más largos", "Menos equipos"]',
    material = '["Petos múltiples colores", "Balones x10", "Mini porterías x4", "Conos x16", "Marcador"]',
    como_inicia = 'Sorteo de emparejamientos',
    como_finaliza = 'Final del torneo'
WHERE codigo = 'SSG-021';

-- ============================================================================
-- BALÓN PARADO (ABP) - 18 tareas
-- ============================================================================

UPDATE tareas SET
    objetivo_fisico = 'Coordinación, timing de carrera',
    objetivo_psicologico = 'Concentración en la ejecución, precisión',
    reglas_tecnicas = '["Golpeo preciso", "Carrera de aproximación", "Posición del cuerpo"]',
    reglas_tacticas = '["Córner ofensivo", "Movimientos coordinados", "Zonas de remate"]',
    reglas_psicologicas = '["Concentración máxima", "Confianza en la ejecución", "Timing perfecto"]',
    consignas_ofensivas = '["Movimientos coordinados", "Atacar zonas asignadas", "Timing de llegada"]',
    consignas_defensivas = '["Marcaje en zona/individual", "Despejar al primer toque", "Comunicar"]',
    errores_comunes = '["Timing incorrecto", "No atacar el balón", "Movimientos descoordinados"]',
    variantes = '[{"nombre": "Córner corto", "descripcion": "Variante de combinación", "dificultad": "+1"}, {"nombre": "Córner directo", "descripcion": "Al área directamente", "dificultad": "-1"}]',
    progresiones = '["Córner corto", "Con oposición real", "Variantes múltiples"]',
    regresiones = '["Córner directo", "Sin oposición", "Una variante"]',
    material = '["Balones x10", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Señal del lanzador',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'ABP-003';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación defensiva, reacción',
    objetivo_psicologico = 'Concentración en marca, anticipación',
    reglas_tecnicas = '["Despeje de cabeza", "Posición corporal", "Anticipación"]',
    reglas_tacticas = '["Defensa de córner", "Marcaje zonal o individual", "Despeje seguro"]',
    reglas_psicologicas = '["No perder concentración", "Ganar el duelo", "Comunicar"]',
    consignas_ofensivas = '["Atacar el balón", "Movimientos de engaño", "Segundas jugadas"]',
    consignas_defensivas = '["No perder la marca", "Despejar lejos", "Ganar la posición"]',
    errores_comunes = '["Perder la marca", "Despeje corto", "No comunicar"]',
    variantes = '[{"nombre": "Marcaje individual", "descripcion": "Cada uno su hombre", "dificultad": "+1"}, {"nombre": "Marcaje zonal", "descripcion": "Por zonas", "dificultad": "-1"}]',
    progresiones = '["Marcaje individual", "Más atacantes", "Variantes de córner"]',
    regresiones = '["Marcaje zonal", "Menos atacantes", "Córner fijo"]',
    material = '["Balones x10", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Córner del rival',
    como_finaliza = 'Despeje o gol'
WHERE codigo = 'ABP-004';

UPDATE tareas SET
    objetivo_fisico = 'Precisión de golpeo, coordinación',
    objetivo_psicologico = 'Concentración bajo presión, confianza',
    reglas_tecnicas = '["Golpeo de falta directa", "Efecto del balón", "Posición del cuerpo"]',
    reglas_tacticas = '["Falta directa a portería", "Lectura de barrera", "Zonas de gol"]',
    reglas_psicologicas = '["Confianza en el golpeo", "Concentración", "Visualización"]',
    consignas_ofensivas = '["Elegir zona de disparo", "Superar la barrera", "Golpeo preciso"]',
    consignas_defensivas = '["Barrera bien colocada", "Portero posicionado", "Reacción al disparo"]',
    errores_comunes = '["Golpeo a la barrera", "Falta de precisión", "Demasiada fuerza"]',
    variantes = '[{"nombre": "Falta lateral", "descripcion": "Desde un lado", "dificultad": "+1"}, {"nombre": "Falta frontal", "descripcion": "De frente", "dificultad": "-1"}]',
    progresiones = '["Desde lateral", "Más distancia", "Con barrera móvil"]',
    regresiones = '["De frente", "Menos distancia", "Barrera fija"]',
    material = '["Balones x10", "Portería x1", "Maniquíes/conos para barrera x5"]',
    como_inicia = 'Pitido del árbitro/entrenador',
    como_finaliza = 'Gol o parada'
WHERE codigo = 'ABP-005';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación de movimientos',
    objetivo_psicologico = 'Trabajo en equipo, comunicación',
    reglas_tecnicas = '["Pase corto preciso", "Desmarque coordinado", "Finalización"]',
    reglas_tacticas = '["Falta con combinación", "Movimientos ensayados", "Sorprender al rival"]',
    reglas_psicologicas = '["Confianza en el compañero", "Timing de movimiento", "Comunicación"]',
    consignas_ofensivas = '["Ejecutar la jugada ensayada", "Movimientos coordinados", "Finalizar con criterio"]',
    consignas_defensivas = '["Anticipar la combinación", "No perder marcas", "Comunicar movimientos"]',
    errores_comunes = '["Descoordinación", "Timing incorrecto", "No comunicar"]',
    variantes = '[{"nombre": "Triple opción", "descripcion": "Tres variantes", "dificultad": "+1"}, {"nombre": "Una opción", "descripcion": "Jugada única", "dificultad": "-1"}]',
    progresiones = '["Más opciones", "Oposición real", "Tiempo límite"]',
    regresiones = '["Menos opciones", "Sin oposición", "Sin límite"]',
    material = '["Balones x10", "Portería x1", "Conos x8", "Petos x10"]',
    como_inicia = 'Señal para iniciar jugada',
    como_finaliza = 'Gol o pérdida'
WHERE codigo = 'ABP-006';

UPDATE tareas SET
    objetivo_fisico = 'Reacción, velocidad de respuesta',
    objetivo_psicologico = 'Concentración defensiva, anticipación',
    reglas_tecnicas = '["Posición de barrera", "Salto coordinado", "Despeje"]',
    reglas_tacticas = '["Defensa de falta directa", "Barrera bien colocada", "Portero cubierto"]',
    reglas_psicologicas = '["No moverse antes", "Concentración", "Valentía"]',
    consignas_ofensivas = '["Superar la barrera", "Buscar huecos", "Golpeo preciso"]',
    consignas_defensivas = '["Barrera compacta", "No abrir huecos", "Saltar coordinadamente"]',
    errores_comunes = '["Barrera abierta", "Moverse antes", "Dejar hueco"]',
    variantes = '[{"nombre": "Barrera de 5", "descripcion": "Más jugadores", "dificultad": "-1"}, {"nombre": "Barrera de 3", "descripcion": "Menos jugadores", "dificultad": "+1"}]',
    progresiones = '["Menos en barrera", "Falta más cerca", "Lanzador experto"]',
    regresiones = '["Más en barrera", "Falta más lejos", "Lanzador normal"]',
    material = '["Balones x10", "Portería x1", "Conos x4"]',
    como_inicia = 'Falta del rival',
    como_finaliza = 'Parada o gol'
WHERE codigo = 'ABP-007';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad, reacción',
    objetivo_psicologico = 'Aprovechamiento de situaciones',
    reglas_tecnicas = '["Saque rápido", "Control inmediato", "Finalización rápida"]',
    reglas_tacticas = '["Saque de banda rápido", "Aprovechar desorganización", "Crear superioridad"]',
    reglas_psicologicas = '["Estar atento", "Reacción inmediata", "Aprovechar ventaja"]',
    consignas_ofensivas = '["Sacar rápido si hay ventaja", "Movimientos de apoyo", "Finalizar antes de organización"]',
    consignas_defensivas = '["Organizarse rápido", "No relajarse", "Comunicar"]',
    errores_comunes = '["No aprovechar", "Saque lento", "Desorganización defensiva"]',
    variantes = '[{"nombre": "Saque en 3s", "descripcion": "Muy rápido", "dificultad": "+1"}, {"nombre": "Saque normal", "descripcion": "Sin prisa", "dificultad": "-1"}]',
    progresiones = '["Más rápido", "Más en ataque", "Gol doble"]',
    regresiones = '["Sin prisa", "Menos en ataque", "Gol normal"]',
    material = '["Balones x8", "Porterías x2", "Conos x8", "Petos x12"]',
    como_inicia = 'Balón fuera, saque de banda',
    como_finaliza = 'Gol o pérdida de ventaja'
WHERE codigo = 'ABP-008';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación, timing',
    objetivo_psicologico = 'Comunicación, trabajo en equipo',
    reglas_tecnicas = '["Saque largo preciso", "Movimiento de recepción", "Control aéreo"]',
    reglas_tacticas = '["Saque de banda largo", "Movimientos en área", "Crear ocasión"]',
    reglas_psicologicas = '["Confianza en el lanzador", "Timing de movimiento", "Atacar el balón"]',
    consignas_ofensivas = '["Movimientos coordinados para recibir", "Atacar el saque", "Segundas jugadas"]',
    consignas_defensivas = '["Marcar al receptor", "Despejar", "No perder referencias"]',
    errores_comunes = '["Saque impreciso", "No atacar el balón", "Movimientos descoordinados"]',
    variantes = '[{"nombre": "Saque al área", "descripcion": "Directo al área", "dificultad": "+1"}, {"nombre": "Saque a zona", "descripcion": "Fuera del área", "dificultad": "-1"}]',
    progresiones = '["Al área", "Con oposición", "Variantes múltiples"]',
    regresiones = '["Fuera del área", "Sin oposición", "Una variante"]',
    material = '["Balones x8", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Saque de banda',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'ABP-009';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de ejecución',
    objetivo_psicologico = 'Concentración, aprovechamiento',
    reglas_tecnicas = '["Saque rápido del portero", "Control en carrera", "Finalización rápida"]',
    reglas_tacticas = '["Saque de portería rápido", "Contraataque", "Aprovechar desorganización"]',
    reglas_psicologicas = '["Estar atento al saque", "Reacción inmediata", "Mentalidad de gol"]',
    consignas_ofensivas = '["Posicionarse para recibir", "Transición vertical", "Finalizar rápido"]',
    consignas_defensivas = '["Organizarse tras perder", "Repliegue rápido", "No conceder"]',
    errores_comunes = '["No aprovechar", "Saque lento", "Repliegue lento"]',
    variantes = '[{"nombre": "Saque en 4s", "descripcion": "Muy rápido", "dificultad": "+1"}, {"nombre": "Saque libre", "descripcion": "Sin tiempo", "dificultad": "-1"}]',
    progresiones = '["Más rápido", "Gol doble", "Más distancia"]',
    regresiones = '["Sin prisa", "Gol normal", "Menos distancia"]',
    material = '["Balones x8", "Porterías x2", "Conos x8", "Petos x12"]',
    como_inicia = 'Parada del portero, saque rápido',
    como_finaliza = 'Gol o pérdida de ventaja'
WHERE codigo = 'ABP-010';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación, precisión',
    objetivo_psicologico = 'Trabajo en equipo, comunicación',
    reglas_tecnicas = '["Golpeo preciso", "Movimientos de engaño", "Finalización"]',
    reglas_tacticas = '["Penalti indirecto (ensayado)", "Movimientos coordinados", "Sorprender"]',
    reglas_psicologicas = '["Confianza en el plan", "Ejecución precisa", "Comunicación"]',
    consignas_ofensivas = '["Ejecutar jugada ensayada", "Movimientos de engaño", "Finalizar con criterio"]',
    consignas_defensivas = '["Anticipar la jugada", "Reaccionar rápido", "Comunicar"]',
    errores_comunes = '["Descoordinación", "Ejecución incorrecta", "Falta de comunicación"]',
    variantes = '[{"nombre": "Doble pase", "descripcion": "Combinación", "dificultad": "+1"}, {"nombre": "Pase y disparo", "descripcion": "Simple", "dificultad": "-1"}]',
    progresiones = '["Más complejo", "Oposición activa", "Variantes"]',
    regresiones = '["Más simple", "Sin oposición", "Una jugada"]',
    material = '["Balones x8", "Portería x1", "Conos x4"]',
    como_inicia = 'Señal de ejecución',
    como_finaliza = 'Gol o parada'
WHERE codigo = 'ABP-011';

UPDATE tareas SET
    objetivo_fisico = 'Fuerza mental, concentración',
    objetivo_psicologico = 'Gestión de presión, confianza',
    reglas_tecnicas = '["Golpeo de penalti", "Elección de zona", "Ejecución limpia"]',
    reglas_tacticas = '["Penalti directo", "Lectura del portero", "Zona elegida"]',
    reglas_psicologicas = '["Gestión de nervios", "Confianza", "Concentración total"]',
    consignas_ofensivas = '["Elegir zona antes", "No cambiar decisión", "Golpeo firme"]',
    consignas_defensivas = '["Portero: leer al lanzador", "Timing de movimiento", "Ocupar portería"]',
    errores_comunes = '["Cambiar decisión", "Golpeo flojo", "Nervios"]',
    variantes = '[{"nombre": "Penalti con presión", "descripcion": "Público simulado", "dificultad": "+1"}, {"nombre": "Penalti en calma", "descripcion": "Sin presión", "dificultad": "-1"}]',
    progresiones = '["Con presión", "Después de esfuerzo", "Situación de partido"]',
    regresiones = '["Sin presión", "En fresco", "Entrenamiento normal"]',
    material = '["Balones x10", "Portería x1"]',
    como_inicia = 'Pitido del árbitro',
    como_finaliza = 'Gol o parada'
WHERE codigo = 'ABP-012';

UPDATE tareas SET
    objetivo_fisico = 'Reacción, reflejos',
    objetivo_psicologico = 'Concentración del portero, anticipación',
    reglas_tecnicas = '["Posición del portero", "Lectura del lanzador", "Reacción"]',
    reglas_tacticas = '["Defensa de penalti", "Lectura de intención", "Cubrir portería"]',
    reglas_psicologicas = '["No anticipar demasiado", "Concentración", "Confianza"]',
    consignas_ofensivas = '["Engañar al portero", "Golpeo firme", "No dudar"]',
    consignas_defensivas = '["Leer al lanzador", "No moverse antes", "Reacción rápida"]',
    errores_comunes = '["Moverse antes", "No leer", "Anticipar mal"]',
    variantes = '[{"nombre": "Tanda de penaltis", "descripcion": "Presión acumulada", "dificultad": "+1"}, {"nombre": "Penaltis sueltos", "descripcion": "Sin presión", "dificultad": "-1"}]',
    progresiones = '["Tanda", "Presión de resultado", "Cansancio previo"]',
    regresiones = '["Sueltos", "Sin presión", "Descansado"]',
    material = '["Balones x10", "Portería x1"]',
    como_inicia = 'Lanzamiento del penalti',
    como_finaliza = 'Parada o gol'
WHERE codigo = 'ABP-013';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación de movimientos',
    objetivo_psicologico = 'Trabajo en equipo, comunicación',
    reglas_tecnicas = '["Bloqueos legales", "Movimientos de liberación", "Finalización"]',
    reglas_tacticas = '["Jugada ensayada con bloqueos", "Liberar al rematador", "Timing"]',
    reglas_psicologicas = '["Sacrificio por el equipo", "Timing perfecto", "Comunicación"]',
    consignas_ofensivas = '["Bloqueos efectivos", "Rematador libre", "Timing de carrera"]',
    consignas_defensivas = '["Evitar bloqueos", "No perder al rematador", "Comunicar"]',
    errores_comunes = '["Bloqueo ilegal", "Timing incorrecto", "Descoordinación"]',
    variantes = '[{"nombre": "Doble bloqueo", "descripcion": "Más complejo", "dificultad": "+1"}, {"nombre": "Bloqueo simple", "descripcion": "Básico", "dificultad": "-1"}]',
    progresiones = '["Más bloqueos", "Oposición real", "Variantes"]',
    regresiones = '["Un bloqueo", "Sin oposición", "Una jugada"]',
    material = '["Balones x8", "Portería x1", "Conos x6", "Petos x12"]',
    como_inicia = 'Córner o falta',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'ABP-014';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad, reacción',
    objetivo_psicologico = 'Estar alerta, aprovechamiento',
    reglas_tecnicas = '["Robo de balón", "Finalización rápida", "Presión al saque"]',
    reglas_tacticas = '["Robo en saque de centro", "Pressing inmediato", "Gol rápido"]',
    reglas_psicologicas = '["Máxima concentración", "Agresividad", "Aprovechar el momento"]',
    consignas_ofensivas = '["Presionar el saque", "Robar y finalizar", "Sorprender"]',
    consignas_defensivas = '["Saque seguro", "No perder el balón", "Estar preparado"]',
    errores_comunes = '["No presionar", "Saque descuidado", "No aprovechar"]',
    variantes = '[{"nombre": "Robo obligatorio", "descripcion": "Presión total", "dificultad": "+1"}, {"nombre": "Robo opcional", "descripcion": "Si hay oportunidad", "dificultad": "-1"}]',
    progresiones = '["Obligatorio", "Tiempo límite", "Gol doble"]',
    regresiones = '["Opcional", "Sin límite", "Gol normal"]',
    material = '["Balones x6", "Porterías x2", "Conos x8", "Petos x12"]',
    como_inicia = 'Saque de centro del rival',
    como_finaliza = 'Gol o posesión recuperada'
WHERE codigo = 'ABP-015';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación, timing',
    objetivo_psicologico = 'Comunicación, precisión',
    reglas_tecnicas = '["Centro preciso", "Movimiento al espacio", "Finalización"]',
    reglas_tacticas = '["Córner corto ensayado", "Combinación antes de centro", "Sorprender"]',
    reglas_psicologicas = '["Paciencia", "Comunicación", "Ejecución precisa"]',
    consignas_ofensivas = '["Combinación corta", "Crear mejor ángulo", "Sorprender con centro"]',
    consignas_defensivas = '["Salir al córner corto", "No perder marcas", "Comunicar"]',
    errores_comunes = '["Combinación lenta", "Perder sorpresa", "No atacar el centro"]',
    variantes = '[{"nombre": "Triple pase", "descripcion": "Más elaborado", "dificultad": "+1"}, {"nombre": "Un pase", "descripcion": "Simple", "dificultad": "-1"}]',
    progresiones = '["Más pases", "Oposición activa", "Variantes"]',
    regresiones = '["Menos pases", "Oposición pasiva", "Una jugada"]',
    material = '["Balones x8", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Córner corto',
    como_finaliza = 'Gol o despeje'
WHERE codigo = 'ABP-016';

UPDATE tareas SET
    objetivo_fisico = 'Reacción, organización',
    objetivo_psicologico = 'Concentración defensiva',
    reglas_tecnicas = '["Organización rápida", "Marcaje inmediato", "Despeje"]',
    reglas_tacticas = '["Defensa de córner corto", "Salir a presionar", "No perder marcas"]',
    reglas_psicologicas = '["Reacción al córner corto", "Comunicar", "No desorganizarse"]',
    consignas_ofensivas = '["Combinación efectiva", "Crear ventaja", "Finalizar"]',
    consignas_defensivas = '["Salir al corto si es necesario", "Mantener marcas", "Comunicar"]',
    errores_comunes = '["No salir", "Perder marcas", "Desorganización"]',
    variantes = '[{"nombre": "Salida obligatoria", "descripcion": "Presionar siempre", "dificultad": "+1"}, {"nombre": "Salida opcional", "descripcion": "Según situación", "dificultad": "-1"}]',
    progresiones = '["Salida obligatoria", "Variantes de ataque", "Más atacantes"]',
    regresiones = '["Salida opcional", "Una jugada", "Menos atacantes"]',
    material = '["Balones x8", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Córner corto del rival',
    como_finaliza = 'Despeje o gol'
WHERE codigo = 'ABP-017';

UPDATE tareas SET
    objetivo_fisico = 'Coordinación completa',
    objetivo_psicologico = 'Dominio de todas las situaciones',
    reglas_tecnicas = '["Todas las técnicas de ABP", "Ejecución variada", "Finalización"]',
    reglas_tacticas = '["Circuito de balón parado", "Todas las situaciones", "Práctica completa"]',
    reglas_psicologicas = '["Concentración en cada situación", "Adaptación", "Confianza"]',
    consignas_ofensivas = '["Ejecutar cada situación correctamente", "Variantes", "Finalizar"]',
    consignas_defensivas = '["Defender cada situación", "Organización", "Comunicación"]',
    errores_comunes = '["Falta de concentración", "No adaptarse", "Ejecución incorrecta"]',
    variantes = '[{"nombre": "Circuito completo", "descripcion": "Todas las situaciones", "dificultad": "+1"}, {"nombre": "Circuito parcial", "descripcion": "Algunas situaciones", "dificultad": "-1"}]',
    progresiones = '["Completo", "Con oposición", "Tiempo límite"]',
    regresiones = '["Parcial", "Sin oposición", "Sin límite"]',
    material = '["Balones x12", "Porterías x2", "Conos x12", "Petos x14"]',
    como_inicia = 'Primera situación del circuito',
    como_finaliza = 'Última situación completada'
WHERE codigo = 'ABP-018';

UPDATE tareas SET
    objetivo_fisico = 'Reacción, organización defensiva',
    objetivo_psicologico = 'Concentración en segundas jugadas',
    reglas_tecnicas = '["Despeje seguro", "Posición de rechace", "Anticipación"]',
    reglas_tacticas = '["Defensa de segundas jugadas", "Posicionamiento tras despeje", "No relajarse"]',
    reglas_psicologicas = '["Concentración post-despeje", "No dar por terminada la jugada", "Anticipar"]',
    consignas_ofensivas = '["Atacar rechaces", "Posición de segunda jugada", "No rendirse"]',
    consignas_defensivas = '["Despejar lejos", "Posición de rechace", "No relajarse"]',
    errores_comunes = '["Relajarse tras despeje", "Mal posicionamiento", "No anticipar"]',
    variantes = '[{"nombre": "Segundas obligatorias", "descripcion": "Énfasis en rechaces", "dificultad": "+1"}, {"nombre": "Segundas naturales", "descripcion": "Si ocurren", "dificultad": "-1"}]',
    progresiones = '["Énfasis en segundas", "Más atacantes", "Área reducida"]',
    regresiones = '["Natural", "Menos atacantes", "Área normal"]',
    material = '["Balones x10", "Portería x1", "Conos x6", "Petos x10"]',
    como_inicia = 'Córner o falta',
    como_finaliza = 'Despeje definitivo o gol'
WHERE codigo = 'ABP-019';

UPDATE tareas SET
    objetivo_fisico = 'Velocidad de transición',
    objetivo_psicologico = 'Mentalidad de contraataque tras ABP',
    reglas_tecnicas = '["Despeje largo", "Transición rápida", "Finalización en contra"]',
    reglas_tacticas = '["Contraataque tras defender ABP", "Transición vertical", "Aprovechar desorganización"]',
    reglas_psicologicas = '["Mentalidad de contra", "No conformarse con defender", "Agresividad"]',
    consignas_ofensivas = '["Defender y contraatacar", "Transición inmediata", "Finalizar rápido"]',
    consignas_defensivas = '["No subir todos", "Preparar la contra", "Posicionamiento"]',
    errores_comunes = '["Solo defender", "No contraatacar", "Transición lenta"]',
    variantes = '[{"nombre": "Contra obligatoria", "descripcion": "Siempre contraatacar", "dificultad": "+1"}, {"nombre": "Contra opcional", "descripcion": "Si hay oportunidad", "dificultad": "-1"}]',
    progresiones = '["Obligatoria", "Tiempo límite 10s", "Gol doble"]',
    regresiones = '["Opcional", "Sin límite", "Gol normal"]',
    material = '["Balones x8", "Porterías x2", "Conos x10", "Petos x14"]',
    como_inicia = 'ABP del rival',
    como_finaliza = 'Contraataque finalizado o pérdida'
WHERE codigo = 'ABP-020';

-- ============================================================================
-- FIN DEL SCRIPT DE ENRIQUECIMIENTO
-- ============================================================================
