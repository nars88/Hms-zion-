'use client'

import RegistrationForm from '@/components/reception/RegistrationForm'

interface PatientRegistrationModalProps {
  onClose: () => void
}

export default function PatientRegistrationModal({ onClose }: PatientRegistrationModalProps) {
  return <RegistrationForm mode="CLINIC" onClose={onClose} />
}

