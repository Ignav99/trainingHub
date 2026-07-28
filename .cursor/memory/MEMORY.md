# TrainingHub — agent memory

## 2026-07-28 — PDF estilo unificado + URL

Branch: `cursor/pdf-estilo-unificado-ae84`

### User feedback
- Reducido y extendido tenían estilos distintos (oscuro Barlow vs claro Helvetica)
- Nombre de archivo debe decir `_reducido` / `_extendido`
- URL (vista previa PDF / share) no abría

### Fixes
1. `sesion_pdf_v2.html` restyled to match reducido (light, Helvetica, primary accent, conceptos bar)
2. Filename: `sesion_YYYY-MM-DD_reducido.pdf` / `…_extendido.pdf`
3. PDF preview: open `about:blank` sync then set blob URL (fixes popup + noopener/blob bug)
4. CSP skipped for `application/pdf` responses
5. Share: AuthProvider skips `/share`; public API fetch; open via `window.open`
