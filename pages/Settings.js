// pages/Settings.js
import { Auth } from '../lib/db.js'
import { State } from '../lib/state.js'
import { modal, closeModal, toast } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export function showSettingsModal() {
  modal(`
    <div class="modal-title">${t('settings')}</div>
    <div class="card-pad" style="background:var(--surface2);border-radius:var(--r-sm);margin-bottom:12px">
      <div style="font-size:14px;font-weight:500">${State.displayName}</div>
      <div style="font-size:12px;color:var(--text3)">${State.user?.email||''} · ${t(State.profile?.role||'operator')}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="window._closeModal()">${t('close')}</button>
      <button class="btn btn-danger"    onclick="window._signOut()">${t('signOut')}</button>
    </div>`)
  window._closeModal = closeModal
  window._signOut = async () => { await Auth.signOut(); location.reload() }
}
