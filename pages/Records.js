// pages/Records.js
import { QCRecords } from '../lib/db.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export async function renderRecords() {
  const el = document.getElementById('tab-records')
  if (!el) return
  el.innerHTML = `<div class="page-pad">
    <div class="section-title">${t('qcRecords')}</div>
    <div class="search-wrap"><input type="search" id="rec-search" placeholder="${t('searchRecords')}" oninput="window._recSearch(this.value)"></div>
    <div id="records-list"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>
  </div>`
  window._recSearch = (v) => { clearTimeout(window._rst); window._rst = setTimeout(() => loadRecords(v), 300) }
  await loadRecords('')
}

async function loadRecords(search) {
  const el = document.getElementById('records-list')
  if (!el) return
  try {
    const recs = search ? await QCRecords.search(search) : await QCRecords.getAll()
    if (!recs.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div>${t('noRecords')}</div>`; return }
    el.innerHTML = recs.map(r => `<div class="card card-pad" style="margin-bottom:8px">
      <div style="font-size:14px;font-weight:500">${r.work_order||r.job_id} — ${r.form_type}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:3px">SN: ${r.serial||'—'} · ${r.operator_name||'—'} · ${new Date(r.updated_at).toLocaleDateString('en-GB')}</div>
      <div style="margin-top:6px"><span class="badge badge-ok">${t('submitted')}</span></div>
    </div>`).join('')
  } catch(e) { el.innerHTML = `<div class="empty-state">Error loading records</div>` }
}
