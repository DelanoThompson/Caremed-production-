// pages/Login.js
import { Auth, getClient } from '../lib/db.js'
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
          <input type="text" id="login-user" placeholder="name@caremed-group.com" autocomplete="username" autocapitalize="none" spellcheck="false">
        </div>
        <div class="field">
          <label>${t('password')}</label>
          <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary full" id="login-btn" onclick="window._loginSubmit()">${t('signIn')}</button>
        <div style="text-align:center;margin-top:16px">
          <button onclick="window._showForgotPassword()" style="background:none;border:none;color:rgba(255,255,255,.5);font-size:13px;cursor:pointer;text-decoration:underline;font-family:var(--sans)">Forgot password?</button>
        </div>
      </div>
    </div>

    <div id="forgot-screen" style="display:none;position:fixed;inset:0;background:linear-gradient(135deg,#3A3A7F 0%,#2a2a6f 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 20px">
      <div style="text-align:center;margin-bottom:4px">
        <span style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px">Care</span><span style="font-size:22px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:-0.5px">med</span>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:32px;margin-top:4px;letter-spacing:.5px;text-transform:uppercase">Healthcare Group</p>
      <div class="login-card">
        <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:6px">Reset password</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Enter your email and we'll send a reset link.</div>
        <div id="forgot-msg" style="display:none;border-radius:var(--r-sm);padding:10px 12px;font-size:13px;margin-bottom:12px"></div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="forgot-email" placeholder="your.name@caremed-group.com" autocapitalize="none">
        </div>
        <button class="btn btn-primary full" id="forgot-btn" onclick="window._sendReset()">Send reset link</button>
        <div style="text-align:center;margin-top:14px">
          <button onclick="window._showLogin()" style="background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;font-family:var(--sans)">← Back to sign in</button>
        </div>
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
      const msg = e?.message || ''
      if (msg.toLowerCase().includes('email not confirmed')) {
        errEl.textContent = 'Email not confirmed — ask your supervisor to confirm your account in Supabase.'
      } else if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid credentials')) {
        errEl.textContent = 'Incorrect username or password. Try your full email (e.g. name@caremed-group.com).'
      } else {
        errEl.textContent = msg || t('invalidCredentials')
      }
      errEl.classList.add('show')
      btn.disabled = false
      btn.textContent = t('signIn')
    }
  }

  document.getElementById('login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') window._loginSubmit()
  })

  window._showForgotPassword = () => {
    document.querySelector('.login-screen').style.display = 'none'
    const f = document.getElementById('forgot-screen')
    f.style.display = 'flex'
    f.style.flexDirection = 'column'
    f.style.alignItems = 'center'
    f.style.justifyContent = 'center'
  }

  window._showLogin = () => {
    document.getElementById('forgot-screen').style.display = 'none'
    document.querySelector('.login-screen').style.display = 'flex'
  }

  window._sendReset = async () => {
    const email = document.getElementById('forgot-email').value.trim()
    const btn   = document.getElementById('forgot-btn')
    const msg   = document.getElementById('forgot-msg')
    if (!email) {
      msg.style.display = 'block'
      msg.style.background = 'var(--red-bg)'
      msg.style.color = 'var(--red)'
      msg.textContent = 'Please enter your email address.'
      return
    }
    btn.disabled = true
    btn.textContent = 'Sending...'
    try {
      const { error } = await getClient().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/?reset=1',
      })
      if (error) throw error
      msg.style.display = 'block'
      msg.style.background = 'var(--green-bg)'
      msg.style.color = 'var(--green)'
      msg.style.border = '1px solid var(--green-light)'
      msg.textContent = '✓ Reset link sent — check your email.'
      btn.textContent = 'Sent'
    } catch(e) {
      msg.style.display = 'block'
      msg.style.background = 'var(--red-bg)'
      msg.style.color = 'var(--red)'
      msg.textContent = e.message || 'Something went wrong. Try again.'
      btn.disabled = false
      btn.textContent = 'Send reset link'
    }
  }
}
