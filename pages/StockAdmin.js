// pages/StockAdmin.js — supervisor stock catalogue management
import { getClient } from '../lib/db.js'
import { State } from '../lib/state.js'
import { toast } from '../lib/utils.js'

export async function renderStockAdmin(el) {
  if (!el) return
  el.innerHTML = `<div class="page-pad">
    <div class="row-between" style="margin-bottom:16px">
      <div class="section-title" style="margin:0">Stock catalogue</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary sm" onclick="window._stockExportTemplate()">↓ Template</button>
        <button class="btn btn-primary sm" onclick="document.getElementById('csv-upload').click()">↑ Upload CSV</button>
      </div>
    </div>
    <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="window._stockImportCSV(this)">

    <div style="background:var(--blue-bg);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--blue);line-height:1.5">
      Upload your Unleashed product CSV to add items to the stock catalogue.
      Operators can then scan barcodes to request purchases.
      These items <strong>do not appear</strong> in the build/job screens.
    </div>

    <div class="search-wrap">
      <input type="search" id="stock-search" placeholder="Search by code, description or barcode..."
        oninput="window._stockSearch(this.value)">
    </div>

    <div id="stock-list"><div class="empty-state"><div class="empty-icon">⏳</div>Loading...</div></div>

    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
      <div class="section-title">Purchase request email</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">
        Purchase requests from operators will be sent to this address.
      </div>
      <div style="display:flex;gap:8px">
        <input type="email" id="purchase-email" placeholder="purchasing@caremed-group.com"
          value="${localStorage.getItem('cm_purchase_email') || ''}"
          style="flex:1;font-size:14px;font-family:var(--sans);padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface2);color:var(--text)">
        <button class="btn btn-primary sm" onclick="window._savePurchaseEmail()">Save</button>
      </div>
    </div>
  </div>`

  loadStock('')

  window._stockSearch = (v) => {
    clearTimeout(window._stockST)
    window._stockST = setTimeout(() => loadStock(v), 300)
  }

  window._savePurchaseEmail = () => {
    const email = document.getElementById('purchase-email').value.trim()
    localStorage.setItem('cm_purchase_email', email)
    window._srPurchaseEmail = email
    toast('Purchase email saved')
  }

  // Set global purchase email for StockRequest
  window._srPurchaseEmail = localStorage.getItem('cm_purchase_email') || 'purchasing@caremed-group.com'

  window._stockExportTemplate = () => {
    const headers = [
      '*Product Code','*Product Description','Notes','Barcode','Unit of Measure',
      'Min Stock Alert Level','Max Stock Alert Level','Label Template','SO Label Template',
      'PO Label Template','SO Label Quantity','PO Label Quantity','Supplier Code',
      'Supplier Name','Supplier Product Code','Default Purchase Price',
      'Minimum Order Quantity','Minimum Sale Quantity','Default Sell Price',
      'Minimum Sell Price','Sell Price Tier 1','Sell Price Tier 2','Sell Price Tier 3',
      'Sell Price Tier 4','Sell Price Tier 5','Sell Price Tier 6','Sell Price Tier 7',
      'Sell Price Tier 8','Sell Price Tier 9','Sell Price Tier 10','Pack Size','Weight',
      'Width','Height','Depth','Reminder','Last Cost','Nominal Cost','Comments',
      'Copy Comments for Sales','Copy Comments for Purchases','Never Diminishing',
      'Product Group','Product Sub Group','Product Brand','Sales Account','COGS Account',
      'Purchase Account','Purchase Tax Type','Purchase Tax Rate','Sales Tax Type',
      'Sale Tax Rate','IsAssembledProduct','IsComponent','IsObsoleted','Is Sellable',
      'Is Purchasable','Default Purchasing Unit of Measure','Is Serialized'
    ]
    const csv = headers.join(',') + '\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'Caremed_Products_Template.csv'
    a.click()
    toast('Template downloaded')
  }

  window._stockImportCSV = async (input) => {
    const file = input.files[0]
    if (!file) return
    const listEl = document.getElementById('stock-list')
    listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div>Importing...</div>`

    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length < 2) { toast('CSV appears empty'); return }

      // Parse header row
      const headers = parseCSVLine(lines[0])
      const idx = {
        code:        headers.findIndex(h => h.replace(/\*/g,'').trim() === 'Product Code'),
        desc:        headers.findIndex(h => h.replace(/\*/g,'').trim() === 'Product Description'),
        notes:       headers.indexOf('Notes'),
        barcode:     headers.indexOf('Barcode'),
        uom:         headers.indexOf('Unit of Measure'),
        minStock:    headers.indexOf('Min Stock Alert Level'),
        maxStock:    headers.indexOf('Max Stock Alert Level'),
        supplierCode:headers.indexOf('Supplier Code'),
        supplierName:headers.indexOf('Supplier Name'),
        supplierProd:headers.indexOf('Supplier Product Code'),
        buyPrice:    headers.indexOf('Default Purchase Price'),
        minQty:      headers.indexOf('Minimum Order Quantity'),
        group:       headers.indexOf('Product Group'),
        subGroup:    headers.indexOf('Product Sub Group'),
        brand:       headers.indexOf('Product Brand'),
      }

      const rows = []
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i])
        if (!cols[idx.code]?.trim()) continue
        rows.push({
          product_code:         cols[idx.code]?.trim()        || '',
          description:          cols[idx.desc]?.trim()        || '',
          notes:                cols[idx.notes]?.trim()       || null,
          barcode:              cols[idx.barcode]?.trim()     || null,
          unit_of_measure:      cols[idx.uom]?.trim()        || null,
          min_stock:            parseFloat(cols[idx.minStock]) || null,
          max_stock:            parseFloat(cols[idx.maxStock]) || null,
          supplier_code:        cols[idx.supplierCode]?.trim()|| null,
          supplier_name:        cols[idx.supplierName]?.trim()|| null,
          supplier_product_code:cols[idx.supplierProd]?.trim()|| null,
          default_purchase_price: parseFloat(cols[idx.buyPrice]) || null,
          minimum_order_qty:    parseFloat(cols[idx.minQty])  || null,
          product_group:        cols[idx.group]?.trim()       || null,
          product_sub_group:    cols[idx.subGroup]?.trim()    || null,
          product_brand:        cols[idx.brand]?.trim()       || null,
          active:               true,
          created_by:           State.user?.id,
        })
      }

      if (!rows.length) { toast('No valid rows found in CSV'); return }

      // Upsert in batches of 100
      let imported = 0
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100)
        const { error } = await getClient()
          .from('stock_items')
          .upsert(batch, { onConflict: 'product_code' })
        if (error) throw error
        imported += batch.length
      }

      toast(`✓ Imported ${imported} items`)
      loadStock('')
    } catch(e) {
      toast('Import failed: ' + e.message)
      console.error(e)
    }
    input.value = ''
  }
}

async function loadStock(search) {
  const el = document.getElementById('stock-list')
  if (!el) return
  try {
    let q = getClient().from('stock_items').select('*').eq('active', true).order('product_code').limit(100)
    if (search) q = q.or(`product_code.ilike.%${search}%,description.ilike.%${search}%,barcode.ilike.%${search}%`)
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div>${search ? 'No items match your search' : 'No stock items yet — upload a CSV to get started'}</div>`
      return
    }
    el.innerHTML = data.map(item => `
      <div class="card card-pad" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${item.description}</div>
          <div style="font-size:11px;font-family:var(--mono);color:var(--text3);margin-top:2px">${item.product_code}${item.barcode ? ' · ' + item.barcode : ''}</div>
          ${item.supplier_name ? `<div style="font-size:11px;color:var(--text3);margin-top:1px">${item.supplier_name}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${item.unit_of_measure ? `<div style="font-size:11px;color:var(--text3)">${item.unit_of_measure}</div>` : ''}
          ${item.default_purchase_price ? `<div style="font-size:12px;font-family:var(--mono);color:var(--text2)">£${Number(item.default_purchase_price).toFixed(2)}</div>` : ''}
          <button class="btn btn-danger sm" style="margin-top:4px;font-size:11px;padding:3px 8px" onclick="window._stockDelete('${item.id}')">Remove</button>
        </div>
      </div>`).join('')

    window._stockDelete = async (id) => {
      if (!confirm('Remove this item from the catalogue?')) return
      await getClient().from('stock_items').update({ active: false }).eq('id', id)
      toast('Item removed')
      loadStock(search)
    }
  } catch(e) {
    el.innerHTML = `<div class="empty-state">Error loading stock: ${e.message}</div>`
  }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += line[i]
    }
  }
  result.push(current)
  return result
}
