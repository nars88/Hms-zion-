/** Imaging results are visible to doctors only after `releasedToDoctorAt` is set (technician review). */

export type ImagingResultRecord = {
  at?: string
  testType?: string
  result?: string
  completedAt?: string
  attachmentPath?: string
  releasedToDoctorAt?: string
  technicianNotes?: string
}

export function isImagingReleasedToDoctor(r: { releasedToDoctorAt?: string } | undefined): boolean {
  return Boolean(r?.releasedToDoctorAt)
}

export function orderHasReleasedImagingResult(
  results: ImagingResultRecord[] | undefined,
  orderAt: string
): boolean {
  return (results || []).some(
    (r) => String(r.at) === String(orderAt) && isImagingReleasedToDoctor(r)
  )
}
