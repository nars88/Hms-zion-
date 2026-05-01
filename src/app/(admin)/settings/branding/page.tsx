import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminBrandingRedirectPage() {
  redirect('/admin/settings/branding')
}
