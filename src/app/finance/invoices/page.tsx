import { redirect } from 'next/navigation'

/**
 * Legacy route: redirect to Actual Accountant Dashboard.
 */
export default function FinanceInvoicesPage() {
  redirect('/accountant?view=all')
}
