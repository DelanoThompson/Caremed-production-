// pages/StockRequest.js — operator barcode scan → purchase request
import { State } from '../lib/state.js'
import { getClient } from '../lib/db.js'
import { toast } from '../lib/utils.js'

export function openStockRequest() {
  const screen = document.getElementById('build-screen') // reuse slide-up screen
  AppShell.openScreen('build-screen')

  screen.innerHTML = `
    <div class="topbar">
      <div class="topbar-inner">
        <button class="back-btn" onclick="AppShell.closeScreen('build-screen')">‹</button>
        <div>
          <div class="topbar-title">Request stock</div>
          <div class="topbar-sub">Scan barcode or enter manually</div>
        </div>
      </div>
    </div>

    <div class="page-pad">

      <!-- Scanner area -->
      <div id="scanner-wrap" style="margin-bottom:16px">
        <div style="background:#000;border-radius:var(--r);overflow:hidden;position:relative;aspect-ratio:4/3;max-height:260px;display:flex;align-items:center;justify-content:center" id="cam-wrap">
          <video id="cam-video" style="width:100%;height:100%;object-fit:cover" playsinline autoplay muted></video>
          <div id="scan-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none">
            <div style="width:220px;height:80px;border:2px solid #5de88a;border-radius:6px;box-shadow:0 0 0 9999px rgba(0,0,0,0.45)"></div>
            <div style="color:#5de88a;font-size:12px;margin-top:10px;font-weight:500">Align barcode within frame</div>
          </div>
          <div id="cam-placeholder" style="position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:var(--surface3)">
            <div style="font-size:40px;margin-bottom:8px">📷</div>
            <div style="font-size:13px;color:var(--text3)">Camera not available</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary sm" id="scan-btn" onclick="window._srStartScan()" style="flex:1">📷 Start camera</button>
          <button class="btn btn-secondary sm" id="stop-btn" onclick="window._srStopScan()" style="flex:1;display:none">⏹ Stop</button>
        </div>
      </div>

      <!-- Manual entry -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:12px;color:var(--text3)">or enter barcode manually</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" id="sr-barcode-input" placeholder="EAN-13 barcode" inputmode="numeric"
          style="flex:1;font-size:14px;font-family:var(--mono);padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
        <button class="btn btn-primary" onclick="window._srLookup()">Look up</button>
      </div>

      <!-- Result card -->
      <div id="sr-result" style="display:none"></div>

      <!-- Request form -->
      <div id="sr-form" style="display:none">
        <div class="section-title mt">Purchase request</div>
        <div class="field">
          <label>Quantity needed</label>
          <input type="number" id="sr-qty" value="1" min="1" style="font-size:16px;font-family:var(--mono)">
        </div>
        <div class="field">
          <label>Reason / notes (optional)</label>
          <textarea id="sr-notes" rows="2" placeholder="e.g. Running low, needed for WO-0045..."></textarea>
        </div>
        <button class="btn btn-primary full" onclick="window._srSendRequest()">📧 Send purchase request</button>
      </div>

    </div>`

  let stream = null
  let scanInterval = null
  let currentItem = null

  // Start camera + BarcodeDetector
  window._srStartScan = async () => {
    const video = document.getElementById('cam-video')
    const scanBtn = document.getElementById('scan-btn')
    const stopBtn = document.getElementById('stop-btn')
    const placeholder = document.getElementById('cam-placeholder')

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      video.srcObject = stream
      scanBtn.style.display = 'none'
      stopBtn.style.display = 'block'

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39'] })
        scanInterval = setInterval(async () => {
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue
                document.getElementById('sr-barcode-input').value = code
                window._srStopScan()
                window._srLookup()
              }
            } catch(e) {}
          }
        }, 500)
      } else {
        toast('Auto-detect not supported on this browser — enter barcode manually')
      }
    } catch(e) {
      placeholder.style.display = 'flex'
      video.style.display = 'none'
      document.getElementById('scan-overlay').style.display = 'none'
      toast('Camera access denied — please enter barcode manually')
    }
  }

  window._srStopScan = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    if (scanInterval) { clearInterval(scanInterval); scanInterval = null }
    document.getElementById('scan-btn').style.display = 'block'
    document.getElementById('stop-btn').style.display = 'none'
  }

  window._srLookup = async () => {
    const barcode = document.getElementById('sr-barcode-input').value.trim()
    if (!barcode) { toast('Enter a barcode first'); return }

    const resultEl = document.getElementById('sr-result')
    const formEl   = document.getElementById('sr-form')
    resultEl.style.display = 'block'
    resultEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Looking up barcode...</div>`
    formEl.style.display = 'none'

    try {
      const { data, error } = await getClient()
        .from('stock_items')
        .select('*')
        .eq('barcode', barcode)
        .single()

      if (error || !data) {
        resultEl.innerHTML = `<div style="background:var(--amber-bg);border:1px solid var(--amber-light);border-radius:var(--r);padding:14px">
          <div style="font-size:14px;font-weight:600;color:var(--amber);margin-bottom:4px">Item not found</div>
          <div style="font-size:13px;color:var(--text2)">Barcode <span style="font-family:var(--mono)">${barcode}</span> is not in the stock catalogue.</div>
          <div style="font-size:12px;color:var(--text3);margin-top:6px">Ask your supervisor to upload the product catalogue in Admin → Stock.</div>
        </div>`
        return
      }

      currentItem = data
      resultEl.innerHTML = `<div style="background:var(--green-bg);border:1px solid var(--green-light);border-radius:var(--r);padding:14px">
        <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Item found ✓</div>
        <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:4px">${data.description}</div>
        <div style="font-size:13px;color:var(--text3);font-family:var(--mono)">${data.product_code}</div>
        ${data.supplier_name ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">Supplier: ${data.supplier_name}</div>` : ''}
        ${data.unit_of_measure ? `<div style="font-size:12px;color:var(--text2)">Unit: ${data.unit_of_measure}</div>` : ''}
      </div>`
      formEl.style.display = 'block'
    } catch(e) {
      resultEl.innerHTML = `<div class="empty-state">Error: ${e.message}</div>`
    }
  }

  window._srSendRequest = () => {
    if (!currentItem) return
    const qty   = document.getElementById('sr-qty').value || '1'
    const notes = document.getElementById('sr-notes').value.trim()
    const op    = State.displayName
    const date  = new Date().toLocaleDateString('en-GB')
    const time  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    const subject = `Purchase Request — ${currentItem.product_code} — ${currentItem.description}`
    const body = [
      `PURCHASE REQUEST`,
      ``,
      `Requested by: ${op}`,
      `Date/time: ${date} ${time}`,
      ``,
      `ITEM DETAILS`,
      `Product code: ${currentItem.product_code}`,
      `Description:  ${currentItem.description}`,
      `Barcode:      ${currentItem.barcode || '—'}`,
      `Supplier:     ${currentItem.supplier_name || '—'}`,
      `Supplier ref: ${currentItem.supplier_product_code || '—'}`,
      `Unit:         ${currentItem.unit_of_measure || '—'}`,
      ``,
      `REQUEST`,
      `Quantity needed: ${qty} ${currentItem.unit_of_measure || 'units'}`,
      notes ? `Notes: ${notes}` : '',
      ``,
      `---`,
      `Sent from Caremed Production App`,
    ].filter(l => l !== undefined).join('\n')

    // Open email client with pre-filled request
    const mailto = `mailto:${window._srPurchaseEmail || 'purchasing@caremed-group.com'}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    toast('Email app opened — review and send')
  }

  // Enter key on barcode input
  document.getElementById('sr-barcode-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') window._srLookup()
  })
}
