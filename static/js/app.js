let runs = 0;
let open = {};
let reportText = '';

const STEPS = ['search','reader','writer','critic'];

// ── Toggle card ───────────────────────────────────────────────
function toggleCard(id) {
  const isOpening = !open[id];
  STEPS.forEach(step => {
    open[step] = false;
    document.getElementById('body-'+step).classList.remove('open');
    document.getElementById('chev-'+step).classList.remove('open');
  });
  if (isOpening) {
    open[id] = true;
    document.getElementById('body-'+id).classList.add('open');
    document.getElementById('chev-'+id).classList.add('open');
  }
}
function openCard(id) {
  STEPS.forEach(step => {
    open[step] = false;
    document.getElementById('body-'+step).classList.remove('open');
    document.getElementById('chev-'+step).classList.remove('open');
  });
  open[id] = true;
  document.getElementById('body-'+id).classList.add('open');
  document.getElementById('chev-'+id).classList.add('open');
}

// ── Set step state ────────────────────────────────────────────
function setState(id, phase) {
  // phase: '' | 'active' | 'done' | 'error'
  const card   = document.getElementById('card-'+id);
  const badge  = document.getElementById('badge-'+id);
  const pill   = document.getElementById('pill-'+id);
  const ind    = document.getElementById('ind-'+id);
  card.className  = 'output-card' + (phase ? ' is-'+phase : '');
  badge.className = 'card-badge '+(phase||'');
  pill.className  = 'step-pill '+(phase||'');
  ind.className   = 'pill-indicator '+(phase||'');
}
function setSub(id, txt)    { document.getElementById('sub-'+id).innerHTML = txt; }
function setPillSub(id, txt){ document.getElementById('pillsub-'+id).textContent = txt; }
function setProgress(pct, label) {
  document.getElementById('progressFill').style.width = pct+'%';
  document.getElementById('progressLabel').textContent = label;
  document.getElementById('progressPct').textContent = pct+'%';
}

