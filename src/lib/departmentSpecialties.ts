export type DepartmentSpecialty = {
  code: string
  english: string
  label: string
  color: string
  description: string
}

export const MEDICAL_SPECIALTIES: DepartmentSpecialty[] = [
  {
    code: 'CARDIOLOGY',
    english: 'Cardiology',
    label: 'Cardiology',
    color: '#dc2626',
    description: 'Heart and cardiovascular specialty services.',
  },
  {
    code: 'ORTHOPEDICS',
    english: 'Orthopedics',
    label: 'Orthopedics',
    color: '#2563eb',
    description: 'Bones, joints, and musculoskeletal care.',
  },
  {
    code: 'INTERNAL_MEDICINE',
    english: 'Internal Medicine',
    label: 'Internal Medicine',
    color: '#0f766e',
    description: 'Adult internal diseases and chronic care.',
  },
  {
    code: 'PEDIATRICS',
    english: 'Pediatrics',
    label: 'Pediatrics',
    color: '#7c3aed',
    description: 'Children and adolescent medical services.',
  },
  {
    code: 'GENERAL_SURGERY',
    english: 'General Surgery',
    label: 'General Surgery',
    color: '#ea580c',
    description: 'General surgical consultations and procedures.',
  },
  {
    code: 'NEUROLOGY',
    english: 'Neurology',
    label: 'Neurology',
    color: '#9333ea',
    description: 'Brain, nerve, and neurological care.',
  },
  {
    code: 'OPHTHALMOLOGY',
    english: 'Ophthalmology',
    label: 'Ophthalmology',
    color: '#0284c7',
    description: 'Eye and vision care services.',
  },
  {
    code: 'DERMATOLOGY',
    english: 'Dermatology',
    label: 'Dermatology',
    color: '#16a34a',
    description: 'Skin, hair, and nail specialty services.',
  },
]

export const SPECIALTY_LABEL_BY_NAME = new Map(
  MEDICAL_SPECIALTIES.map((item) => [item.english.toLowerCase(), item.label])
)
