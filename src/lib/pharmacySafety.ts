export const DRUG_FAMILY_MAP: Record<string, string[]> = {
  penicillin: [
    'penicillin',
    'amoxicillin',
    'ampicillin',
    'amoxiclav',
    'flucloxacillin',
    'piperacillin',
  ],
  sulfa: [
    'sulfa',
    'sulfonamide',
    'sulfamethoxazole',
    'trimethoprim',
    'co-trimoxazole',
  ],
  aspirin: ['aspirin', 'salicylate', 'acetylsalicylic'],
  ibuprofen: ['ibuprofen', 'naproxen', 'diclofenac', 'ketoprofen', 'nsaid'],
}

function normalize(text: string): string {
  return text.toLowerCase().trim()
}

function parseAllergyTokens(allergies: string | null): string[] {
  if (!allergies) return []
  const text = normalize(allergies)
  if (!text || text === 'none' || text === 'n/a') return []
  return text
    .split(/[,\n;/|]+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function matchedFamily(allergyToken: string): string | null {
  const token = normalize(allergyToken)
  for (const family of Object.keys(DRUG_FAMILY_MAP)) {
    if (token.includes(family)) return family
  }
  return null
}

export function getMedicationAllergyConflicts(
  medicationNames: string[],
  allergies: string | null
): string[] {
  const allergyTokens = parseAllergyTokens(allergies)
  if (!allergyTokens.length) return []

  const conflicts = new Set<string>()

  for (const rawMedication of medicationNames) {
    const medication = normalize(rawMedication)
    if (!medication) continue

    for (const allergyToken of allergyTokens) {
      const family = matchedFamily(allergyToken)
      if (!family) {
        if (medication.includes(allergyToken)) conflicts.add(rawMedication)
        continue
      }

      const familyDrugs = DRUG_FAMILY_MAP[family] || []
      if (familyDrugs.some((drug) => medication.includes(drug))) {
        conflicts.add(rawMedication)
      }
    }
  }

  return Array.from(conflicts)
}
