// lib/db.js — Supabase wrapper
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://zxlvxfquzdufkuosyky.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4bHZ4ZnF1emR6ZnVrdW9zeWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNjAzNzcsImV4cCI6MjA5NTYzNjM3N30.7k2BU8HbKPubUoWYwksPdryxUoGeDtmQO6x4KRX-Zo8'

// Expose for Admin invite API calls
window.__SB_URL__ = SUPABASE_URL
window.__SB_KEY__ = SUPABASE_KEY

let _client = null
export function getClient() {
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_KEY)
  return _client
}

// AUTH
export const Auth = {
  async signIn(username, password) {
    // If they typed a full email, try it directly
    if (username.includes('@')) {
      const { data, error } = await getClient().auth.signInWithPassword({ email: username, password })
      if (!error) return data
    }
    // Try @caremed.internal format first
    const internal = `${username.split('@')[0]}@caremed.internal`
    const { data: d1, error: e1 } = await getClient().auth.signInWithPassword({ email: internal, password })
    if (!e1) return d1
    // Fall back to the username as a full email (e.g. delano.thompson@caremed-group.com)
    const { data: d2, error: e2 } = await getClient().auth.signInWithPassword({ email: username, password })
    if (!e2) return d2
    // Both failed — throw the original error
    throw e1
  },
  async signOut() { await getClient().auth.signOut() },
  async getSession() { const { data } = await getClient().auth.getSession(); return data.session },
  async getUser()    { const { data } = await getClient().auth.getUser();    return data.user },
  onAuthChange(cb)   { return getClient().auth.onAuthStateChange(cb) },
}

// PROFILES
export const Profiles = {
  async get(userId) {
    const { data, error } = await getClient().from('profiles').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  },
  async getAll() {
    const { data, error } = await getClient().from('profiles').select('*').order('display_name')
    if (error) throw error
    return data || []
  },
  async update(userId, updates) {
    const { data, error } = await getClient().from('profiles').update(updates).eq('id', userId).select().single()
    if (error) throw error
    return data
  },
  async upsert(profile) {
    const { data, error } = await getClient().from('profiles').upsert(profile).select().single()
    if (error) throw error
    return data
  },
}

// PRODUCTS
export const Products = {
  async getAll() {
    const { data, error } = await getClient().from('products').select('*').eq('active', true).order('name')
    if (error) throw error
    return data || []
  },
  async get(id) {
    const { data, error } = await getClient().from('products').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  async save(product) {
    if (product.id) {
      const { data, error } = await getClient().from('products').update(product).eq('id', product.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await getClient().from('products').insert(product).select().single()
      if (error) throw error
      return data
    }
  },
  async deactivate(id) {
    await getClient().from('products').update({ active: false }).eq('id', id)
  },
}

// JOBS
export const Jobs = {
  async getAll(filters = {}) {
    let q = getClient().from('jobs').select('*, product:products(name,stages)').order('scheduled_date')
    if (filters.date)       q = q.eq('scheduled_date', filters.date)
    if (filters.status)     q = q.eq('status', filters.status)
    if (filters.operatorId) q = q.eq('operator_id', filters.operatorId)
    if (filters.from)       q = q.gte('scheduled_date', filters.from)
    if (filters.to)         q = q.lte('scheduled_date', filters.to)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async get(id) {
    const { data, error } = await getClient().from('jobs').select('*, product:products(*)').eq('id', id).single()
    if (error) throw error
    return data
  },
  async create(job) {
    const { data, error } = await getClient().from('jobs').insert(job).select().single()
    if (error) throw error
    return data
  },
  async update(id, updates) {
    const { data, error } = await getClient().from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async getTodayStats() {
    const today = new Date().toISOString().split('T')[0]
    const { data: todayJobs } = await getClient().from('jobs').select('status').eq('scheduled_date', today)
    const { data: inProg }    = await getClient().from('jobs').select('id').eq('status', 'in_progress')
    const { data: done }      = await getClient().from('jobs').select('id').eq('status', 'complete').gte('updated_at', today)
    return {
      scheduled:  (todayJobs || []).length,
      inProgress: (inProg || []).length,
      complete:   (done || []).length,
      onHold:     (todayJobs || []).filter(j => j.status === 'hold').length,
    }
  },
}

// STAGE LOGS
export const StageLogs = {
  async getForJob(jobId) {
    const { data, error } = await getClient().from('stage_logs').select('*').eq('job_id', jobId).order('started_at')
    if (error) throw error
    return data || []
  },
  async upsert(log) {
    const { data, error } = await getClient().from('stage_logs')
      .upsert(log, { onConflict: 'job_id,stage_id' }).select().single()
    if (error) throw error
    return data
  },
}

// QC RECORDS
export const QCRecords = {
  async getForJob(jobId, formType) {
    let q = getClient().from('qc_records').select('*').eq('job_id', jobId)
    if (formType) q = q.eq('form_type', formType)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  async search(term) {
    const { data, error } = await getClient().from('qc_records').select('*')
      .or(`work_order.ilike.%${term}%,serial.ilike.%${term}%,operator_name.ilike.%${term}%`)
      .order('updated_at', { ascending: false }).limit(50)
    if (error) throw error
    return data || []
  },
  async getAll() {
    const { data, error } = await getClient().from('qc_records').select('*')
      .order('updated_at', { ascending: false }).limit(50)
    if (error) throw error
    return data || []
  },
  async save(record) {
    if (record.id) {
      const { data, error } = await getClient().from('qc_records')
        .update({ ...record, updated_at: new Date().toISOString() }).eq('id', record.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await getClient().from('qc_records').insert(record).select().single()
      if (error) throw error
      return data
    }
  },
}

// TRANSFER REQUESTS
export const Transfers = {
  async getAll() {
    const { data, error } = await getClient()
      .from('transfer_requests')
      .select('*, job:jobs(work_order,model,serial), requester:profiles!requester_id(display_name)')
      .eq('status', 'pending').order('created_at')
    if (error) throw error
    return data || []
  },
  async create(req) {
    const { data, error } = await getClient().from('transfer_requests').insert(req).select().single()
    if (error) throw error
    return data
  },
  async respond(id, status, supervisorId) {
    const { data, error } = await getClient().from('transfer_requests')
      .update({ status, responded_by: supervisorId, responded_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

// REALTIME
export function subscribeToJobs(cb) {
  return getClient().channel('jobs-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_logs' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_requests' }, cb)
    .subscribe()
}
