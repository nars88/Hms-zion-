'use client'

import RegistrationForm from '@/components/reception/RegistrationForm'

interface ERRegistrationModalProps {
  onClose: () => void
}

export default function ERRegistrationModal({ onClose }: ERRegistrationModalProps) {
  return <RegistrationForm mode="ER" onClose={onClose} />
}

