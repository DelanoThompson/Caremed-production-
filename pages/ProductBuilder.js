// pages/ProductBuilder.js
import { Products } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast } from '../lib/utils.js'

export function renderProductBuilder(product) {
  const screen = document.getElementById('product-screen')
  AppShell.openScreen('product-screen')

  const isNew  = !product
  let   stages = JSON.parse(JSON.stringify(product?.stages || []))
  let   name   = product?.name || ''
  let   desc   = product?.description || ''

  function render() {
    screen.innerHTML = `
      <div class="topbar">
        <div class="topbar-inner">
          <button class="back-btn" onclick="AppShell.closeScreen('product-screen')">‹</button>
          <div><div class="topbar-title">${isNew ? 'New product' : 'Edit product'}</div></div>
          <button class="btn btn-primary sm" onclick="window._pbSave()">Save</button>
        </div>
      </div>
      <div class="page-pad">
        <div class="field"><label>Product name</label><input type="text" id="pb-name" value="${name}" placeholder="e.g. Caremed Standard"></div>
        <div class="field"><label>Description</label><input type="text" id="pb-desc" value="${desc}" placeholder="Short description"></div>

        <div style="background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:var(--r);padding:14px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:600;color:var(--brand);margin-bottom:6px">✦ Import stages with Claude AI</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5">Describe your build process and Claude will generate all the stages, torque specs and checklists automatically.</div>
          <button class="btn btn-primary sm" onclick="window._pbClaudeImport()">Open Claude prompt</button>
        </div>

        <div class="section-title mt">Build stages (${stages.length})</div>
        <div id="pb-stages">
          ${stages.map((s, i) => `
            <div class="stage-builder" id="pbstg-${i}">
              <div class="stage-builder-head">
                <span class="drag-handle">⠿</span>
                <div style="flex:1"><strong style="font-size:14px">${i+1}. ${s.name||'Untitled stage'}</strong>
                  <div style="font-size:12px;color:var(--text3)">${(s.bolts||[]).length} bolts · ${(s.items||[]).length} checks · Est. ${s.est||'?'} min</div>
                </div>
                <button class="btn btn-ghost sm" onclick="window._pbEditStage(${i})">Edit</button>
                <button class="btn btn-danger sm" onclick="window._pbDeleteStage(${i})">✕</button>
              </div>
            </div>`).join('')}
        </div>
        <button class="add-btn" onclick="window._pbAddStage()">+ Add stage</button>

        ${!isNew ? `<div class="divider"></div>
        <button class="btn btn-danger full" onclick="window._pbDeactivate()">Deactivate product</button>` : ''}
      </div>`

    window._pbSave = async () => {
      name = document.getElementById('pb-name').value.trim()
      desc = document.getElementById('pb-desc').value.trim()
      if (!name) { toast('Product name is required'); return }
      try {
        await Products.save({ ...(product||{}), name, description:desc, stages, active:true, created_by: State.user?.id })
        toast('Product saved')
        AppShell.closeScreen('product-screen')
        AppShell.refresh()
      } catch(e) { toast('Error: ' + e.message) }
    }
    window._pbAddStage = () => {
      stages.push({ name:'', short:'', steps:'', est:15, instructions:[], bolts:[], items:[] })
      editStage(stages.length - 1)
    }
    window._pbEditStage = (i) => editStage(i)
    window._pbDeleteStage = (i) => { stages.splice(i, 1); render() }
    window._pbClaudeImport = () => {
      const productName = document.getElementById('pb-name').value.trim() || 'the product'
      const prompt = `You are helping configure a manufacturing production app for Caremed Healthcare Group.

I need you to generate a build sheet for: ${productName}

Please output a JSON array of build stages in EXACTLY this format — no extra text, just the raw JSON array:

[
  {
    "name": "Full stage name",
    "short": "6-char label",
    "steps": "1-3",
    "est": 15,
    "isCheckpoint": false,
    "banner": "",
    "instructions": ["Step instruction 1", "Step instruction 2"],
    "bolts": [
      { "ref": "S1-01", "desc": "Bolt description", "fix": "M8 Caphead 30mm", "spec": 25 }
    ],
    "items": []
  }
]

Rules:
- "short" must be 6 chars or less
- "est" is estimated minutes as a number
- "spec" is torque in Nm as a number
- For checkpoint/inspection stages: set "isCheckpoint": true, leave "bolts": [], put checklist items in "items": ["Check 1", "Check 2"]
- For normal stages: leave "items": [], put bolt torque specs in "bolts"
- "banner" is only used on checkpoint stages — a short warning message
- Include ALL bolts with their torque specs
- Be thorough — include every assembly step

Generate the stages now:`

      const overlay = document.createElement('div')
      overlay.className = 'modal-overlay open'
      overlay.innerHTML = `<div class="modal-card" style="max-height:85vh;overflow-y:auto">
        <div class="modal-title">Import stages with Claude AI</div>

        <div style="font-size:13px;color:var(--text2);margin-bottom:12px;line-height:1.5">
          <strong>Step 1:</strong> Copy the prompt below<br>
          <strong>Step 2:</strong> Paste it into <a href="https://claude.ai" target="_blank" style="color:var(--brand)">claude.ai</a> and send it<br>
          <strong>Step 3:</strong> Copy Claude's response (the JSON array) and paste it below<br>
          <strong>Step 4:</strong> Click Import
        </div>

        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <label style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px">Claude prompt — copy this</label>
            <button class="btn btn-ghost sm" onclick="navigator.clipboard.writeText(document.getElementById('claude-prompt').value).then(()=>this.textContent='Copied ✓')">Copy</button>
          </div>
          <textarea id="claude-prompt" rows="6" style="width:100%;font-size:11px;font-family:var(--mono);padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);resize:none">${prompt.replace(/`/g, '\\`')}</textarea>
        </div>

        <div style="margin-bottom:12px">
          <label style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:4px">Paste Claude's response here</label>
          <textarea id="claude-response" rows="8" style="width:100%;font-size:11px;font-family:var(--mono);padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text);resize:none" placeholder='[{"name":"Stage 1",...}]'></textarea>
        </div>

        <div id="claude-import-msg" style="display:none;padding:8px 12px;border-radius:var(--r-sm);font-size:13px;margin-bottom:12px"></div>

        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="window._pbParseClaudeResponse()">Import stages</button>
        </div>
      </div>`
      document.getElementById('modal-container').appendChild(overlay)

      window._pbParseClaudeResponse = () => {
        const raw = document.getElementById('claude-response').value.trim()
        const msg = document.getElementById('claude-import-msg')
        if (!raw) { msg.style.display='block'; msg.style.background='var(--red-bg)'; msg.style.color='var(--red)'; msg.textContent='Please paste Claude\'s response first.'; return }
        try {
          // Strip any markdown code fences if Claude wrapped it
          const cleaned = raw.replace(/^```(?:json)?\n?/,'').replace(/\n?```$/,'').trim()
          const parsed = JSON.parse(cleaned)
          if (!Array.isArray(parsed)) throw new Error('Response must be a JSON array')
          if (!parsed.length) throw new Error('Array is empty')
          // Validate and normalise each stage
          const normalised = parsed.map((s, i) => ({
            name:         s.name         || `Stage ${i+1}`,
            short:        (s.short       || s.name?.slice(0,6) || `S${i+1}`).slice(0,8),
            steps:        s.steps        || String(i+1),
            est:          Number(s.est)  || 15,
            isCheckpoint: !!s.isCheckpoint,
            banner:       s.banner       || '',
            instructions: Array.isArray(s.instructions) ? s.instructions : [],
            bolts:        Array.isArray(s.bolts)  ? s.bolts.map(b => ({ ref: b.ref||'', desc: b.desc||'', fix: b.fix||'', spec: Number(b.spec)||0 })) : [],
            items:        Array.isArray(s.items)  ? s.items : [],
          }))
          stages.length = 0
          normalised.forEach(s => stages.push(s))
          overlay.remove()
          render()
          // Show success toast
          import('../lib/utils.js').then(m => m.toast(`✓ Imported ${stages.length} stages from Claude`))
        } catch(e) {
          msg.style.display='block'; msg.style.background='var(--red-bg)'; msg.style.color='var(--red)'
          msg.textContent = `Could not parse response: ${e.message}. Make sure you copied only the JSON array.`
        }
      }
    }

    window._pbDeactivate  = async () => {
      if (!confirm('Deactivate this product? It will be hidden from new jobs.')) return
      try { await Products.deactivate(product.id); toast('Product deactivated'); AppShell.closeScreen('product-screen'); AppShell.refresh() } catch(e) { toast(e.message) }
    }
  }

  function editStage(idx) {
    const s = stages[idx]
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay open'
    overlay.innerHTML = `<div class="modal-card" style="max-height:85vh;overflow-y:auto">
      <div class="modal-title">Edit stage ${idx+1}</div>
      <div class="field"><label>Name</label><input type="text" id="es-name" value="${s.name||''}" placeholder="Stage name"></div>
      <div class="field"><label>Short label</label><input type="text" id="es-short" value="${s.short||''}" placeholder="6 chars max" maxlength="8"></div>
      <div class="field"><label>Steps ref</label><input type="text" id="es-steps" value="${s.steps||''}" placeholder="e.g. 1-3"></div>
      <div class="field"><label>Est. minutes</label><input type="number" id="es-est" value="${s.est||15}" min="1" max="480"></div>
      <div class="field">
        <label>Type</label>
        <select id="es-type">
          <option value="normal"     ${!s.isCheckpoint?'selected':''}>Normal stage</option>
          <option value="checkpoint" ${s.isCheckpoint?'selected':''}>Checkpoint / visual inspection</option>
        </select>
      </div>
      <div class="field"><label>Instructions (one per line)</label>
        <textarea id="es-instr" rows="4" placeholder="Step 1...\nStep 2...">${(s.instructions||[]).join('\n')}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="window._esSave(${idx})">Save stage</button>
      </div>
    </div>`
    document.getElementById('modal-container').appendChild(overlay)
    window._esSave = (i) => {
      stages[i] = {
        ...stages[i],
        name:         document.getElementById('es-name').value.trim(),
        short:        document.getElementById('es-short').value.trim(),
        steps:        document.getElementById('es-steps').value.trim(),
        est:          +document.getElementById('es-est').value || 15,
        isCheckpoint: document.getElementById('es-type').value === 'checkpoint',
        instructions: document.getElementById('es-instr').value.split('\n').map(s=>s.trim()).filter(Boolean),
      }
      overlay.remove()
      render()
    }
  }

  render()
}
