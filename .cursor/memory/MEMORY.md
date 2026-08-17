# TrainingHub — agent memory

## 2026-08-17 — RFAF onboarding browse

Branch: `cursor/rfaf-onboarding-browse-ae84`

### Product
Wizard Competición: catálogo RFAF → grupo → equipo → sync-full automático.
URL paste queda como modo avanzado.

### Tech
- `browse_competiciones/grupos/equipos` en scraper + API `/rfef/browse/*`
- `setup-from-browse` crea comp + mi_equipo + mapeo sanciones
- Scheduler martes 17:00 y 21:00 (horarios)
- Linker: sábado sin hora → domingo

### Nota
IDs del select de sanciones = codcompeticion/codgrupo de VisClasificacion (verificado en prod).
Cloud agent IP blocked by RFAF (0 bytes); prod Frankfurt OK.
