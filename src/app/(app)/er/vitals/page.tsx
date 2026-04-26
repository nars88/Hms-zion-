import { redirect } from 'next/navigation'

/** Canonical ER vitals terminal is `/er/vitals-station`. */
export default function ERVitalsAliasRedirect() {
  redirect('/er/vitals-station')
}
