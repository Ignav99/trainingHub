# TrainingHub — agent memory

## Branch: `cursor/sesion-abp-pdf-ae84` (PR #197)

### Keywords (2026-07-28)
- Algoritmo híbrido **RAKE-like + léxico táctico** (sin spacy/nltk)
- Frases multi-palabra: `presion alta`, `salida de balon`, `juego entre lineas`…
- No parte/pega mal: extras manuales conservan espacios
- FE: `frontend/src/lib/keywords.ts` (espejo) + auto/manual sin pisar
- BE: `backend/app/services/keywords.py` + tests `test_keywords.py`
- Write path: si el cliente envía keywords → solo `normalize_keyword_list`

### ABP
- `abp_config.ofensivo[]` / `defensivo[]` tipos independientes
- UI: dos MultiSelect compactos

### PDF reducido
- **A4 landscape**
- Topline 1 línea: título + club/equipo/rival/fecha/lugar/duración/objetivo/ABP/keywords + MD
- Convocatoria: grid ~10 columnas, poca altura, color por tipo
- Tareas ≥70%: pizarra grande arriba, texto abajo; 2 cols (3 si ≥5 tareas)
