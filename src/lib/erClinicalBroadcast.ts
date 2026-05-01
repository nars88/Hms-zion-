export const ER_RESULT_READY_CHANNEL = 'zion-er-result-ready'

export type ErResultCardType = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

export type ResultReadyBroadcastPayload = {
  type: 'RESULT_READY'
  taskId: string
  visitId: string
  patientName: string
  testType: string
  resultCardType: ErResultCardType
  at: string
}

/** Prisma enum string values — kept string-based so this module is safe in client bundles. */
export function categoryToResultCardType(category: string): ErResultCardType | null {
  switch (category) {
    case 'DIAGNOSTIC_LAB':
      return 'Lab'
    case 'DIAGNOSTIC_RADIOLOGY':
      return 'Radiology'
    case 'DIAGNOSTIC_SONAR':
      return 'Sonar'
    case 'DIAGNOSTIC_ECG':
      return 'ECG'
    default:
      return null
  }
}

/**
 * Same-tab / same-origin BroadcastChannel (all open ER clinic tabs receive it).
 * Next.js route handlers run in Node: `BroadcastChannel` is usually undefined there;
 * when it exists, posting is harmless for browsers. Call the same helper from lab/rad
 * clients after a successful PATCH /api/er/tasks/release using JSON `resultReady`.
 */
export function emitResultReadyBroadcast(payload: Omit<ResultReadyBroadcastPayload, 'type' | 'at'>): void {
  try {
    if (typeof BroadcastChannel === 'undefined') return
    const msg: ResultReadyBroadcastPayload = {
      type: 'RESULT_READY',
      at: new Date().toISOString(),
      ...payload,
    }
    const bc = new BroadcastChannel(ER_RESULT_READY_CHANNEL)
    bc.postMessage(msg)
    queueMicrotask(() => bc.close())
  } catch {
    // ignore (SSR, older runtimes)
  }
}

export function subscribeResultReady(
  handler: (payload: ResultReadyBroadcastPayload) => void
): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => {}
  }
  const bc = new BroadcastChannel(ER_RESULT_READY_CHANNEL)
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as ResultReadyBroadcastPayload | undefined
    if (data && data.type === 'RESULT_READY' && data.visitId && data.taskId) handler(data)
  }
  bc.addEventListener('message', onMessage)
  return () => {
    bc.removeEventListener('message', onMessage)
    bc.close()
  }
}

/** Call from browser after release fetch — uses `resultReady` from API JSON when present. */
export function broadcastResultReadyFromApiResponse(json: {
  resultReady?: Omit<ResultReadyBroadcastPayload, 'type' | 'at'> | null
}): void {
  const r = json.resultReady
  if (!r || !r.taskId || !r.visitId) return
  emitResultReadyBroadcast({
    taskId: r.taskId,
    visitId: r.visitId,
    patientName: r.patientName,
    testType: r.testType,
    resultCardType: r.resultCardType,
  })
}
