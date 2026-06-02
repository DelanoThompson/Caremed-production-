// pages/Slideshow.js — step-by-step build tracker
import { Jobs, StageLogs } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast } from '../lib/utils.js'

export function openSlideshow(job) {
  const screen = document.getElementById('slideshow-screen')
  screen.innerHTML = ''
  AppShell.openScreen('slideshow-screen')

  const stages    = job.product?.stages || []
  const completed = [...(job.stages_completed || [])]
  let   current   = job.current_stage ?? completed.length
  if (current >= stages.length) current = stages.length - 1

  const torqueData = {}
  const checkData  = {}
  let   stageStart = Date.now()
  let   timerHandle = null

  function canAdvance() {
    const stage = stages[current]
    if (!stage) return false
    if (completed.includes(current)) return true          // already done — always allow
    const bolts    = stage.bolts || []
    const items    = stage.items || []
    if (bolts.length === 0 && items.length === 0) return true  // no requirements
    const td = torqueData[current] || {}
    const cd = checkData[current]  || {}
    const boltsOk = bolts.every(b => td[b.ref] !== undefined && td[b.ref] !== '' && +td[b.ref] > 0)
    const itemsOk = items.every((_, i) => cd[i])
    return boltsOk && itemsOk
  }

  function updateNextBtn() {
    const btn = document.getElementById('ss-next-btn')
    if (!btn) return
    const ready = canAdvance()
    btn.removeAttribute('disabled')           // always clickable
    if (ready) {
      btn.classList.add('ready')
      btn.classList.remove('ss-not-ready')
    } else {
      btn.classList.remove('ready')
      btn.classList.add('ss-not-ready')
    }
  }

  function render() {
    const stage   = stages[current]
    if (!stage) return
    const isDone  = completed.includes(current)
    const isLast  = current === stages.length - 1
    const pct     = Math.round(completed.length / stages.length * 100)
    const bolts   = stage.bolts  || []
    const items   = stage.items  || []
    const instrs  = stage.instructions || []
    const isCheck = !!stage.isCheckpoint

    torqueData[current] = torqueData[current] || {}
    checkData[current]  = checkData[current]  || {}
    const td = torqueData[current]
    const cd = checkData[current]

    screen.innerHTML = `
      <div class="ss-topbar">
        <button class="ss-back" onclick="window._ssClose()">‹</button>
        <div class="ss-job-info">
          <div class="ss-job-title">${job.work_order} — ${job.model||''}</div>
          <div class="ss-job-sub">SN: ${job.serial||'—'} · ${job.operator_name||'—'}</div>
        </div>
        <span class="ss-count">${completed.length}/${stages.length}</span>
      </div>
      <div class="ss-prog-track"><div class="ss-prog-fill" style="width:${pct}%"></div></div>

      <div class="ss-slide-wrap" id="ss-slide">
        <div class="ss-stage-header ${isCheck?'checkpoint':isDone?'done':''}">
          <div class="ss-stage-badge">Stage ${current+1} of ${stages.length}${isCheck?' · Checkpoint':''}</div>
          <div class="ss-stage-name">${stage.name}</div>
          <div class="ss-stage-steps">Steps ${stage.steps||''}${stage.est?` · Est. ${stage.est} min`:''}</div>
        </div>

        ${isCheck && stage.banner ? `<div class="insp-banner">⚠ ${stage.banner}</div>` : ''}

        ${instrs.length ? `
        <div class="ss-sec-title">Instructions</div>
        <div class="ss-instructions">
          ${instrs.map((ins, i) => `<div class="ss-inst-row">
            <div class="ss-inst-num">${i+1}</div>
            <div class="ss-inst-text">${ins}</div>
          </div>`).join('')}
        </div>` : ''}

        ${bolts.length ? `
        <div class="ss-sec-title">Torque checks — fill all values to unlock next stage</div>
        <div class="ss-bolt-list">
          ${bolts.map((b, bi) => {
            const val = td[b.ref] || ''
            const ok  = val && +val >= b.spec*0.9 && +val <= b.spec*1.1
            const fail = val && !ok
            return `<div class="ss-bolt-row">
              <div class="ss-bolt-info">
                <div class="ss-bolt-ref">${b.ref}</div>
                <div class="ss-bolt-desc">${b.desc}</div>
                <div class="ss-bolt-fix">${b.fix}</div>
              </div>
              <div class="ss-bolt-right">
                <div class="ss-bolt-spec">Spec: ${b.spec} Nm</div>
                <input class="ss-t-in ${ok?'pass':fail?'fail':''}" type="number" id="t-${bi}"
                  inputmode="decimal" placeholder="${b.spec}" value="${val}"
                  min="0" max="999" step="0.1"
                  oninput="window._ssTorque('${b.ref}',${bi},${b.spec},this.value)">
                <div class="ss-result-dot ${ok?'dot-pass':fail?'dot-fail':''}" id="rd-${bi}">
                  ${ok?'✓':fail?'✗':''}
                </div>
              </div>
            </div>`
          }).join('')}
        </div>` : ''}

        ${items.length ? `
        <div class="ss-sec-title">Visual checks — tick all items to unlock next stage</div>
        <div class="ss-check-list">
          ${items.map((item, ii) => `<div class="ss-chk-item ${cd[ii]?'checked':''}" onclick="window._ssCheck(${ii})">
            <input type="checkbox" id="chk-${ii}" ${cd[ii]?'checked':''} onchange="window._ssCheck(${ii})">
            <label for="chk-${ii}">${item}</label>
          </div>`).join('')}
        </div>` : ''}

        ${isDone ? `<div class="ss-done-banner">✓ Stage complete</div>` : ''}
      </div>

      <div class="ss-footer">
        <div class="ss-timer" id="ss-timer">0:00</div>
        <button class="ss-next-btn" id="ss-next-btn" onclick="window._ssNext()">
          ${isDone ? (isLast ? 'All done ✓' : 'Next stage →') : (isLast ? 'Complete build' : 'Mark complete & next →')}
        </button>
      </div>`

    startTimer()
    updateNextBtn()
  }

  function startTimer() {
    clearInterval(timerHandle)
    stageStart = Date.now()
    timerHandle = setInterval(() => {
      const el = document.getElementById('ss-timer')
      if (!el) { clearInterval(timerHandle); return }
      const s = Math.floor((Date.now() - stageStart) / 1000)
      el.textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`
    }, 1000)
  }

  window._ssTorque = (ref, bi, spec, val) => {
    torqueData[current][ref] = val
    const dot = document.getElementById(`rd-${bi}`)
    const inp = document.getElementById(`t-${bi}`)
    if (val) {
      const n  = +val
      const ok = n >= spec*0.9 && n <= spec*1.1
      if (dot) { dot.className = `ss-result-dot ${ok?'dot-pass':'dot-fail'}`; dot.textContent = ok?'✓':'✗' }
      if (inp) { inp.classList.toggle('pass', ok); inp.classList.toggle('fail', !ok) }
    } else {
      if (dot) { dot.className = 'ss-result-dot'; dot.textContent = '' }
      if (inp) { inp.classList.remove('pass','fail') }
    }
    updateNextBtn()
  }

  window._ssCheck = (ii) => {
    checkData[current][ii] = !checkData[current][ii]
    const chk  = document.getElementById(`chk-${ii}`)
    const item = chk?.closest('.ss-chk-item')
    if (chk)  chk.checked = checkData[current][ii]
    if (item) item.classList.toggle('checked', checkData[current][ii])
    updateNextBtn()
  }

  window._ssNext = async () => {
    if (!canAdvance()) {
      const stage = stages[current]
      const bolts = stage?.bolts || []
      const items = stage?.items || []
      const td = torqueData[current] || {}
      const cd = checkData[current]  || {}
      const missingBolts = bolts.filter(b => !td[b.ref] || +td[b.ref] <= 0)
      const missingItems = items.filter((_, i) => !cd[i])
      let msg = 'Please complete all checks first:\n'
      if (missingBolts.length) msg += `\n• ${missingBolts.length} torque value(s) missing`
      if (missingItems.length) msg += `\n• ${missingItems.length} visual check(s) not ticked`
      toast(msg)
      return
    }

    clearInterval(timerHandle)
    const elapsed = Math.round((Date.now() - stageStart) / 1000)

    if (!completed.includes(current)) completed.push(current)

    const updates = { stages_completed: completed, current_stage: current + 1 }
    if (current === stages.length - 1) updates.status = 'complete'
    else updates.status = 'in_progress'

    try {
      await StageLogs.upsert({
        job_id:     job.id,
        stage_id:   current,
        operator:   State.displayName,
        started_at: new Date(Date.now() - elapsed*1000).toISOString(),
        ended_at:   new Date().toISOString(),
      })
      await Jobs.update(job.id, updates)
    } catch(e) { console.error(e) }

    if (current >= stages.length - 1) {
      toast('Build complete! 🎉')
      AppShell.closeScreen('slideshow-screen')
      return
    }
    current++
    render()
  }

  window._ssClose = () => {
    clearInterval(timerHandle)
    AppShell.closeScreen('slideshow-screen')
  }

  render()
}
