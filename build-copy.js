// Copies static assets into dist/ for Cloudflare Pages deployment
const fs   = require('fs')
const path = require('path')

function mkdir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }
function copy(src, dst) { mkdir(path.dirname(dst)); fs.copyFileSync(src, dst) }
function copyDir(src, dst) {
  mkdir(dst)
  fs.readdirSync(src).forEach(f => {
    const s = path.join(src, f), d = path.join(dst, f)
    fs.statSync(s).isDirectory() ? copyDir(s, d) : copy(s, d)
  })
}

mkdir('dist')

// Copy HTML — update script reference
let html = fs.readFileSync('index.html', 'utf8')
html = html.replace('src="app.bundle.js"', 'src="app.bundle.js"') // already correct
fs.writeFileSync('dist/index.html', html)

// Copy static assets
copy('manifest.json',       'dist/manifest.json')
copy('sw.js',               'dist/sw.js')
copyDir('css',              'dist/css')
copyDir('icons',            'dist/icons')
copyDir('js',               'dist/js')

// SPA routing handled by wrangler.jsonc not_found_handling

console.log('✓ dist/ ready for deployment')
