// pages/Scheduler.js
import { Jobs, Profiles, Products } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast, modal, closeModal, statusColor, statusLabel, pillClass } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

function toISO(d)    { return new Date(d).toISOString().split('T')[0] }
function addDays(d,n){ return new Date(new Date(d).setDate(new Date(d).getDate()+n)) }
function getMonday(d){ const r=new Date(d); const day=r.getDay(); r.setDate(r.getDate()-(day===0?6:day-1)); r.setHours(0,0,0,0); return r }
function fmtWeek(d)  { const e=addDays(d,6); return `${d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}` }

let _weekStart = getMonday(new Date())

export async function renderScheduler() {
  const el = document.getElementById('tab-scheduler')
  if (!el) return
  const isSup = State.isSupervisor

  el.innerHTML = `<div class="page-pad">
    <div class="row-between">
      <div class="section-title" style="margin:0">${t('scheduler')}</div>
      ${isSup ? `<button class="btn btn-primary sm" onclick="window._newJob()">+ New job</button>` : ''}
    </div>
    <div class="week-nav" style="margin-top:12px">
      <button class="btn btn-secondary sm" onclick="window._weekNav(-7)">‹ Prev</button>
      <span class="week-lbl" id="sched-week-lbl"></span>
      <button class="btn btn-secondary sm" onclick="window._weekNav(7)">Next ›</button>
    </div>
    <div id="sched-days"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>
  </div>`

  window._weekNav = (days) => { _weekStart = addDays(_weekStart, days); loadWeek() }
  window._newJob  = isSup ? () => showCreateModal() : null

  loadWeek()
}

async function loadWeek() {
  const lbl = document.getElementById('sched-week-lbl')
  const el  = document.getElementById('sched-days')
  if (!lbl || !el) return
  lbl.textContent = fmtWeek(_weekStart)
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div>'

  try {
    const weekEnd = addDays(_weekStart, 6)
    const jobs    = await Jobs.getAll({ from: toISO(_weekStart), to: toISO(weekEnd) })
    const days    = Array.from({length:7}, (_,i) => addDays(_weekStart, i))
    const todayStr = toISO(new Date())

    el.innerHTML = days.map(d => {
      const ds      = toISO(d)
      const dayJobs = jobs.filter(j => j.scheduled_date === ds)
      const isToday = ds === todayStr
      return `<div class="day-row">
        <div class="day-head">
          <span>${d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>
          ${isToday ? '<span class="today-tag">Today</span>' : ''}
        </div>
        ${dayJobs.length
          ? dayJobs.map(j => `<div class="job-card" onclick="window._openBuild('${j.id}')">
              <div class="job-dot" style="background:${statusColor(j.status)}"></div>
              <div style="flex:1">
                <div class="job-wo">${j.work_order} — ${j.model||j.product?.name||''}</div>
                <div class="job-meta">${j.operator_name||'—'}</div>
              </div>
              <span class="badge ${j.status==='complete'?'badge-ok':j.status==='hold'?'badge-fail':'badge-pending'}">${statusLabel(j.status, t)}</span>
            </div>`).join('')
          : '<div style="padding:4px 0 6px;font-size:12px;color:var(--text3)">No jobs</div>'}
      </div>`
    }).join('')

    window._openBuild = async (id) => {
      const { openBuildDetail } = await import('./Builds.js')
      openBuildDetail(id)
    }
  } catch(e) { console.error(e) }
}

function showCreateModal() {
  modal(`
    <div class="modal-title">Schedule new job</div>
    <div id="create-modal-body"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>`)

  Promise.all([Profiles.getAll(), Products.getAll()]).then(([operators, products]) => {
    const body = document.getElementById('create-modal-body')
    if (!body) return
    const ops = operators.filter(u => u.active !== false)
    body.innerHTML = `
      <div class="field"><label>${t('workOrder')}</label><input type="text" id="nj-wo" placeholder="WO-2045"></div>
      <div class="field"><label>${t('model')}</label>
        <select id="nj-product">${products.map(p=>`<option value="${p.id}" data-name="${p.name}">${p.name}</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('serialNo')}</label><input type="text" id="nj-serial" placeholder="SN-00123"></div>
      <div class="field"><label>${t('assignedOperator')}</label>
        <select id="nj-operator">${ops.map(u=>`<option value="${u.id}" data-name="${u.display_name}">${u.display_name}</option>`).join('')}</select>
      </div>
      <div class="field"><label>${t('scheduledDate')}</label><input type="date" id="nj-date" value="${toISO(new Date())}"></div>
      <div class="field"><label>Notes</label><textarea id="nj-notes" rows="2" placeholder="Any special instructions..."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="window._closeModal()">${t('cancel')}</button>
        <button class="btn btn-primary"   onclick="window._createJob()">Create job</button>
      </div>`

    window._closeModal = closeModal
    window._createJob  = async () => {
      const wo      = document.getElementById('nj-wo').value.trim()
      const prodSel = document.getElementById('nj-product')
      const prodId  = prodSel.value
      const model   = prodSel.options[prodSel.selectedIndex]?.dataset?.name || ''
      const serial  = document.getElementById('nj-serial').value.trim()
      const opSel   = document.getElementById('nj-operator')
      const opId    = opSel.value
      const opName  = opSel.options[opSel.selectedIndex]?.dataset?.name || ''
      const date    = document.getElementById('nj-date').value
      const notes   = document.getElementById('nj-notes').value.trim()
      if (!wo || !date) { toast('Please enter a work order and date'); return }
      try {
        await Jobs.create({ work_order:wo, product_id:prodId, model, serial, operator_id:opId, operator_name:opName, scheduled_date:date, notes:notes||undefined, created_by:State.user?.id })
        closeModal()
        toast('Job created')
        loadWeek()
      } catch(e) { toast('Error: ' + e.message) }
    }
  })
}
