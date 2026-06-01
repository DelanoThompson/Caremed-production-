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
