/**
 * Pharmacy layout: NO sidebar, NO "Active Medication Orders" panel.
 * Only renders children. Each page (page.tsx, manager/page.tsx, inventory/page.tsx)
 * is responsible for its own layout (e.g. SmartSidebar + main content).
 */
export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
