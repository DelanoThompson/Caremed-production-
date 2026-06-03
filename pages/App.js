// pages/App.js — main shell after login
import { State } from '../lib/state.js'
import { Auth } from '../lib/db.js'
import { toast, closeModal } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'
import { renderDashboard } from './Dashboard.js'
import { openStockRequest } from './StockRequest.js'
import { renderScheduler } from './Scheduler.js'
import { renderBuilds } from './Builds.js'
import { renderRecords } from './Records.js'
import { renderAdmin } from './Admin.js'

const t = k => i18n.t(k)

export function renderApp() {
  const isSup = State.isSupervisor
  const app   = document.getElementById('app')

  app.innerHTML = `
    <div class="offline-bar" id="offline-bar">${t('offline')}</div>

    <div id="main-screen" class="screen active">
      <div class="topbar">
        <div class="topbar-inner">
          <div style="background:rgba(255,255,255,.12);width:auto;padding:0 10px;border-radius:8px;height:32px;display:flex;align-items:center">
            <span style="font-size:13px;font-weight:800;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:13px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:-0.5px">med</span>
          </div>
          <div>
            <div class="topbar-title">${t('appName')}</div>
            <div class="topbar-sub" id="topbar-user">${State.displayName} · ${t(State.profile?.role || 'operator')}</div>
          </div>
          <div class="topbar-actions">
            ${isSup ? `<button class="icon-btn" onclick="AppShell.switchTab('admin')" title="Admin">⚙</button>` : ''}
            <button class="icon-btn" onclick="AppShell.showSignOut()" title="Sign out">⇥</button>
          </div>
        </div>
        <div class="tab-bar">
          <button class="tab active" data-tab="dashboard" onclick="AppShell.switchTab('dashboard')">${t('dashboard')}</button>
          <button class="tab" data-tab="scheduler"        onclick="AppShell.switchTab('scheduler')">${t('scheduler')}</button>
          <button class="tab" data-tab="builds"           onclick="AppShell.switchTab('builds')">${t('builds')}</button>
          <button class="tab" data-tab="records"          onclick="AppShell.switchTab('records')">${t('records')}</button>
          ${isSup ? `<button class="tab" data-tab="admin" onclick="AppShell.switchTab('admin')">${t('admin')}</button>` : ''}
        </div>
      </div>
      <div id="tab-dashboard" class="tab-content active"></div>
      <div id="tab-scheduler" class="tab-content"></div>
      <div id="tab-builds"    class="tab-content"></div>
      <div id="tab-records"   class="tab-content"></div>
      ${isSup ? `<div id="tab-admin" class="tab-content"></div>` : ''}
    </div>

    <div id="build-screen"     class="screen slide-up"></div>
    <div id="slideshow-screen" class="screen slide-up"></div>
    <div id="form-screen"      class="screen slide-up"></div>
    <div id="product-screen"   class="screen slide-left"></div>

    <!-- Floating scan button -->
    <button onclick="window._openStockRequest()" title="Request stock"
      style="position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;background:var(--brand);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 16px rgba(58,58,127,.4);z-index:100">
      📦
    </button>`

  window.addEventListener('online',  () => { document.getElementById('offline-bar').style.display = 'none'; AppShell.refresh() })
  window.addEventListener('offline', () => { document.getElementById('offline-bar').style.display = 'block' })
  if (!navigator.onLine) document.getElementById('offline-bar').style.display = 'block'

  State.setupRealtime(() => AppShell.refresh())

  window._openStockRequest = () => openStockRequest()
  // Restore purchase email setting
  window._srPurchaseEmail = localStorage.getItem('cm_purchase_email') || 'purchasing@caremed-group.com'

  renderDashboard()

  window.AppShell = {
    switchTab(tab) {
      State.currentTab = tab
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
      document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`))
      AppShell.refresh()
    },
    refresh() {
      const tab = State.currentTab
      if      (tab === 'dashboard') renderDashboard()
      else if (tab === 'scheduler') renderScheduler()
      else if (tab === 'builds')    renderBuilds()
      else if (tab === 'records')   renderRecords()
      else if (tab === 'admin')     renderAdmin()
    },
    openScreen(id) {
      const el = document.getElementById(id)
      if (!el) return
      if (el.classList.contains('slide-up') || el.classList.contains('slide-left')) el.classList.add('open')
      else el.classList.add('active')
    },
    closeScreen(id) {
      const el = document.getElementById(id)
      if (!el) return
      if (el.classList.contains('slide-up') || el.classList.contains('slide-left')) el.classList.remove('open')
      else el.classList.remove('active')
      AppShell.refresh()
    },
    showSignOut() {
      import('./Settings.js').then(m => m.showSettingsModal())
    },
  }
}
