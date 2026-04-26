export function showErrorToast(message: string) {
  if (typeof window === 'undefined') return
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed; top: 1rem; right: 1rem; z-index: 9999;
    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4);
    color: #fca5a5; padding: 0.5rem 1rem; border-radius: 0.5rem;
    font-size: 0.75rem; backdrop-filter: blur(4px);
  `
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}

export function showSuccessToast(message: string) {
  if (typeof window === 'undefined') return
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed; top: 1rem; right: 1rem; z-index: 9999;
    background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4);
    color: #6ee7b7; padding: 0.5rem 1rem; border-radius: 0.5rem;
    font-size: 0.75rem; backdrop-filter: blur(4px);
  `
  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}
