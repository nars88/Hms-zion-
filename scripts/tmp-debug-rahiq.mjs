import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function hasReleasedRadiology(notes) {
  try {
    const parsed = JSON.parse(notes || '{}')
    const rows = Array.isArray(parsed.radiologyResults) ? parsed.radiologyResults : []
    return rows.some((r) => r?.releasedToDoctorAt)
  } catch {
    return false
  }
}

async function main() {
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: 'رحيق' } },
        { lastName: { contains: 'رحيق' } },
        { firstName: { contains: 'rahiq', mode: 'insensitive' } },
        { lastName: { contains: 'rahiq', mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true },
    take: 20,
  })

  console.log('patients:', patients)

  for (const p of patients) {
    const visits = await prisma.visit.findMany({
      where: { patientId: p.id },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        chiefComplaint: true,
        updatedAt: true,
        notes: true,
      },
    })

    console.log(`\n${p.firstName} ${p.lastName} (${p.id})`)
    for (const v of visits) {
      console.log({
        visitId: v.id,
        status: v.status,
        chiefComplaint: v.chiefComplaint,
        updatedAt: v.updatedAt,
        releasedRadiology: hasReleasedRadiology(v.notes),
      })
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
