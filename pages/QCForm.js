// pages/QCForm.js — Assembly QC form
import { Jobs, QCRecords } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export async function openQCForm(type, jobId) {
  if (type !== 'assembly') { toast(t('comingSoon')); return }

  const screen = document.getElementById('form-screen')
  AppShell.openScreen('form-screen')
  screen.innerHTML = `<div class="topbar"><div class="topbar-inner">
    <button class="back-btn" onclick="AppShell.closeScreen('form-screen')">‹</button>
    <div><div class="topbar-title">${t('assemblyQC')}</div><div class="topbar-sub" id="qcf-sub">Loading...</div></div>
  </div></div>
  <div id="qcf-body" style="padding-bottom:80px"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>
  <div class="footer-bar">
    <button class="footer-btn" onclick="window._qcExport()">↓ Export</button>
    <button class="footer-btn primary" id="qcf-submit" onclick="window._qcSubmit()">Submit QC</button>
  </div>`

  try {
    const [job, existing] = await Promise.all([
      Jobs.get(jobId),
      QCRecords.getForJob(jobId, 'assembly').then(r => r[0] || null),
    ])
    document.getElementById('qcf-sub').textContent = `${job.work_order} · SN: ${job.serial||'—'}`

    const data   = existing?.data || {}
    const stages = job.product?.stages || []

    // Gather all bolts from all stages
    const allBolts = stages.flatMap((s, si) =>
      (s.bolts||[]).map(b => ({ ...b, stageName: s.name, stageIdx: si }))
    )

    const body = document.getElementById('qcf-body')
    body.innerHTML = `
      <div class="page-pad">
        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon">📋</div>
            <div><div class="form-sec-title">Job details</div></div>
            <span class="chevron">›</span>
          </div>
          <div class="form-sec-body">
            <div class="card-pad">
              <div class="card-row"><span class="card-key">${t('workOrder')}</span><span class="card-val">${job.work_order}</span></div>
              <div class="card-row"><span class="card-key">${t('model')}</span><span class="card-val">${job.model||'—'}</span></div>
              <div class="card-row"><span class="card-key">${t('serialNo')}</span><span class="card-val">${job.serial||'—'}</span></div>
              <div class="card-row"><span class="card-key">${t('assignedOperator')}</span><span class="card-val">${job.operator_name||'—'}</span></div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon">🔩</div>
            <div>
              <div class="form-sec-title">Torque verification</div>
              <div class="form-sec-sub">${allBolts.length} bolt locations</div>
            </div>
            <span class="chevron">›</span>
          </div>
          <div class="form-sec-body">
            ${allBolts.map((b, i) => {
              const saved = data.torque?.[b.ref]
              const ok = saved && +saved >= b.spec*0.9 && +saved <= b.spec*1.1
              return `<div class="bolt-row">
                <div>
                  <div class="bolt-ref">${b.ref} · ${b.stageName}</div>
                  <div class="bolt-desc">${b.desc}</div>
                  <div class="bolt-fix">${b.fix}</div>
                </div>
                <div class="bolt-right">
                  <div class="bolt-spec">Spec: ${b.spec} Nm</div>
                  <input class="t-in ${saved?(ok?'pass':'fail'):''}" type="number" id="qbt-${i}"
                    value="${saved||''}" placeholder="${b.spec}" min="0" max="999"
                    oninput="window._qcTorque('${b.ref}',${i},${b.spec},this.value)" data-ref="${b.ref}">
                  <div class="result-dot ${saved?(ok?'dot-pass':'dot-fail'):''}" id="qrd-${i}">${saved?(ok?'✓':'✗'):''}</div>
                </div>
              </div>`
            }).join('')}

            <div class="signoff-area" id="torque-signoff">
              ${data.torqueSigned
                ? `<div class="signed-info">✓ Signed: ${data.torqueSigned} · ${data.torqueSignedAt}</div>`
                : `<input id="sig-torque" type="text" placeholder="Operator name" style="flex:1;min-width:120px;max-width:180px;font-size:13px;font-family:var(--sans);padding:7px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
                   <button class="sign-btn" onclick="window._qcSign('torque')">Sign off</button>`}
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-sec-head" onclick="this.parentElement.classList.toggle('collapsed')">
            <div class="form-sec-icon green">👁</div>
            <div>
              <div class="form-sec-title">Visual inspection</div>
              <div class="form-sec-sub">Final quality checks</div>
            </div>
            <span class="chevron">›</span>
          </div>
          <div class="form-sec-body">
            <div class="insp-banner">Check each item carefully before signing off</div>
            <div class="check-list" style="padding:10px 14px">
              ${[
                'All structural bolts torqued to specification',
                'No visible damage, scratches or cosmetic defects',
                'All panels flush and secure — no rattles',
                'All actuators move freely through full range',
                'Castors and base frame correctly aligned',
                'All wiring routed and secured — no pinch points',
                'All handset buttons responding correctly',
                'No error codes or warning lights on power-on',
                'All decals applied correctly and legible',
                'Serial number plate attached and correct',
                'Unit fully cleaned',
              ].map((item, i) => {
                const checked = data.visual?.[i]
                return `<div class="chk-item ${checked?'checked':''}" onclick="window._qcVisual(${i})">
                  <input type="checkbox" id="vi-${i}" ${checked?'checked':''}>
                  <label class="chk-label" for="vi-${i}">${item}</label>
                </div>`
              }).join('')}
            </div>
            <div class="signoff-area">
              ${data.visualSigned
                ? `<div class="signed-info">✓ Signed: ${data.visualSigned} · ${data.visualSignedAt}</div>`
                : `<input id="sig-visual" type="text" placeholder="Inspector name" style="flex:1;min-width:120px;max-width:180px;font-size:13px;font-family:var(--sans);padding:7px 10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
                   <button class="sign-btn" onclick="window._qcSign('visual')">Sign off</button>`}
            </div>
          </div>
        </div>

        <div class="notes-wrap">
          <span class="notes-lbl">Notes / non-conformances</span>
          <textarea id="qcf-notes" rows="3" placeholder="Any issues found...">${data.notes||''}</textarea>
        </div>
      </div>`

    // State for current form data
    const formData = JSON.parse(JSON.stringify(data))
    formData.torque  = formData.torque  || {}
    formData.visual  = formData.visual  || {}

    window._qcTorque = (ref, i, spec, val) => {
      formData.torque[ref] = val
      const ok  = val && +val >= spec*0.9 && +val <= spec*1.1
      const inp = document.getElementById(`qbt-${i}`)
      const dot = document.getElementById(`qrd-${i}`)
      if (inp) { inp.classList.toggle('pass', !!(val && ok)); inp.classList.toggle('fail', !!(val && !ok)) }
      if (dot) { dot.className = `result-dot ${val?(ok?'dot-pass':'dot-fail'):''}`;  dot.textContent = val?(ok?'✓':'✗'):'' }
    }

    window._qcVisual = (i) => {
      formData.visual[i] = !formData.visual[i]
      const chk  = document.getElementById(`vi-${i}`)
      const item = chk?.closest('.chk-item')
      if (chk)  chk.checked = formData.visual[i]
      if (item) item.classList.toggle('checked', formData.visual[i])
    }

    window._qcSign = (section) => {
      const inp = document.getElementById(`sig-${section}`)
      if (!inp?.value.trim()) { toast('Enter a name to sign off'); return }
      const name = inp.value.trim()
      const ts   = new Date().toLocaleString('en-GB')
      formData[`${section}Signed`]   = name
      formData[`${section}SignedAt`] = ts
      const area = inp.closest('.signoff-area')
      if (area) area.innerHTML = `<div class="signed-info">✓ Signed: ${name} · ${ts}</div>`
      toast(`${section === 'torque' ? 'Torque' : 'Visual'} signed off`)
    }

    window._qcExport = () => toast('Export coming soon')

    window._qcSubmit = async () => {
      formData.notes = document.getElementById('qcf-notes')?.value || ''
      const record = {
        ...(existing || {}),
        job_id:        jobId,
        form_type:     'assembly',
        work_order:    job.work_order,
        serial:        job.serial,
        operator_name: job.operator_name,
        data:          formData,
      }
      try {
        await QCRecords.save(record)
        // Mark assembly QC done on the job
        const qcRecords = { ...(job.qc_records || {}), assembly: true }
        await Jobs.update(jobId, { qc_records: qcRecords })
        toast('QC form saved ✓')
        AppShell.closeScreen('form-screen')
      } catch(e) { toast('Error saving: ' + e.message) }
    }

  } catch(e) {
    document.getElementById('qcf-body').innerHTML = `<div class="empty-state">Error loading form: ${e.message}</div>`
  }
}
