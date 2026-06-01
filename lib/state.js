// lib/state.js — global app state
import { Auth, Profiles, subscribeToJobs } from './db.js'

export const State = {
  user:        null,
  profile:     null,
  currentTab:  'dashboard',
  realtimeSub: null,

  get isSupervisor() { return this.profile?.role === 'supervisor' },
  get displayName()  { return this.profile?.display_name || this.user?.email || '—' },

  async loadProfile() {
    if (!this.user) return
    try {
      this.profile = await Profiles.get(this.user.id)
    } catch(e) {
      const meta = this.user.user_metadata || {}
      this.profile = await Profiles.upsert({
        id:           this.user.id,
        email:        this.user.email,
        display_name: meta.display_name || meta.username || this.user.email.split('@')[0],
        role:         meta.role || 'operator',
        active:       true,
      })
    }
  },

  setupRealtime(onUpdate) {
    if (this.realtimeSub) this.realtimeSub.unsubscribe()
    this.realtimeSub = subscribeToJobs(onUpdate)
  },
}
