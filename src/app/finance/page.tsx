import { redirect } from 'next/navigation'

/**
 * /finance redirects to the Actual Accountant Dashboard (sidebar-linked).
 * Keeps the project clean: one source of truth at /accountant.
 */
export default function FinancePage() {
  redirect('/accountant?view=all')
}
