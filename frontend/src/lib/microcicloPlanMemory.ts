import type { PlanCT } from '@/types'

type SavedPlan = { at: string; plan: PlanCT }

const memory = new Map<string, SavedPlan>()

/** The last plan the server confirmed, even if a slower reload arrives later. */
export function rememberPlan(id: string, at: string | undefined, plan: PlanCT) {
  if (!id || !at) return
  const prev = memory.get(id)
  if (prev && prev.at > at) return
  memory.set(id, { at, plan })
}

/**
 * What the screen should show. A reload that started before the save can
 * arrive afterwards with the old olfato; the confirmed plan wins.
 */
export function planForScreen(
  id: string,
  serverAt: string | undefined,
  serverPlan: PlanCT | undefined,
): PlanCT {
  const saved = memory.get(id)
  if (saved && saved.at > (serverAt ?? '')) return saved.plan
  return serverPlan ?? {}
}
