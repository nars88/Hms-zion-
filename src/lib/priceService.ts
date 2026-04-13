/**
 * Price Service - Fetches prices from Admin Price Settings
 * This is the "Source of Truth" for all service prices
 */

export interface PriceInfo {
  price: number
  serviceName: string
}

/**
 * Get price for a service type from Admin Price Settings
 * @param serviceType - e.g., 'consultation_general', 'xray_chest', 'ultrasound_abdominal'
 * @returns Price info or null if not found
 */
export async function getServicePrice(serviceType: string): Promise<PriceInfo | null> {
  try {
    const res = await fetch(`/api/prices/get?serviceType=${encodeURIComponent(serviceType)}`)
    if (!res.ok) {
      console.warn(`Price not found for service: ${serviceType}`)
      return null
    }

    const data = await res.json()
    if (data.success) {
      return {
        price: data.price,
        serviceName: data.serviceName,
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching price for ${serviceType}:`, error)
    return null
  }
}

/**
 * Map test names to service types for price lookup
 */
export function mapTestToServiceType(testName: string, category: 'Lab' | 'Radiology' | 'Sonar'): string {
  const testLower = testName.toLowerCase()

  // Laboratory tests
  if (category === 'Lab') {
    if (testLower.includes('cbc') || testLower.includes('complete blood')) {
      return 'lab_cbc'
    }
    if (testLower.includes('glucose') || testLower.includes('blood sugar')) {
      return 'lab_glucose'
    }
    if (testLower.includes('urea')) {
      return 'lab_urea'
    }
    if (testLower.includes('creatinine')) {
      return 'lab_creatinine'
    }
    if (testLower.includes('lipid') || testLower.includes('cholesterol')) {
      return 'lab_lipid'
    }
    if (testLower.includes('liver')) {
      return 'lab_liver'
    }
    if (testLower.includes('thyroid')) {
      return 'lab_thyroid'
    }
    // Default lab test price
    return 'lab_general'
  }

  // Radiology
  if (category === 'Radiology') {
    if (testLower.includes('chest') && testLower.includes('x-ray')) {
      return 'xray_chest'
    }
    if (testLower.includes('limb') && testLower.includes('x-ray')) {
      return 'xray_limb'
    }
    if (testLower.includes('spine') && testLower.includes('x-ray')) {
      return 'xray_spine'
    }
    if (testLower.includes('ct') || testLower.includes('ct scan')) {
      return 'ct_scan'
    }
    if (testLower.includes('mri')) {
      return 'mri'
    }
    // Default X-Ray price
    return 'xray_chest'
  }

  // Sonar/Ultrasound
  if (category === 'Sonar') {
    if (testLower.includes('abdominal') || testLower.includes('abdomen')) {
      return 'ultrasound_abdominal'
    }
    if (testLower.includes('pelvic')) {
      return 'ultrasound_pelvic'
    }
    if (testLower.includes('cardiac') || testLower.includes('echo')) {
      return 'ultrasound_cardiac'
    }
    // Default ultrasound price
    return 'ultrasound_abdominal'
  }

  return 'lab_general' // Fallback
}

/**
 * Get default prices if database prices are not available
 */
export function getDefaultPrice(serviceType: string): number {
  const defaults: Record<string, number> = {
    consultation_general: 50000,
    consultation_specialist: 75000,
    consultation_er: 75000,
    xray_chest: 50000,
    xray_limb: 30000,
    xray_spine: 40000,
    ct_scan: 150000,
    mri: 200000,
    ultrasound_abdominal: 60000,
    ultrasound_pelvic: 60000,
    ultrasound_cardiac: 80000,
    lab_cbc: 25000,
    lab_glucose: 15000,
    lab_urea: 15000,
    lab_creatinine: 15000,
    lab_lipid: 30000,
    lab_liver: 35000,
    lab_thyroid: 40000,
    lab_general: 20000,
  }

  return defaults[serviceType] || 20000
}

/**
 * Get all prices for a category (used for bulk operations)
 */
export async function getPricesByCategory(category: 'Consultation' | 'Radiology' | 'Sonar' | 'Laboratory'): Promise<PriceInfo[]> {
  try {
    const res = await fetch('/api/admin/prices')
    if (!res.ok) return []

    const data = await res.json()
    if (data.success && data.prices) {
      return data.prices
        .filter((p: any) => p.category === category && p.isActive)
        .map((p: any) => ({
          price: Number(p.price),
          serviceName: p.serviceName,
          serviceType: p.serviceType,
        }))
    }

    return []
  } catch (error) {
    console.error(`Error fetching prices for category ${category}:`, error)
    return []
  }
}

