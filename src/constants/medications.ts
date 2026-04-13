/**
 * Common medications and quick dosage tags for prescription UI.
 */
export const COMMON_MEDICATIONS = [
  'Amoxicillin 500mg',
  'Paracetamol 500mg',
  'Ibuprofen 400mg',
  'Azithromycin 500mg',
  'Cefuroxime 500mg',
  'Metronidazole 500mg',
  'Omeprazole 20mg',
  'Pantoprazole 40mg',
  'Ranitidine 150mg',
  'Atorvastatin 20mg',
] as const

export interface QuickTag {
  id: string
  label: string
  dosage: string
  frequency: string
}

export const QUICK_TAGS: QuickTag[] = [
  { id: '1x2', label: '1x2', dosage: '1 tablet', frequency: 'Twice daily' },
  { id: '1x3', label: '1x3', dosage: '1 tablet', frequency: 'Three times daily' },
  { id: 'before', label: 'Before Food', dosage: 'As prescribed', frequency: 'Before meals' },
]
