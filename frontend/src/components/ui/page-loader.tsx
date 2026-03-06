/**
 * PageLoader — Kabin-e branded loader for route transitions.
 * Shows the animated logo during page navigation.
 */

import { KabineLoader } from './kabine-loader'

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <KabineLoader size="md" />
    </div>
  )
}
