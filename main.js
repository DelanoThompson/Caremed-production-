// main.js — app entry point
import { Auth } from './lib/db.js'
import { State } from './lib/state.js'
import { renderLogin } from './pages/Login.js'
import { renderApp } from './pages/App.js'
import { i18n } from './i18n/index.js'

async function boot() {
  try {
    const session = await Auth.getSession()
    if (session?.user) {
      State.user = session.user
      await State.loadProfile()
      if (State.profile?.active === false) {
        await Auth.signOut()
        renderLogin(onLoginSuccess)
        return
      }
      renderApp()
      return
    }
  } catch(e) {}
  renderLogin(onLoginSuccess)
}

async function onLoginSuccess() {
  renderApp()
}

Auth.onAuthChange(async (event, session) => {
  if (event === 'SIGNED_OUT') {
    State.user = null; State.profile = null
    renderLogin(onLoginSuccess)
  } else if (event === 'SIGNED_IN' && session) {
    State.user = session.user
    await State.loadProfile()
  }
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {})
}

window.addEventListener('online',  () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'none' })
window.addEventListener('offline', () => { const b = document.getElementById('offline-bar'); if (b) b.style.display = 'block' })

boot()
