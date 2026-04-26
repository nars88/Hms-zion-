import { redirect } from 'next/navigation'

/** Legacy URL; middleware also maps role → `/er/dashboard` or `/er/mobile-tasks`. */
export default function ERDashboardLegacyRedirect() {
  redirect('/er/dashboard')
}
