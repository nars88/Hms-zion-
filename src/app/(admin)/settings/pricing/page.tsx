import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminPricingSettingsPage() {
  redirect('/admin/settings/pricing')
}
