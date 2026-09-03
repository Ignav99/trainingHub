# TrainingHub — estado actual

## En curso
Anotador: conteo 1ª/2ª parte + pestaña Cierre (`cursor/anotador-partes-4e77`).
Stats, ocasiones y faltas viven en `periods[1|2]`; los totales se vuelcan al informe.
`stats_periodos` JSONB opcional (migración 079). Sin SQL, el API reintenta y el desglose queda en `notas_pre`.

## Hecho
Anotador tablet + orientación de faltas y carriles de ocasiones live en Render (`add97c6`, PR #281).
