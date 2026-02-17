export function dashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>short.davidfdzmorilla.dev — Edge URL Shortener</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0f172a; --surface: #1e293b; --border: #334155;
      --text: #e2e8f0; --muted: #94a3b8; --accent: #6366f1;
      --accent2: #8b5cf6; --error: #f87171; --success: #34d399;
    }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .wrap { width: 100%; max-width: 620px; }
    .badge { display: inline-flex; align-items: center; gap: .4rem; background: #1e3a5f; color: #60a5fa; padding: .3rem .8rem; border-radius: 9999px; font-size: .72rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 1.25rem; }
    h1 { font-size: 2.2rem; font-weight: 800; line-height: 1.15; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: .5rem; }
    .sub { color: var(--muted); font-size: .95rem; margin-bottom: 2rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 1.5rem; margin-bottom: 1rem; }
    .field { margin-bottom: 1rem; }
    label { display: block; font-size: .8rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; margin-bottom: .4rem; }
    input { width: 100%; padding: .75rem 1rem; background: var(--bg); border: 1.5px solid var(--border); border-radius: 9px; color: var(--text); font-size: .95rem; transition: border-color .15s; }
    input:focus { outline: none; border-color: var(--accent); }
    input::placeholder { color: #475569; }
    .btn { width: 100%; padding: .78rem; background: linear-gradient(135deg, var(--accent), var(--accent2)); border: none; border-radius: 9px; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; letter-spacing: .02em; transition: opacity .15s, transform .1s; }
    .btn:hover { opacity: .9; } .btn:active { transform: scale(.98); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .result-box { margin-top: 1rem; padding: 1rem 1.1rem; background: var(--bg); border: 1.5px solid var(--border); border-radius: 9px; display: none; }
    .result-box .label { font-size: .75rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; margin-bottom: .4rem; }
    .result-box a { color: #818cf8; text-decoration: none; font-size: .95rem; word-break: break-all; }
    .result-box a:hover { text-decoration: underline; }
    .copy-btn { background: #1e3a5f; color: #60a5fa; border: none; border-radius: 6px; padding: .25rem .6rem; font-size: .75rem; cursor: pointer; margin-left: .5rem; font-weight: 600; }
    .copy-btn:hover { background: #1d4ed8; color: #fff; }
    .error { color: var(--error); font-size: .85rem; margin-top: .6rem; display: none; }
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-top: .75rem; }
    .stat { background: var(--bg); border: 1px solid var(--border); border-radius: 9px; padding: .85rem 1rem; }
    .stat .n { font-size: 1.5rem; font-weight: 800; color: var(--text); }
    .stat .l { font-size: .72rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; margin-top: .2rem; }
    .footer-card { text-align: center; color: #475569; font-size: .82rem; line-height: 1.7; }
    .pill { display: inline-block; background: #0f2744; color: #38bdf8; padding: .15rem .55rem; border-radius: 5px; font-size: .72rem; font-weight: 700; margin: 0 .15rem; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="badge">⚡ sub-ms redirects</div>
  <h1>Edge URL Shortener</h1>
  <p class="sub">High-performance redirects powered by Fastify + Redis cache + PostgreSQL.</p>

  <div class="card">
    <div class="field">
      <label for="urlInput">Long URL</label>
      <input id="urlInput" type="url" placeholder="https://example.com/very/long/url/here" autocomplete="off" />
    </div>
    <div class="field">
      <label for="slugInput">Custom slug <span style="color:#475569;font-weight:400;">(optional)</span></label>
      <input id="slugInput" type="text" placeholder="my-link" maxlength="50" autocomplete="off" />
    </div>
    <button class="btn" id="shortenBtn" onclick="shorten()">⚡ Shorten URL</button>
    <div class="result-box" id="resultBox">
      <div class="label">Your short URL</div>
      <a id="resultLink" href="#" target="_blank"></a>
      <button class="copy-btn" onclick="copyLink()">Copy</button>
    </div>
    <div class="error" id="errorMsg"></div>
  </div>

  <div class="card">
    <div class="field" style="margin-bottom:.5rem;">
      <label for="statsSlug">Lookup stats for a slug</label>
      <input id="statsSlug" type="text" placeholder="github" autocomplete="off" />
    </div>
    <button class="btn" onclick="loadStats()" style="background:var(--surface);border:1.5px solid var(--border);color:var(--text);">📊 Get Stats</button>
    <div id="statsOutput" style="margin-top:.75rem;display:none;">
      <div class="stats-row" id="statsNumbers"></div>
      <div id="statsCountries" style="margin-top:.75rem;font-size:.82rem;color:var(--muted);"></div>
    </div>
    <div class="error" id="statsError"></div>
  </div>

  <div class="card footer-card">
    <span class="pill">Fastify</span> <span class="pill">Redis</span> <span class="pill">PostgreSQL</span> <span class="pill">TypeScript</span>
    <div style="margin-top:.5rem;">🌐 short.davidfdzmorilla.dev &nbsp;·&nbsp; Level 7 — Edge Performance Patterns</div>
  </div>
</div>

<script>
async function shorten() {
  const url = document.getElementById('urlInput').value.trim()
  const slug = document.getElementById('slugInput').value.trim()
  const resultBox = document.getElementById('resultBox')
  const resultLink = document.getElementById('resultLink')
  const errorMsg = document.getElementById('errorMsg')
  const btn = document.getElementById('shortenBtn')

  errorMsg.style.display = 'none'
  resultBox.style.display = 'none'
  if (!url) { showError(errorMsg, 'Please enter a URL'); return }

  btn.disabled = true; btn.textContent = '...'
  try {
    const body = { url }
    if (slug) body.slug = slug
    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) { showError(errorMsg, data.error || 'Failed to shorten'); return }
    resultLink.href = data.shortUrl
    resultLink.textContent = data.shortUrl
    resultBox.style.display = 'block'
  } catch (e) {
    showError(errorMsg, 'Network error')
  } finally {
    btn.disabled = false; btn.textContent = '⚡ Shorten URL'
  }
}

async function loadStats() {
  const slug = document.getElementById('statsSlug').value.trim()
  const output = document.getElementById('statsOutput')
  const errEl = document.getElementById('statsError')
  errEl.style.display = 'none'; output.style.display = 'none'
  if (!slug) { showError(errEl, 'Enter a slug'); return }
  try {
    const res = await fetch('/api/stats/' + encodeURIComponent(slug))
    const data = await res.json()
    if (!res.ok) { showError(errEl, data.error || 'Not found'); return }
    document.getElementById('statsNumbers').innerHTML =
      '<div class="stat"><div class="n">' + data.url.click_count + '</div><div class="l">Total clicks</div></div>' +
      '<div class="stat"><div class="n" style="font-size:1rem;word-break:break-all;">' + new Date(data.url.created_at).toLocaleDateString() + '</div><div class="l">Created</div></div>'
    if (data.topCountries && data.topCountries.length) {
      document.getElementById('statsCountries').innerHTML = '<strong style="color:var(--text);">Top countries:</strong> ' +
        data.topCountries.map(c => c.country + ' (' + c.count + ')').join(' · ')
    }
    output.style.display = 'block'
  } catch { showError(errEl, 'Network error') }
}

function copyLink() {
  const url = document.getElementById('resultLink').textContent
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.copy-btn')
    btn.textContent = 'Copied!'
    setTimeout(() => btn.textContent = 'Copy', 1500)
  })
}

function showError(el, msg) { el.textContent = msg; el.style.display = 'block' }
</script>
</body>
</html>`
}
