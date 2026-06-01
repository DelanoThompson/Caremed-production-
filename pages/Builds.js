// pages/Builds.js
import { Jobs, StageLogs, Transfers, getClient } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast, fmtDuration, pillClass, statusLabel, modal, closeModal } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export async function renderBuilds() {
  const el = document.getElementById('tab-builds')
  if (!el) return
  el.innerHTML = `<div class="page-pad">
    <div class="section-title">${t('activeBuilds')}</div>
    <div id="builds-active"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>
    <div class="section-title mt">${t('completedToday2')}</div>
    <div id="builds-done"></div>
  </div>`

  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const [active, doneRes] = await Promise.all([
      Jobs.getAll({ status: 'in_progress' }),
      getClient().from('jobs').select('*, product:products(name,stages)').eq('status','complete').gte('updated_at', todayStr).order('updated_at',{ascending:false}).then(r => r.data || []),
    ])

    const canAccess = j => State.isSupervisor || j.operator_id === State.user?.id

    const activeEl = document.getElementById('builds-active')
    if (!active.length) activeEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔩</div>${t('noBuilds')}</div>`
    else {
      activeEl.innerHTML = active.map(j => buildListItem(j, canAccess(j))).join('')
      activeEl.querySelectorAll('.build-card[data-id]').forEach(c => { c.onclick = () => openBuildDetail(c.dataset.id) })
      activeEl.querySelectorAll('.btn-transfer').forEach(btn => { btn.onclick = e => { e.stopPropagation(); requestTransfer(btn.dataset.id) } })
    }

    const doneEl = document.getElementById('builds-done')
    if (!doneRes.length) doneEl.innerHTML = `<div class="empty-state" style="padding:12px">${t('noBuilds')}</div>`
    else {
      doneEl.innerHTML = doneRes.map(j => buildListItem(j, canAccess(j))).join('')
      doneEl.querySelectorAll('.build-card[data-id]').forEach(c => { c.onclick = () => openBuildDetail(c.dataset.id) })
    }
  } catch(e) { console.error(e) }
}

function buildListItem(j, canAccess) {
  const stages = j.product?.stages || []
  const done   = (j.stages_completed || []).length
  const pct    = stages.length ? Math.round(done / stages.length * 100) : 0
  const ini    = (j.work_order||'WO').replace(/[^A-Z0-9]/gi,'').slice(0,3).toUpperCase()
  return `<div class="build-card" data-id="${j.id}" style="cursor:pointer">
    <div class="build-card-head">
      <div class="build-avatar">${ini}</div>
      <div><div class="build-wo">${j.work_order} — ${j.model||''}</div>
      <div class="build-meta">${j.operator_name||'—'}${j.serial?' · '+j.serial:''}</div></div>
      <span class="build-pill ${pillClass(j.status)}">${statusLabel(j.status, t)}</span>
    </div>
    <div class="build-progress-bar"><div class="build-progress-fill" style="width:${pct}%"></div></div>
    ${!canAccess && j.status === 'in_progress' ? `<div style="padding:8px 14px"><button class="btn btn-ghost sm btn-transfer" data-id="${j.id}">${t('requestTransfer')}</button></div>` : ''}
  </div>`
}

async function requestTransfer(jobId) {
  try {
    await Transfers.create({ job_id: jobId, requester_id: State.user.id, status: 'pending' })
    toast(t('transferRequested'))
    renderBuilds()
  } catch(e) { toast(t('errorSaving') + e.message) }
}

export async function openBuildDetail(jobId) {
  try {
    const job       = await Jobs.get(jobId)
    const canAccess = State.isSupervisor || job.operator_id === State.user?.id
    const isActive  = job.status === 'scheduled' || job.status === 'in_progress'

    if (!State.isSupervisor && canAccess && isActive) {
      const { openSlideshow } = await import('./Slideshow.js')
      openSlideshow(job)
      return
    }

    await renderBuildDetail(job)
    AppShell.openScreen('build-screen')
  } catch(e) { toast(t('errorLoading') + e.message) }
}

async function renderBuildDetail(job) {
  const screen    = document.getElementById('build-screen')
  const stages    = job.product?.stages || []
  const completed = job.stages_completed || []
  const pct       = stages.length ? Math.round(completed.length / stages.length * 100) : 0
  const logs      = await StageLogs.getForJob(job.id)
  const logMap    = {}; logs.forEach(l => { logMap[l.stage_id] = l })
  const isSup     = State.isSupervisor
  const canAccess = isSup || job.operator_id === State.user?.id

  screen.innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <button class="back-btn" onclick="AppShell.closeScreen('build-screen')">‹</button>
        <div><div class="topbar-title">${job.work_order} — ${job.model||''}</div>
        <div class="topbar-sub">${job.operator_name||'—'} · SN: ${job.serial||'—'}</div></div>
        <span class="status-pill ${pillClass(job.status)}">${statusLabel(job.status, t)}</span>
      </div>
    </div>
    <div class="page-pad">
      <div class="build-info-card">
        <div class="card-row"><span class="card-key">${t('workOrder')}</span><span class="card-val">${job.work_order}</span></div>
        <div class="card-row"><span class="card-key">${t('model')}</span><span class="card-val">${job.model||'—'}</span></div>
        <div class="card-row"><span class="card-key">${t('serialNo')}</span><span class="card-val">${job.serial||'—'}</span></div>
        <div class="card-row"><span class="card-key">${t('assignedOperator')}</span><span class="card-val">${job.operator_name||'—'}</span></div>
        <div class="card-row"><span class="card-key">${t('scheduledDate')}</span><span class="card-val">${job.scheduled_date||'—'}</span></div>
        <div class="card-row"><span class="card-key">Progress</span><span class="card-val">${pct}% (${completed.length}/${stages.length} stages)</span></div>
      </div>

      ${canAccess && job.status !== 'complete' ? `<button class="btn btn-primary full" style="margin-bottom:14px" onclick="window._openSlideshow()">▶ ${t('continueStepByStep')}</button>` : ''}

      <div class="section-title">${t('qcForms')}</div>
      <div class="form-links">
        ${renderFormLink('assembly',     job)}
        ${renderFormLink('pre-delivery', job)}
        ${renderFormLink('goods-in',     job)}
        ${renderFormLink('repair-rework',job)}
      </div>

      <div class="section-title mt">Build stages</div>
      ${stages.map((s, i) => {
        const isDone   = completed.includes(i)
        const isActive = job.current_stage === i
        const log      = logMap[i]
        const elapsed  = log ? fmtDuration(log.started_at, log.ended_at) : '—'
        return `<div class="card" style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:10px;padding:12px 14px">
            <div style="width:28px;height:28px;border-radius:50%;background:${isDone?'var(--green-bg)':isActive?'var(--amber-bg)':'var(--surface3)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:${isDone?'var(--green)':isActive?'var(--amber)':'var(--text3)'};flex-shrink:0">${isDone?'✓':i+1}</div>
            <div style="flex:1"><div style="font-size:14px;font-weight:500">${s.name}</div>
            <div style="font-size:12px;color:var(--text3)">Steps ${s.steps||''} · Est. ${s.est||'?'} min</div></div>
            <span style="font-size:12px;font-family:var(--mono);color:${isDone?'var(--green)':isActive?'var(--amber)':'var(--text3)'}">${elapsed}</span>
          </div>
        </div>`
      }).join('')}

      ${isSup ? `<div class="divider"></div>
      <div class="section-title">Supervisor controls</div>
      <div class="gap-row">
        <button class="btn btn-ghost sm" onclick="window._setJobStatus('hold')">Put on hold</button>
        <button class="btn btn-ghost sm" onclick="window._setJobStatus('scheduled')">Reset</button>
        ${job.status !== 'complete' ? `<button class="btn btn-success sm" onclick="window._setJobStatus('complete')">Mark complete</button>` : ''}
      </div>` : ''}
    </div>`

  window._openSlideshow = async () => {
    const { openSlideshow } = await import('./Slideshow.js')
    openSlideshow(job)
  }
  window._setJobStatus = async (status) => {
    try {
      await Jobs.update(job.id, { status })
      const updated = await Jobs.get(job.id)
      renderBuildDetail(updated)
      toast(`Status: ${status}`)
    } catch(e) { toast(t('errorSaving') + e.message) }
  }
  window._openQCForm = async (type, jobId) => {
    const { openQCForm } = await import('./QCForm.js')
    openQCForm(type, jobId)
  }
}

function renderFormLink(type, job) {
  const done  = job.qc_records && job.qc_records[type]
  const icons  = { assembly: '🔩', 'pre-delivery': '📋', 'goods-in': '📦', 'repair-rework': '🔧' }
  const titles = { assembly: t('assemblyQC'), 'pre-delivery': t('preDelivery'), 'goods-in': t('goodsIn'), 'repair-rework': t('repairRework') }
  const subs   = { assembly: t('assemblyQCSub'), 'pre-delivery': t('comingSoon'), 'goods-in': t('comingSoon'), 'repair-rework': t('comingSoon') }
  const avail  = type === 'assembly'
  return `<div class="form-link-card" style="${avail ? '' : 'opacity:.5;pointer-events:none'}" onclick="${avail ? `window._openQCForm('${type}','${job.id}')` : ''}">
    <div class="form-link-icon">${icons[type]||'📋'}</div>
    <div><div class="form-link-title">${titles[type]||type}</div><div class="form-link-sub">${subs[type]||''}</div></div>
    <span class="badge ${done?'badge-ok':'badge-pending'}">${done?t('complete'):t('pending')}</span>
  </div>`
}
