/**
 * Patient Search Utility - Real-time duplicate patient detection
 */

export interface PatientSearchResult {
  id: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth?: string
  gender?: string
  isDuplicate: boolean
}

/**
 * Search patients by name or phone
 * In production, this would query the database
 */
export async function searchPatients(query: string): Promise<PatientSearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  try {
    // Search in database
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) {
      return []
    }

    const data = await res.json()
    if (data.success && data.patients) {
      return data.patients.map((p: any) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        isDuplicate: true,
      }))
    }

    return []
  } catch (error) {
    console.error('Error searching patients:', error)
    return []
  }
}

/**
 * Check if patient exists by phone number
 */
export async function checkPatientByPhone(phone: string): Promise<PatientSearchResult | null> {
  if (!phone || phone.length < 3) {
    return null
  }

  const results = await searchPatients(phone)
  return results.find((p) => p.phone === phone) || null
}

/**
 * Check if patient exists by name
 */
export async function checkPatientByName(firstName: string, lastName: string): Promise<PatientSearchResult | null> {
  if (!firstName || !lastName) {
    return null
  }

  const fullName = `${firstName} ${lastName}`.toLowerCase()
  const results = await searchPatients(fullName)
  
  return results.find((p) => {
    const patientName = `${p.firstName} ${p.lastName}`.toLowerCase()
    return patientName === fullName
  }) || null
}

