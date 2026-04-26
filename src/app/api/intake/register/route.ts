import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

interface RegisterBody {
  fullName: string
  age: number
  phone: string
  gender: 'Male' | 'Female' | 'Other'
  department: 'ER' | 'General Clinic'
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    const role = String(user.role || '').toUpperCase()
    const allowedRoles = ['RECEPTION', 'RECEPTIONIST', 'SECRETARY', 'INTAKE_NURSE', 'ER_INTAKE_NURSE', 'ER_NURSE', 'ADMIN']
    if (!allowedRoles.includes(role)) return forbidden()

    const body = (await request.json()) as RegisterBody
    const { fullName, age, phone, gender, department } = body

    if (!fullName || !phone || !age || age <= 0 || !gender) {
      return NextResponse.json(
        { error: 'fullName, age, phone and gender are required.' },
        { status: 400 }
      )
    }

    // Split full name into first & last (simple heuristic)
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ') || '-'

    const now = new Date()
    const birthYear = now.getFullYear() - age
    const dateOfBirth = new Date(birthYear, 0, 1)

    // Create or find patient by phone
    const existing = await prisma.patient.findFirst({
      where: { phone },
    })

    const patient =
      existing ??
      (await prisma.patient.create({
        data: {
          firstName,
          lastName,
          dateOfBirth,
          gender,
          phone,
        },
      }))

    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        status: 'Waiting',
        chiefComplaint:
          department === 'ER'
            ? 'Emergency visit (ER)'
            : 'Clinic visit (Outpatient)',
      },
    })

    return NextResponse.json(
      {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
        },
        visit: {
          id: visit.id,
          status: visit.status,
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to register patient.' },
      { status: 500 }
    )
  }
}


