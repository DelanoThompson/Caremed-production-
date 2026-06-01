// pages/Admin.js
import { Profiles, Products } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast, modal, closeModal } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

let adminTab = 'users'

export function renderAdmin() {
  const el = document.getElementById('tab-admin')
  if (!el || !State.isSupervisor) return
  el.innerHTML = `<div class="page-pad">
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <button class="btn ${adminTab==='users'?'btn-primary':'btn-secondary'} sm" onclick="window._adminTab('users')">${t('users')}</button>
      <button class="btn ${adminTab==='products'?'btn-primary':'btn-secondary'} sm" onclick="window._adminTab('products')">${t('products')}</button>
    </div>
    <div id="admin-content"></div>
  </div>`
  window._adminTab = (tab) => { adminTab = tab; renderAdmin() }
  if (adminTab === 'users') renderUsers()
  else renderProducts()
}

async function renderUsers() {
  const el = document.getElementById('admin-content')
  el.innerHTML = `<div class="row-between">
    <div class="section-title" style="margin:0">${t('users')}</div>
    <button class="btn btn-primary sm" onclick="window._inviteUser()">+ ${t('inviteUser')}</button>
  </div>
  <div style="margin-top:10px" id="users-list"><div class="empty-state">Loading...</div></div>`
  window._inviteUser = showInviteModal
  try {
    const users = await Profiles.getAll()
    document.getElementById('users-list').innerHTML = users.map(u => `
      <div class="admin-item">
        <div class="admin-avatar">${(u.display_name||'?')[0].toUpperCase()}</div>
        <div><div class="admin-name">${u.display_name}</div>
        <div class="admin-email">${u.email||''} · ${t(u.role||'operator')}${u.active===false?' · <span style="color:var(--red)">Inactive</span>':''}</div></div>
        <div class="admin-actions">
          ${u.id !== State.user?.id ? `
          <button class="btn btn-ghost sm" onclick="window._toggleRole('${u.id}','${u.role}')">${u.role==='operator'?'→ Supervisor':'→ Operator'}</button>
          <button class="btn ${u.active===false?'btn-success':'btn-danger'} sm" onclick="window._toggleActive('${u.id}',${u.active!==false})">${u.active===false?t('reactivate'):t('deactivate')}</button>` :
          '<span class="badge badge-info">You</span>'}
        </div>
      </div>`).join('')
    window._toggleRole = async (id, currentRole) => {
      try { await Profiles.update(id, { role: currentRole==='operator'?'supervisor':'operator' }); renderAdmin(); toast('Role updated') } catch(e) { toast(e.message) }
    }
    window._toggleActive = async (id, currentActive) => {
      try { await Profiles.update(id, { active: !currentActive }); renderAdmin(); toast(currentActive?'User deactivated':'User reactivated') } catch(e) { toast(e.message) }
    }
  } catch(e) { document.getElementById('users-list').innerHTML = `<div class="empty-state">Error loading users</div>` }
}

function showInviteModal() {
  modal(`
    <div class="modal-title">${t('inviteUser')}</div>
    <div style="background:var(--blue-bg);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;font-size:12px;color:var(--blue);margin-bottom:14px;line-height:1.5">
      Inviting users requires your Supabase <strong>service role key</strong>.<br>
      Find it: Supabase dashboard → Project Settings → API → <em>service_role secret</em>
    </div>
    <div class="field"><label>Service role key</label><input type="password" id="inv-svckey" placeholder="eyJ... (service_role key, not anon key)"></div>
    <div class="field"><label>${t('displayName')}</label><input type="text" id="inv-name" placeholder="First Last"></div>
    <div class="field"><label>${t('username')}</label><input type="text" id="inv-user" placeholder="firstname.lastname" autocapitalize="none"></div>
    <div class="field"><label>${t('role')}</label>
      <select id="inv-role"><option value="operator">${t('operator')}</option><option value="supervisor">${t('supervisor')}</option></select>
    </div>
    <div class="field-hint" style="margin-bottom:12px">User will log in as <strong>username@caremed.internal</strong></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="window._closeModal()">${t('cancel')}</button>
      <button class="btn btn-primary" onclick="window._sendInvite()">${t('sendInvite')}</button>
    </div>`)
  window._closeModal = closeModal
  window._sendInvite = async () => {
    const name   = document.getElementById('inv-name').value.trim()
    const user   = document.getElementById('inv-user').value.trim().toLowerCase().replace(/[^a-z0-9.]/g, '')
    const role   = document.getElementById('inv-role').value
    const svcKey = document.getElementById('inv-svckey').value.trim()
    if (!name || !user) { toast(t('fillRequired')); return }
    if (!svcKey) { toast('Service role key required — see instructions above'); return }
    const email = `${user}@caremed.internal`
    try {
      const res = await fetch(`${window.__SB_URL__}/auth/v1/invite`, {
        method: 'POST',
        headers: {
          'apikey': svcKey,
          'Authorization': `Bearer ${svcKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, data: { display_name: name, role, username: user } }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.msg || err.message || 'Invite failed') }
      closeModal()
      toast(`✓ Invite sent to ${email}`)
      renderAdmin()
    } catch(e) { toast('Error: ' + e.message) }
  }
}

async function renderProducts() {
  const el = document.getElementById('admin-content')
  el.innerHTML = `<div class="row-between">
    <div class="section-title" style="margin:0">${t('products')}</div>
    <button class="btn btn-primary sm" onclick="window._newProduct()">+ New</button>
  </div>
  <div style="margin-top:10px" id="products-list"><div class="empty-state">Loading...</div></div>`
  window._newProduct = () => openProductBuilder(null)
  try {
    const products = await Products.getAll()
    const pl = document.getElementById('products-list')
    if (!products.length) { pl.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div>No products yet</div>`; return }
    pl.innerHTML = products.map(p => `<div class="product-card" onclick="window._editProduct('${p.id}')">
      <div class="product-name">${p.name}</div>
      <div class="product-meta">${(p.stages||[]).length} stages · ${p.description||''}</div>
    </div>`).join('')
    window._editProduct = async (id) => { const p = await Products.get(id); openProductBuilder(p) }
  } catch(e) { document.getElementById('products-list').innerHTML = `<div class="empty-state">Error loading products</div>` }
}

function openProductBuilder(product) {
  import('./ProductBuilder.js').then(m => m.renderProductBuilder(product))
}
