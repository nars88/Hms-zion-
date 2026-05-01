import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminActivityLogsRedirectPage() {
  redirect('/admin/settings/logs')
}
