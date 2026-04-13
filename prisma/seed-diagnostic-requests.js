const { PrismaClient, VisitStatus, MedicationOrderStatus } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Seed Pending diagnostic requests for Lab/Radiology technician UI.
 *
 * NOTE: This codebase does NOT use dedicated LabRequest/RadiologyRequest tables.
 * The Lab technician dashboards read pending requests from `Visit.notes` JSON:
 * - `notes.erOrders[]` contains request entries (type: LAB_REQUESTED / RADIOLOGY_REQUESTED)
 * - `notes.labResults[]` / `notes.radiologyResults[]` contains completed results
 *
 * The technician UI marks a request as Pending when no matching result exists.
 */
async function main() {
  console.log('🌱 Seeding Pending Lab/Radiology requests...')

  // Pick active visits directly (Lab/Radiology technician dashboards read requests from Visit.notes).
  // Some dev DBs may not have pharmacy medication_orders table migrated yet.
  const emergencyVisits = await prisma.visit.findMany({
    where: {
      status: { not: VisitStatus.Discharged },
      OR: [
        { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
        { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
      ],
    },
    take: 10,
    select: {
      id: true,
      chiefComplaint: true,
      notes: true,
      status: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const allActiveVisits = await prisma.visit.findMany({
    where: { status: { not: VisitStatus.Discharged } },
    take: 10,
    select: {
      id: true,
      chiefComplaint: true,
      notes: true,
      status: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  const visits =
    emergencyVisits.length > 0 ? emergencyVisits.slice(0, 4) : allActiveVisits.slice(0, 4)
  if (visits.length === 0) {
    console.warn('⚠ No active visits found. Nothing to seed.')
    return
  }

  // `bedNumber` column may be missing in some dev DBs; Lab/Radiology API now
  // assigns UI bed numbers automatically for rendering, so we don't need to set it here.

  const now = Date.now()
  const pendingSuffix = '(ZION Pending Sample)'

  // We add 4 requests total by default:
  // - 2x Lab (CBC, Glucose) on first 2 visits
  // - 2x Radiology (Chest X-Ray) on next 2 visits
  const plannedRequests = [
    { type: 'LAB_REQUESTED', content: `CBC ${pendingSuffix}` },
    { type: 'LAB_REQUESTED', content: `Glucose (mg/dL) ${pendingSuffix}` },
    { type: 'RADIOLOGY_REQUESTED', content: `Chest X-Ray ${pendingSuffix}` },
    { type: 'RADIOLOGY_REQUESTED', content: `Chest X-Ray (Follow-up) ${pendingSuffix}` },
  ]

  let seededCount = 0
  const maxSlots = plannedRequests.length
  for (let i = 0; i < maxSlots; i++) {
    const visit = visits[i % visits.length]
    const reqPlan = plannedRequests[i]
    if (!reqPlan) continue

    const at = new Date(now + i * 60_000).toISOString()

    // Parse notes JSON safely
    let parsed = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) || {}
    } catch (_) {
      parsed = {}
    }

    const erOrders = Array.isArray(parsed.erOrders) ? parsed.erOrders : []
    const labResults = Array.isArray(parsed.labResults) ? parsed.labResults : []
    const radiologyResults = Array.isArray(parsed.radiologyResults) ? parsed.radiologyResults : []

    // Idempotency: skip if we already added this specific "ZION Pending Sample" content.
    const alreadyExists = erOrders.some(
      (o) =>
        o &&
        typeof o === 'object' &&
        o.type === reqPlan.type &&
        typeof o.content === 'string' &&
        o.content.includes(pendingSuffix)
    )
    // Always normalize patient names to English for this seeded test data.
    if (visit.patient?.id) {
      const englishFirstNames = ['John', 'Jane', 'Robert', 'Emily', 'Michael']
      const englishLastNames = ['Smith', 'Doe', 'Johnson', 'Brown', 'Williams']
      const firstName = englishFirstNames[i] ?? 'John'
      const lastName = englishLastNames[i] ?? 'Smith'
      await prisma.patient.update({
        where: { id: visit.patient.id },
        data: { firstName, lastName, updatedAt: new Date() },
      })
    }

    if (alreadyExists) {
      console.log(`↪ Visit ${visit.id}: pending request already seeded for ${reqPlan.type}, skipping.`)
      continue
    }

    // Ensure lab tech API selects this visit by making chiefComplaint contain Emergency/ER.
    const chiefComplaint =
      visit.chiefComplaint && /emergency|(^|\\b)er\\b/i.test(String(visit.chiefComplaint))
        ? visit.chiefComplaint
        : `Emergency - ${visit.id} (Seeded Diagnostic Requests)`

    erOrders.push({
      type: reqPlan.type,
      content: reqPlan.content,
      at,
      status: 'PENDING',
      department: reqPlan.type === 'RADIOLOGY_REQUESTED' ? 'Radiology' : 'Lab',
    })

    parsed.erOrders = erOrders
    parsed.labResults = labResults
    parsed.radiologyResults = radiologyResults

    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        chiefComplaint,
        notes: JSON.stringify(parsed),
        updatedAt: new Date(),
      },
      select: { id: true },
    })

    seededCount++
    console.log(`✅ Seeded: visit=${visit.id} type=${reqPlan.type} at=${at}`)
  }

  console.log(`✨ Done. Seeded ${seededCount} pending requests.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

