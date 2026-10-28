/* TMS v4 shared UI helpers */
// ══════════════════════════════════════
// v4 SHARED HELPERS (projector-readable UI)
// ══════════════════════════════════════
function v4Esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function v4Date(d){return d?new Date(d).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}):'—';}
function v4Init(n){return (String(n||'?').trim()[0]||'?').toUpperCase();}
function v4Head(title,sub,right){return `<div class="v4-head"><div><div class="v4-title">${title}</div><div class="v4-sub">${sub}</div></div><div class="v4-head-r">${right||''}</div></div>`;}
function v4Stats(list){return `<div class="v4-stats">${list.map(s=>`<div class="v4-stat" style="--tone:${s.tone}"><div class="v4-stat-ic">${s.icon}</div><div><div class="v4-stat-val">${s.val}</div><div class="v4-stat-lbl">${s.label}</div></div></div>`).join('')}</div>`;}
function v4Prog(label,done,total){const p=total?Math.round(done/total*100):0;return `<div class="v4-prog"><div class="v4-prog-t">${label}</div><div class="v4-prog-bar"><div class="v4-prog-fill" style="width:${p}%"></div></div><div class="v4-prog-n">${p}%</div></div>`;}
function v4Tabs(tabs,active,fn){return `<div class="v4-tabs">${tabs.map(t=>`<button class="v4-tab ${t.key===active?'on':''}" onclick="${fn}('${t.key}')">${t.label} <b>${t.count}</b></button>`).join('')}</div>`;}
function v4Empty(icon,title,text){return `<div class="v4-empty"><div class="e-ic">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;}

const V4_MAINT_TONE={pending:'var(--v4-amber)',in_progress:'var(--v4-blue)',pending_confirmation:'var(--v4-gold)',resolved:'var(--v4-green)',cancelled:'var(--muted)'};
const V4_MAINT_LABEL={pending:'Needs approval',in_progress:'In progress',pending_confirmation:'Awaiting tenant',resolved:'Resolved',cancelled:'Cancelled'};
const V4_MAINT_ICON={plumbing:'🚰',electrical:'⚡',gas:'🔥',painting:'🎨',carpentry:'🪚',cleaning:'🧹',ac:'❄️',heating:'♨️',pest:'🐜',roof:'🏚️'};
const V4_COMP_TONE={open:'var(--v4-amber)',pending:'var(--v4-amber)',in_progress:'var(--v4-blue)',resolved:'var(--v4-green)',closed:'var(--muted)'};
const V4_COMP_LABEL={open:'Needs review',pending:'Needs review',in_progress:'In progress',resolved:'Resolved',closed:'Closed'};
const V4_COMP_ICON={noise:'🔊',water:'💧',electricity:'⚡',security:'🛡️',cleanliness:'🧹',parking:'🅿️',neighbor:'👥',neighbour:'👥',rent:'💰',maintenance:'🔧',other:'📝'};

// Auto summary strip above a data table (reads the rendered rows)
function v4Tone(t){t=String(t).toLowerCase();
  if(/(block|reject|urgent|overdue|fail|delet|cancel|unverif)/.test(t)) return 'var(--v4-red)';
  if(/(resolv|paid|active|approv|available|accept|complet|verified)/.test(t)) return 'var(--v4-green)';
  if(/(progress|rented|negotiat|review|submitted)/.test(t)) return 'var(--v4-blue)';
  return 'var(--v4-amber)';}
function v4AutoStats(tbodyId,label){
  const tb=document.getElementById(tbodyId); if(!tb)return;
  const page=tb.closest('.page'), card=tb.closest('.card'); if(!page||!card)return;
  const heads=[...tb.closest('table').querySelectorAll('th')].map(h=>h.textContent.trim().toLowerCase());
  let si=heads.indexOf('status'); if(si<0) si=heads.length-1;
  const rows=[...tb.querySelectorAll('tr')].filter(r=>!r.querySelector('td.loading,td[colspan]'));
  let strip=page.querySelector(':scope > .v4-stats[data-auto="'+tbodyId+'"]');
  if(!rows.length){ if(strip) strip.remove(); return; }
  const counts={};
  rows.forEach(r=>{const cell=r.children[si]; const sel=cell&&cell.querySelector('select'); const t=((sel?(sel.selectedOptions[0]||{}).text:(cell?.textContent))||'').trim().replace(/\s+/g,' ').toLowerCase()||'—'; counts[t]=(counts[t]||0)+1;});
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const icons=['📊','✅','⏳','📌'];
  const items=[{icon:icons[0],val:rows.length,label:label||'Total records',tone:'var(--v4-blue)'}].concat(top.map(([k,n],i)=>({icon:icons[i+1],val:n,label:k.replace(/_/g,' '),tone:v4Tone(k)})));
  const html=v4Stats(items).replace('class="v4-stats"','class="v4-stats v4" data-auto="'+tbodyId+'"');
  if(strip) strip.outerHTML=html; else card.insertAdjacentHTML('beforebegin',html);
}
function v4InitAutoStats(map){
  Object.keys(map).forEach(id=>{const tb=document.getElementById(id); if(!tb)return;
    let t=null; new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>v4AutoStats(id,map[id]),30);}).observe(tb,{childList:true});});
}

// ── Non-blocking notifications (replaces the browser's blocking alert box) ──
(function () {
  if (window.tmsToast) return;
  window.tmsToast = function (msg, type) {
    msg = String(msg == null ? '' : msg).trim(); if (!msg || !document.body) return;
    if (!type) type = /^(❌|✖|⛔)/.test(msg) ? 'error' : /^⚠/.test(msg) ? 'warn' : /^(✅|✔)/.test(msg) ? 'ok' : 'info';
    let box = document.getElementById('tms-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'tms-toasts'; document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'tms-toast tms-toast-' + type; el.textContent = msg; el.title = 'Click to dismiss';
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.onclick = kill; box.appendChild(el); setTimeout(kill, type === 'error' || type === 'warn' ? 7000 : 4200);
  };
  window.alert = function (m) { window.tmsToast(m); };
})();

// Turns "400 This property is not available. (http://…/api/…)" into plain readable text
function tmsCleanErr(e) {
  return String((e && e.message) || e || 'Something went wrong').replace(/^\d{3}\s+/, '').replace(/\s*\(https?:[^)]*\)\s*$/, '');
}
// Removes any dialog opened with data-tms-modal (optionally only one kind)
function tmsCloseModals(kind) {
  document.querySelectorAll(kind ? '[data-tms-modal="' + kind + '"]' : '[data-tms-modal]').forEach(m => m.remove());
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') tmsCloseModals(); });
