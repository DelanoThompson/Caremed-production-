// pages/Login.js
import { Auth } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast } from '../lib/utils.js'
import { i18n } from '../i18n/index.js'

const t = k => i18n.t(k)

export function renderLogin(onSuccess) {
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
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <p class="login-sub" style="margin-top:16px">${t('loginSub')}</p>
      <div class="login-card">
        <div class="login-error" id="login-error"></div>
        <div class="field">
          <label>${t('username')}</label>
          <input type="text" id="login-user" placeholder="your.name" autocomplete="username" autocapitalize="none" spellcheck="false">
        </div>
        <div class="field">
          <label>${t('password')}</label>
          <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary full" id="login-btn" onclick="window._loginSubmit()">${t('signIn')}</button>
      </div>
    </div>`

  window._loginSubmit = async () => {
    const username = document.getElementById('login-user').value.trim()
    const password = document.getElementById('login-pass').value
    const btn      = document.getElementById('login-btn')
    const errEl    = document.getElementById('login-error')
    if (!username || !password) {
      errEl.textContent = t('invalidCredentials')
      errEl.classList.add('show')
      return
    }
    btn.disabled = true
    btn.textContent = '...'
    errEl.classList.remove('show')
    try {
      const { user } = await Auth.signIn(username, password)
      State.user = user
      await State.loadProfile()
      onSuccess()
    } catch(e) {
      errEl.textContent = t('invalidCredentials')
      errEl.classList.add('show')
      btn.disabled = false
      btn.textContent = t('signIn')
    }
  }

  document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') window._loginSubmit()
  })
}
