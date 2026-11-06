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

// ════════════════════════════════════════════════════════════
//  HOUSE VIEW  — up to 4 photos per property
//  The landlord chooses: request a 360/3D model, show a house view, or both.
// ════════════════════════════════════════════════════════════
const TMS_HV_MAX = 4;

// Downscale a picked image to a web-friendly JPEG data URL (keeps uploads small and fast)
function tmsImageToDataUrl(file, max, quality) {
  max = max || 1280; quality = quality || 0.8;
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
    img.src = url;
  });
}

// 4-slot photo editor. Returns { getImages(), setImages(list), clear() }
function tmsHouseViewEditor(container, initial) {
  let imgs = (initial || []).slice(0, TMS_HV_MAX);
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.style.display = 'none';
  let replaceAt = -1;
  const draw = () => {
    container.classList.add('hv-editor');
    container.innerHTML = '<div class="hv-head"><b>House View photos</b><span>' + imgs.length + ' / ' + TMS_HV_MAX + '</span></div>'
      + '<div class="hv-hint">Add up to ' + TMS_HV_MAX + ' photos so tenants can see the house. You can use this instead of, or together with, a 360/3D model.</div>'
      + '<div class="hv-slots"></div>';
    const wrap = container.querySelector('.hv-slots');
    for (let i = 0; i < TMS_HV_MAX; i++) {
      const s = document.createElement('div'); s.className = 'hv-slot' + (imgs[i] ? ' filled' : '');
      if (imgs[i]) {
        s.innerHTML = '<img alt="Photo ' + (i + 1) + '"><span class="hv-n">' + (i + 1) + '</span><button type="button" class="hv-rm" title="Remove">✕</button><button type="button" class="hv-rp">Replace</button>';
        s.querySelector('img').src = imgs[i];
        s.querySelector('.hv-rm').onclick = (e) => { e.stopPropagation(); imgs.splice(i, 1); draw(); };
        s.querySelector('.hv-rp').onclick = (e) => { e.stopPropagation(); replaceAt = i; input.click(); };
      } else {
        s.innerHTML = '<div class="hv-add"><span>＋</span>Add photo</div>';
        s.onclick = () => { replaceAt = -1; input.click(); };
      }
      wrap.appendChild(s);
    }
    container.appendChild(input);
  };
  input.onchange = async () => {
    const files = [...input.files]; input.value = '';
    for (const f of files) {
      try {
        const d = await tmsImageToDataUrl(f);
        if (replaceAt >= 0) { imgs[replaceAt] = d; replaceAt = -1; }
        else if (imgs.length < TMS_HV_MAX) imgs.push(d);
        else { alert('⚠️ You can add at most ' + TMS_HV_MAX + ' photos.'); break; }
      } catch (e) { alert('❌ ' + e.message); }
    }
    draw();
  };
  draw();
  return { getImages: () => imgs.slice(), setImages: (l) => { imgs = (l || []).slice(0, TMS_HV_MAX); draw(); }, clear: () => { imgs = []; draw(); } };
}

// Dialog used by the landlord: load existing photos, edit, save.
function tmsOpenHouseViewEditor(opts) {
  tmsCloseModals('house-view-edit');
  const m = document.createElement('div'); m.setAttribute('data-tms-modal', 'house-view-edit'); m.className = 'hv-overlay';
  m.innerHTML = '<div class="hv-dialog"><div class="hv-dt">📷 House View</div><div class="hv-ds"></div><div class="hv-body"><div class="loading" style="min-height:160px">Loading photos…</div></div>'
    + '<div class="hv-actions"><button type="button" class="btn btn-ghost hv-cancel">Cancel</button><button type="button" class="btn btn-teal hv-save" disabled>💾 Save photos</button></div></div>';
  m.querySelector('.hv-ds').textContent = opts.title || '';
  m.addEventListener('mousedown', e => { if (e.target === m) m.remove(); });
  m.querySelector('.hv-cancel').onclick = () => m.remove();
  document.body.appendChild(m);
  let ed = null; const save = m.querySelector('.hv-save');
  Promise.resolve().then(() => opts.load()).then(list => {
    const body = m.querySelector('.hv-body'); body.innerHTML = ''; ed = tmsHouseViewEditor(body, list || []); save.disabled = false;
  }).catch(() => { m.querySelector('.hv-body').innerHTML = '<div class="loading">⚠️ Could not load the photos.</div>'; });
  save.onclick = async () => {
    save.disabled = true; save.textContent = 'Saving…';
    try {
      const imgs = ed.getImages(), r = await opts.save(imgs);
      if (r && r.success === false) throw new Error(r.message || 'Could not save');
      m.remove(); alert('✅ ' + (imgs.length ? 'House view saved (' + imgs.length + ' photo' + (imgs.length > 1 ? 's' : '') + ').' : 'House view removed.'));
      if (opts.onSaved) opts.onSaved(imgs.length);
    } catch (e) { alert('❌ ' + tmsCleanErr(e)); save.disabled = false; save.textContent = '💾 Save photos'; }
  };
}

// Photo gallery viewer (tenant, landlord, admin)
function tmsHouseView(title, images, start) {
  images = (images || []).filter(Boolean);
  if (!images.length) { alert('⚠️ No house view photos have been added for this property yet.'); return; }
  tmsCloseModals('house-view');
  let i = Math.min(Math.max(start || 0, 0), images.length - 1);
  const m = document.createElement('div'); m.setAttribute('data-tms-modal', 'house-view'); m.className = 'hv-viewer';
  m.innerHTML = '<div class="hv-vt"><span class="hv-vtitle"></span><span class="hv-count"></span><button type="button" class="hv-x" title="Close (Esc)">✕</button></div>'
    + '<div class="hv-stage"><button type="button" class="hv-nav prev" title="Previous">‹</button><img class="hv-main" alt="House view"><button type="button" class="hv-nav next" title="Next">›</button></div>'
    + '<div class="hv-thumbs"></div>';
  m.querySelector('.hv-vtitle').textContent = '📷 ' + (title || 'House View');
  const main = m.querySelector('.hv-main'), cnt = m.querySelector('.hv-count'), th = m.querySelector('.hv-thumbs');
  images.forEach((src, k) => { const t = document.createElement('img'); t.src = src; t.alt = 'Photo ' + (k + 1); t.onclick = () => go(k); th.appendChild(t); });
  const go = (k) => { i = (k + images.length) % images.length; main.src = images[i]; cnt.textContent = (i + 1) + ' / ' + images.length;
    [...th.children].forEach((t, j) => t.classList.toggle('on', j === i)); };
  m.querySelector('.prev').onclick = () => go(i - 1); m.querySelector('.next').onclick = () => go(i + 1);
  m.querySelector('.hv-x').onclick = () => { m.remove(); document.removeEventListener('keydown', key); };
  if (images.length < 2) m.querySelectorAll('.hv-nav').forEach(b => b.style.display = 'none');
  const key = (e) => { if (!document.body.contains(m)) return document.removeEventListener('keydown', key); if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'ArrowRight') go(i + 1); };
  document.addEventListener('keydown', key);
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.classList.contains('hv-stage')) m.querySelector('.hv-x').click(); });
  let sx = null; main.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); sx = null; });
  document.body.appendChild(m); go(i);
}
