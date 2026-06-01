// lib/utils.js
export function fmtTime(ms) {
  if (!ms && ms !== 0) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export function fmtDuration(startIso, endIso) {
  if (!startIso) return '—'
  const end = endIso ? new Date(endIso) : new Date()
  return fmtTime(end - new Date(startIso))
}

export function pillClass(s) {
  return { scheduled: 'pill-scheduled', in_progress: 'pill-inprogress', complete: 'pill-complete', hold: 'pill-hold' }[s] || 'pill-scheduled'
}

export function statusLabel(s, t) {
  return { scheduled: t('scheduled'), in_progress: t('inProgressBadge'), complete: t('complete'), hold: t('hold') }[s] || s
}

export function statusColor(s) {
  return { scheduled: '#3a3a7f', in_progress: '#c08000', complete: '#1f6b3a', hold: '#c02020' }[s] || '#888'
}

export function today() { return new Date().toISOString().split('T')[0] }

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

let _toastTimer = null
export function toast(msg) {
  const container = document.getElementById('toast-container')
  if (!container) { console.log('Toast:', msg); return }
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = msg
  container.appendChild(el)
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')))
  if (_toastTimer) clearTimeout(_toastTimer)
  _toastTimer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350) }, 2800)
}

export function modal(content, onClose) {
  const container = document.getElementById('modal-container')
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay open'
  overlay.innerHTML = `<div class="modal-card">${content}</div>`
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); onClose && onClose() } })
  container.appendChild(overlay)
  return overlay
}

export function closeModal() {
  document.querySelectorAll('#modal-container .modal-overlay.open').forEach(m => m.remove())
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
