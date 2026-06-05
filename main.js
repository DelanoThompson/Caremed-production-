// main.js — app entry point
import { Auth } from './lib/db.js'
import { State } from './lib/state.js'
import { renderLogin } from './pages/Login.js'
import { renderApp } from './pages/App.js'
import { i18n } from './i18n/index.js'

let _booted = false

// Set up auth listener FIRST — before boot — so PASSWORD_RECOVERY is caught immediately
Auth.onAuthChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    _booted = true
    showSetPasswordScreen()
    return
  }
  if (event === 'SIGNED_OUT') {
    State.user = null; State.profile = null
    renderLogin(onLoginSuccess)
    return
  }
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
    if (_booted) return   // already handled by boot()
    State.user = session.user
    await State.loadProfile()
  }
})

// Race a promise against a timeout so boot never hangs forever
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout:' + label)), ms)),
  ])
}

async function boot() {
  // Small delay so the auth listener above can fire first if this is a recovery redirect
  await new Promise(r => setTimeout(r, 100))
  if (_booted) return

  _booted = true
  const trace = (m) => { try { window.__boot && window.__boot(m) } catch(e){} }
  try {
    trace('checking session…')
    const session = await withTimeout(Auth.getSession(), 6000, 'getSession')
    if (session?.user) {
      State.user = session.user
      trace('loading profile…')
      try {
        await withTimeout(State.loadProfile(), 6000, 'loadProfile')
      } catch(e) {
        // Profile fetch hung/failed — still let them into the app;
        // loadProfile will retry on next refresh.
      }
      if (State.profile?.active === false) {
        await Auth.signOut()
        renderLogin(onLoginSuccess)
        return
      }
      trace('rendering app…')
      renderApp()
      return
    }
  } catch(e) {
    trace('boot error: ' + (e.message || e))
    // getSession hung or failed — fall through to login so the app is usable
  }
  trace('showing login…')
  renderLogin(onLoginSuccess)
}

async function onLoginSuccess() {
  renderApp()
}

function showSetPasswordScreen() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <div class="login-screen">
      <div style="background:rgba(255,255,255,.15);border-radius:16px;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin-bottom:20px">
        <div style="text-align:center;line-height:1">
          <span style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-1px">Care</span><span style="font-size:28px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:-1px">med</span>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:4px">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:22px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:-0.5px">med</span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:32px;margin-top:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <div class="login-card">
        <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:6px">Set new password</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Choose a new password for your account.</div>
        <div id="setp-msg" style="display:none;border-radius:var(--r-sm);padding:10px 12px;font-size:13px;margin-bottom:12px"></div>
        <div class="field">
          <label>New password</label>
          <input type="password" id="setp-pw1" placeholder="Min. 8 characters" autocomplete="new-password">
        </div>
        <div class="field">
          <label>Confirm password</label>
          <input type="password" id="setp-pw2" placeholder="Repeat password" autocomplete="new-password">
        </div>
        <button class="btn btn-primary full" id="setp-btn" onclick="window._setNewPassword()">Set password & sign in</button>
      </div>
    </div>`

  window._setNewPassword = async () => {
    const pw1 = document.getElementById('setp-pw1').value
    const pw2 = document.getElementById('setp-pw2').value
    const btn = document.getElementById('setp-btn')
    const msg = document.getElementById('setp-msg')

    const showErr = (text) => {
      msg.style.display = 'block'
      msg.style.background = 'var(--red-bg)'
      msg.style.color = 'var(--red)'
      msg.style.border = '1px solid var(--red-light)'
      msg.textContent = text
    }

    if (!pw1 || pw1.length < 8) { showErr('Password must be at least 8 characters.'); return }
    if (pw1 !== pw2)             { showErr('Passwords do not match.'); return }

    btn.disabled = true
    btn.textContent = 'Saving...'

    try {
      const { getClient } = await import('./lib/db.js')
      const { data, error } = await getClient().auth.updateUser({ password: pw1 })
      if (error) throw error

      history.replaceState(null, '', window.location.pathname)

      msg.style.display = 'block'
      msg.style.background = 'var(--green-bg)'
      msg.style.color = 'var(--green)'
      msg.style.border = '1px solid var(--green-light)'
      msg.textContent = '✓ Password updated! Signing you in...'

      setTimeout(async () => {
        State.user = data.user
        await State.loadProfile()
        renderApp()
      }, 1000)
    } catch(e) {
      showErr(e.message || 'Something went wrong. Try requesting a new reset link.')
      btn.disabled = false
      btn.textContent = 'Set password & sign in'
    }
  }

  setTimeout(() => {
    document.getElementById('setp-pw2')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') window._setNewPassword()
    })
  }, 100)
}

// Unregister any service workers — they cause caching issues on Android
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()))
}

// Global error handler — shows error instead of blank screen
window.onerror = (msg, src, line, col, err) => {
  const app = document.getElementById('app')
  if (app && !app.innerHTML.trim()) {
    app.innerHTML = `<div style="padding:32px;font-family:sans-serif;background:#fdeaea;min-height:100vh">
      <div style="max-width:600px;margin:0 auto">
        <h2 style="color:#7a1f1f;margin-bottom:12px">App error</h2>
        <p style="color:#333;margin-bottom:8px">${msg}</p>
        <p style="color:#888;font-size:13px">${src} line ${line}</p>
        <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3A3A7F;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
      </div>
    </div>`
  }
}

window.addEventListener('online',  () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'none' })
window.addEventListener('offline', () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'block' })

boot().catch(err => {
  console.error('Boot failed:', err)
  const app = document.getElementById('app')
  if (app) app.innerHTML = `<div style="padding:32px;font-family:sans-serif;background:#fdeaea;min-height:100vh">
    <div style="max-width:600px;margin:0 auto">
      <h2 style="color:#7a1f1f;margin-bottom:12px">Failed to start</h2>
      <p style="color:#333;margin-bottom:8px">${err?.message || 'Unknown error'}</p>
      <button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#3A3A7F;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">Reload</button>
    </div>
  </div>`
})
