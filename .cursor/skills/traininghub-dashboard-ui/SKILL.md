---
name: traininghub-dashboard-ui
description: >
  Design and polish TrainingHub dashboard screens (enfermería, plantilla, sesiones,
  partidos, microciclos). Use when building or redesigning product UI, boards,
  lists, medical/ops panels, or any (dashboard) page. Enforces club-ops clarity,
  existing shadcn patterns, and anti-generic AI layout rules.
paths: frontend/src/app/(dashboard)/**/*,frontend/src/components/**/*
---

# TrainingHub Dashboard UI

You are designing internal football staff software (entrenadores, fisios, CT). Clarity and operational speed beat marketing flash.

## When this skill applies

- New or redesigned screens under `frontend/src/app/(dashboard)`
- Boards, status columns, player cards, medical/ops overviews
- Any request about “mejorar diseño”, UX, tablero, lista, filtros

Also load `frontend-design` and `web-design-guidelines` when doing a visual pass.

## Product principles

1. **One job per viewport region** — header actions, KPI strip, primary board/list, secondary history.
2. **Player-centric when status matters** — never flood the “now” view with multiple historical cases for the same player; show the active case, put the rest in Histórico.
3. **Status must be scannable in &lt;2s** — color + short label + days out. Prefer columns (tablero) over dense tables for live ops.
4. **Reuse the design system** — `PageHeader`, `Card`, `Badge`, `Tabs`, `Button`, `Dialog`, `EmptyState`, existing color tokens. Prefer club theme via `PageHeader` / CSS variables already in the app.
5. **Motion with purpose** — 2–3 subtle transitions (tab fade, card hover lift, column enter). Respect `prefers-reduced-motion`.

## Hard visual rules (TrainingHub)

- Avoid purple-on-white / purple-indigo gradients, cream+#terracotta serif clichés, broadsheet dense columns.
- Avoid emoji, glow stacks, rounded-full pill clusters, multi-layer shadows.
- Cards are for **interaction or status units** (player case cards on a board). Do not wrap every KPI in heavy chrome.
- Data numbers: use `tabular-nums` for days, counts, dates.
- Spanish UI copy: sentence case, verbs for actions (“Nuevo registro”, “Abrir histórico”).

## Layout recipes

### Ops board (enfermería / disponibilidad)

```
[ PageHeader + primary CTA ]
[ SaludTabs: Enfermería | RPE | Nutrición ]
[ KPI strip: counts by availability ]
[ Tabs: Ahora | Histórico ]
[ Ahora → 3 columns: Fuera | Individual | Grupo adaptado ]
[ Histórico → searchable list of closed cases, navigate to detail ]
```

- Column = availability bucket.
- Card = one player + their **primary open** medical case.
- Click card → `/enfermeria/[id]`.
- Empty column: short empty hint, not a huge illustration.

### Microciclos library

```
[ PageHeader + Nuevo ]
[ Atmosphere strip with counts ]
[ Filter chips: estado / tipo + search ]
[ Featured “semana actual” card ]
[ Library grid of week cards ]
```

### Shell navigation

- Desktop sidebar is **collapsible** (`useSidebarStore`).
- Config lives next to the user in the top bar, not in Herramientas.
- Salud groups Enfermería / RPE / Nutrición; Herramientas keeps Video, Pizarra, Estadísticas.
- Alertas is not a sidebar tab — use the Bell affordance.

### Histórico

- Only `estado === 'alta'` (and optionally cronico closed views).
- Search by player/title.
- Show date range and real days out.
- Do not mix open cases here.

## Implementation checklist

- [ ] Mobile: columns stack vertically; KPIs 2×2 grid.
- [ ] Keyboard: cards are links/buttons with visible focus.
- [ ] Loading: `ListPageSkeleton` / existing skeletons.
- [ ] After create: navigate to detail for open cases.
- [ ] Invalidate SWR `/medico` and `/jugadores` on mutations.
- [ ] Typecheck: `npx tsc --noEmit` in `frontend`.

## Anti-patterns

- Flat table of every medical row as the default “Ahora” view.
- Duplicate cards for the same player with multiple open cases (collapse to primary by restrictiveness + recency).
- Decorative gradients as the main visual idea.
- Hiding days out behind hover-only tooltips.
