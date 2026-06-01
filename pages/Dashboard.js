// pages/Dashboard.js
import { Jobs, Transfers } from '../lib/db.js'
import { State } from '../lib/state.js'
import { today, statusColor, pillClass, statusLabel, fmtDate } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export async function renderDashboard() {
  const el = document.getElementById('tab-dashboard')
  if (!el) return
  el.innerHTML = `<div class="page-pad"><div class="stat-grid">
    <div class="stat-card blue"><div class="stat-num" id="ds-sched">—</div><div class="stat-lbl">${t('scheduledToday')}</div></div>
    <div class="stat-card"><div class="stat-num" id="ds-prog">—</div><div class="stat-lbl">${t('inProgress')}</div></div>
    <div class="stat-card green"><div class="stat-num" id="ds-done">—</div><div class="stat-lbl">${t('completedToday')}</div></div>
    <div class="stat-card amber"><div class="stat-num" id="ds-hold">—</div><div class="stat-lbl">${t('onHold')}</div></div>
  </div>
  ${State.isSupervisor ? `<div id="ds-transfers"></div>` : ''}
  <div class="section-title mt">${t('liveBuilds')}</div>
  <div id="ds-live"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>
  <div class="section-title mt">${t('todaySchedule')}</div>
  <div id="ds-today"></div>
  </div>`

  try {
    const [stats, live, todayJobs] = await Promise.all([
      Jobs.getTodayStats(),
      Jobs.getAll({ status: 'in_progress' }),
      Jobs.getAll({ date: today() }),
    ])
    document.getElementById('ds-sched').textContent = stats.scheduled
    document.getElementById('ds-prog').textContent  = stats.inProgress
    document.getElementById('ds-done').textContent  = stats.complete
    document.getElementById('ds-hold').textContent  = stats.onHold

    if (State.isSupervisor) {
      const transfers = await Transfers.getAll()
      const tEl = document.getElementById('ds-transfers')
      if (tEl && transfers.length) {
        tEl.innerHTML = `<div class="section-title mt">${t('transferRequest')}</div>` +
          transfers.map(tr => `<div class="transfer-card">
            <div class="transfer-title">${t('transferRequest')}: ${tr.job?.work_order || '—'}</div>
            <div class="transfer-meta">${tr.requester?.display_name} wants to take this job · ${tr.job?.model || ''}</div>
            <div class="transfer-actions">
              <button class="btn btn-success sm" onclick="window._approveTransfer('${tr.id}','${tr.job_id}','${tr.requester_id}')">✓ ${t('approve')}</button>
              <button class="btn btn-danger sm"  onclick="window._declineTransfer('${tr.id}')">✗ ${t('decline')}</button>
            </div>
          </div>`).join('')

        window._approveTransfer = async (trId, jobId, requesterId) => {
          try {
            await Jobs.update(jobId, { operator_id: requesterId })
            await Transfers.respond(trId, 'approved', State.user.id)
            renderDashboard()
          } catch(e) {}
        }
        window._declineTransfer = async (trId) => {
          try {
            await Transfers.respond(trId, 'declined', State.user.id)
            renderDashboard()
          } catch(e) {}
        }
      }
    }

    const liveEl = document.getElementById('ds-live')
    if (!live.length) liveEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🔩</div>${t('noActiveBuilds')}</div>`
    else {
      liveEl.innerHTML = live.map(j => buildCard(j)).join('')
      liveEl.querySelectorAll('.build-card').forEach((c, i) => { c.onclick = () => openBuild(live[i].id) })
    }

    const pending = todayJobs.filter(j => j.status === 'scheduled')
    const todayEl = document.getElementById('ds-today')
    if (!pending.length) todayEl.innerHTML = `<div class="empty-state" style="padding:12px">${t('noJobsToday')}</div>`
    else {
      todayEl.innerHTML = pending.map(j => `<div class="job-card" onclick="openBuild('${j.id}')">
        <div class="job-dot" style="background:${statusColor(j.status)}"></div>
        <div><div class="job-wo">${j.work_order} — ${j.model || j.product?.name || ''}</div>
        <div class="job-meta">${j.operator_name || '—'}</div></div>
        <span class="badge badge-pending">${t('scheduled')}</span>
      </div>`).join('')
    }
  } catch(e) { console.error(e) }
}

function buildCard(j) {
  const stages = j.product?.stages || []
  const done   = (j.stages_completed || []).length
  const pct    = stages.length ? Math.round(done / stages.length * 100) : 0
  const ini    = (j.work_order || 'WO').replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()
  return `<div class="build-card">
    <div class="build-card-head">
      <div class="build-avatar">${ini}</div>
      <div><div class="build-wo">${j.work_order} — ${j.model || j.product?.name || ''}</div>
      <div class="build-meta">${j.operator_name || '—'} · ${j.serial || '—'}</div></div>
      <span class="build-pill ${pillClass(j.status)}">${statusLabel(j.status, t)}</span>
    </div>
    <div class="build-progress-bar"><div class="build-progress-fill" style="width:${pct}%"></div></div>
    <div class="build-stages">${stages.slice(0, 5).map((s, i) => `<span class="stage-dot ${(j.stages_completed||[]).includes(i)?'done':j.current_stage===i?'active':''}">${s.short||s.name?.slice(0,6)||i+1}</span>`).join('')}${stages.length>5?`<span class="stage-dot">+${stages.length-5}</span>`:''}</div>
  </div>`
}

async function openBuild(id) {
  const { openBuildDetail } = await import('./Builds.js')
  openBuildDetail(id)
}
window.openBuild = openBuild