// ── Escape html ───────────────────────────────────────────────
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ── Render functions ──────────────────────────────────────────
function renderSearch(txt) {
  document.getElementById('body-search').innerHTML = `<div class="out-box">${esc(txt)}</div>`;
  openCard('search');
}
function renderReader(txt) {
  document.getElementById('body-reader').innerHTML = `<div class="out-box">${esc(txt)}</div>`;
  openCard('reader');
}
function renderWriter(txt) {
  reportText = txt;
  const clean = txt.replace(/#{1,6}\s*/g,'').replace(/\*\*/g,'');
  document.getElementById('body-writer').innerHTML = `
    <div class="out-box">${esc(clean)}</div>
    <button class="copy-btn" onclick="doCopy()">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy report
    </button>`;
  openCard('writer');
}
function doCopy() { navigator.clipboard && navigator.clipboard.writeText(reportText); }

function renderCritic(txt) {
  const scoreM   = txt.match(/(\d+)\s*\/\s*10/);
  const score    = scoreM ? parseInt(scoreM[1]) : null;
  const circ     = 2*Math.PI*22;
  const pct      = score != null ? (score/10)*100 : 0;
  const offset   = circ - (pct/100)*circ;

  const verdictM = txt.match(/one line verdict[:\s]*(.*)/i);
  const verdict  = verdictM ? verdictM[1].trim() : '';

  const sM = txt.match(/strengths?[:\s]*([\s\S]*?)(?=areas to improve|one line|$)/i);
  const iM = txt.match(/areas to improve[:\s]*([\s\S]*?)(?=one line|$)/i);
  const lines = s => s ? s.trim().split('\n').map(l=>l.replace(/^[-•*\d.]\s*/,'')).filter(l=>l.length>8).slice(0,3) : [];

  let html = '';

  if (score != null) {
    html += `<div class="critic-top">
      <div class="score-wrap">
        <svg viewBox="0 0 48 48">
          <circle class="s-track" cx="24" cy="24" r="22"/>
          <circle class="s-fill" cx="24" cy="24" r="22"
            stroke-dasharray="${circ}" stroke-dashoffset="${circ}" id="sring"/>
        </svg>
        <div class="score-val">${score}</div>
      </div>
      <div class="verdict-area">
        <div class="sc-label">Score / 10</div>
        <div class="verdict">${esc(verdict)}</div>
      </div>
    </div>`;
  }

  const strengths = lines(sM?.[1]);
  const improves  = lines(iM?.[1]);

  if (strengths.length) {
    html += `<div class="tags">${strengths.map(s=>`<span class="tag tag-s">✓ ${esc(s.slice(0,52))}${s.length>52?'…':''}</span>`).join('')}</div>`;
  }
  if (improves.length) {
    html += `<div class="tags">${improves.map(s=>`<span class="tag tag-i">↑ ${esc(s.slice(0,52))}${s.length>52?'…':''}</span>`).join('')}</div>`;
  }

  html += `<hr class="divider"><div class="out-box">${esc(txt)}</div>`;
  document.getElementById('body-critic').innerHTML = html;
  openCard('critic');
  setTimeout(() => {
    const r = document.getElementById('sring');
    if (r) r.style.strokeDashoffset = offset;
  }, 100);
}

// ── Reset UI ──────────────────────────────────────────────────
function reset() {
  STEPS.forEach(id => {
    setState(id, '');
    setSub(id, 'Waiting…');
    setPillSub(id, 'Idle');
    const body = document.getElementById('body-'+id);
    body.innerHTML = `<div class="card-empty">Waiting…</div>`;
    body.classList.remove('open');
    open[id] = false;
    document.getElementById('chev-'+id).classList.remove('open');
  });
  setProgress(0, 'Starting…');
}

// ── Main runner ───────────────────────────────────────────────
async function startPipeline() {
  const topic = document.getElementById('topicInput').value.trim();
  if (!topic) return;

  const btn = document.getElementById('runBtn');
  btn.disabled = true;
  document.getElementById('btnLabel').textContent = 'Running…';
  runs++;
  document.getElementById('runBadge').textContent = runs + ' run' + (runs>1?'s':'');
  reset();

  const prog = {
    search: { s:[5,'Step 1/4 — Searching the web…'],    d:[25,'Search complete'] },
    reader: { s:[28,'Step 2/4 — Reading sources…'],      d:[50,'Reading complete'] },
    writer: { s:[53,'Step 3/4 — Writing report…'],       d:[75,'Report drafted'] },
    critic: { s:[78,'Step 4/4 — Evaluating report…'],    d:[100,'Pipeline complete ✓'] },
  };

  try {
    const resp = await fetch('/run', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({topic})
    });

    const reader  = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += decoder.decode(value, {stream:true});
      const lines = buf.split('\n');
      buf = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let ev;
        try { ev = JSON.parse(line.slice(6)); } catch { continue; }
        const {step, status, content, error} = ev;
        if (step==='pipeline' && status==='done') continue;

        const p = prog[step];

        if (status === 'start') {
          setState(step, 'active');
          setSub(step, `Running<span class="spin"></span>`);
          setPillSub(step, 'Running…');
          setProgress(...p.s);
        }
        if (status === 'done') {
          setState(step, 'done');
          setSub(step, 'Done ✓');
          setPillSub(step, 'Done ✓');
          setProgress(...p.d);
          if (step==='search') renderSearch(content);
          if (step==='reader') renderReader(content);
          if (step==='writer') renderWriter(content);
          if (step==='critic') renderCritic(content);
        }
        if (status === 'error') {
          setState(step, 'error');
          setSub(step, 'Error');
          setPillSub(step, 'Error');
          document.getElementById('body-'+step).innerHTML =
            `<div class="out-box" style="color:#f87171">Error: ${esc(error)}</div>`;
          openCard(step);
          break;
        }
      }
    }
  } catch(err) {
    console.error(err);
    setProgress(0, 'Connection error — is the server running?');
  }

  btn.disabled = false;
  document.getElementById('btnLabel').textContent = 'Run Pipeline';
}

document.getElementById('topicInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') startPipeline();
});