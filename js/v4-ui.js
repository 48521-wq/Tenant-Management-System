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
//  HOUSE VIEW  — 4 photos for every room (Room 1..N from the bedroom count) + Dining
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

// Sections a property needs photos for - built automatically from the property details:
//   Room 1..N (bedrooms, at least 1), Guest Room, Dining, Kitchen, Lounge, Bathroom.
// spec = { beds, baths, dining, kitchens, lounges, guestRooms }. A plain number is treated as the bedroom count (older code).
function tmsHouseViewSections(spec) {
  if (typeof spec !== 'object' || spec === null) spec = { beds: spec };
  const num = (v, d, max) => { const n = parseInt(v, 10); return Math.min(Math.max(isNaN(n) ? d : n, 0), max); };
  const out = [], beds = Math.max(num(spec.beds, 1, 20), 1);
  for (let i = 1; i <= beds; i++) out.push('Room ' + i);
  const add = (name, n) => { for (let i = 1; i <= n; i++) out.push(n > 1 ? name + ' ' + i : name); };
  add('Guest Room', num(spec.guestRooms, 0, 5));
  add('Dining', num(spec.dining, 1, 5));
  add('Kitchen', num(spec.kitchens, 1, 5));
  add('Lounge', num(spec.lounges, 0, 5));
  add('Bathroom', num(spec.baths, 0, 10));
  return out;
}
function tmsHouseViewIcon(label) { return /^Guest/.test(label) ? '🛌 ' : /^Dining/.test(label) ? '🍽️ ' : /^Kitchen/.test(label) ? '🍳 ' : /^Lounge/.test(label) ? '🛋️ ' : /^Bathroom/.test(label) ? '🚿 ' : '🛏️ '; }
function tmsHouseViewSummary(spec) {
  const c = {}; tmsHouseViewSections(spec).forEach(l => { const k = l.replace(/ \d+$/, ''); c[k] = (c[k] || 0) + 1; });
  const names = { Room: 'bedroom', 'Guest Room': 'guest room', Dining: 'dining', Kitchen: 'kitchen', Lounge: 'lounge', Bathroom: 'bathroom' };
  return Object.keys(c).map(k => c[k] + ' ' + names[k] + (c[k] > 1 ? 's' : '')).join(', ');
}
// Old properties stored one flat list - spread it over the sections, 4 per section
function tmsHouseViewFromFlat(list, spec) {
  const secs = tmsHouseViewSections(spec), rooms = [];
  (list || []).forEach((src, i) => {
    const k = Math.min(Math.floor(i / TMS_HV_MAX), secs.length - 1);
    (rooms[k] = rooms[k] || { label: secs[k], images: [] }).images.push(src);
  });
  return rooms.filter(Boolean);
}

// Room-wise photo editor: one block per room/dining, 4 slots each.
// Returns { getRooms(), getImages(), setRooms(list), setSpec(spec), clear() }
// The sections come from `spec` (the property details) - there is no room-count control inside the editor.
//   getRooms() -> [{ label:'Room 1', images:[...] }, ...] (only sections that have photos)
function tmsHouseViewEditor(container, initial, spec) {
  let curSpec = spec || { beds: 1 };
  const store = {};                       // label -> [dataUrl,...]  (kept even if beds is lowered, so nothing is lost by accident)
  const setStore = (rooms) => { Object.keys(store).forEach(k => delete store[k]); (rooms || []).forEach(r => { if (r && r.label) store[r.label] = (r.images || []).slice(0, TMS_HV_MAX); }); };
  setStore(initial);
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true; input.style.display = 'none';
  let target = null;                      // { label, replaceAt }
  const total = () => tmsHouseViewSections(curSpec).reduce((a, l) => a + (store[l] || []).length, 0);
  const draw = () => {
    const secs = tmsHouseViewSections(curSpec);
    container.classList.add('hv-editor');
    container.innerHTML = '<div class="hv-head"><b>House View photos</b><span>' + total() + ' / ' + secs.length * TMS_HV_MAX + '</span></div>'
      + '<div class="hv-rooms"></div>';
    const rooms = container.querySelector('.hv-rooms');
    secs.forEach(label => {
      const imgs = store[label] = store[label] || [];
      const box = document.createElement('div'); box.className = 'hv-room';
      box.innerHTML = '<div class="hv-room-h"><b></b><span>' + imgs.length + ' / ' + TMS_HV_MAX + '</span></div><div class="hv-slots"></div>';
      box.querySelector('b').textContent = tmsHouseViewIcon(label) + label;
      const wrap = box.querySelector('.hv-slots');
      for (let i = 0; i < TMS_HV_MAX; i++) {
        const s = document.createElement('div'); s.className = 'hv-slot' + (imgs[i] ? ' filled' : '');
        if (imgs[i]) {
          s.innerHTML = '<img alt=""><span class="hv-n">' + (i + 1) + '</span><button type="button" class="hv-rm" title="Remove">✕</button><button type="button" class="hv-rp">Replace</button>';
          s.querySelector('img').src = imgs[i]; s.querySelector('img').alt = label + ' photo ' + (i + 1);
          s.querySelector('.hv-rm').onclick = (e) => { e.stopPropagation(); imgs.splice(i, 1); draw(); };
          s.querySelector('.hv-rp').onclick = (e) => { e.stopPropagation(); target = { label, replaceAt: i }; input.click(); };
        } else {
          s.innerHTML = '<div class="hv-add"><span>＋</span>Add photo</div>';
          s.onclick = () => { target = { label, replaceAt: -1 }; input.click(); };
        }
        wrap.appendChild(s);
      }
      rooms.appendChild(box);
    });
    container.appendChild(input);
  };
  input.onchange = async () => {
    const files = [...input.files]; input.value = ''; if (!target) return;
    const { label, replaceAt } = target, imgs = store[label] = store[label] || [];
    let at = replaceAt;
    for (const f of files) {
      try {
        const d = await tmsImageToDataUrl(f, 960, 0.72);   // smaller than before: many photos per property
        if (at >= 0) { imgs[at] = d; at = -1; }
        else if (imgs.length < TMS_HV_MAX) imgs.push(d);
        else { alert('⚠️ ' + label + ': you can add at most ' + TMS_HV_MAX + ' photos.'); break; }
      } catch (e) { alert('❌ ' + e.message); }
    }
    draw();
  };
  draw();
  const getRooms = () => tmsHouseViewSections(curSpec).map(l => ({ label: l, images: (store[l] || []).slice(0, TMS_HV_MAX) })).filter(r => r.images.length);
  return {
    getRooms,
    getImages: () => getRooms().reduce((a, r) => a.concat(r.images), []),
    setRooms: (l) => { setStore(l); draw(); },
    setSpec: (sp) => { curSpec = sp || { beds: 1 }; draw(); },
    clear: () => { setStore([]); draw(); }
  };
}

// Dialog used by the landlord: load existing photos, edit, save.
// opts: { title, spec, load() -> {rooms, images}, save(rooms), onSaved(count) }
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
  Promise.resolve().then(() => opts.load()).then(r => {
    r = r || {};
    const spec = r.spec || opts.spec;
    const rooms = (r.rooms && r.rooms.length) ? r.rooms : tmsHouseViewFromFlat(r.images, spec);
    const body = m.querySelector('.hv-body'); body.innerHTML = ''; ed = tmsHouseViewEditor(body, rooms, spec); save.disabled = false;
  }).catch(() => { m.querySelector('.hv-body').innerHTML = '<div class="loading">⚠️ Could not load the photos.</div>'; });
  save.onclick = async () => {
    save.disabled = true; save.textContent = 'Saving…';
    try {
      const rooms = ed.getRooms(), n = ed.getImages().length, res = await opts.save(rooms);
      if (res && res.success === false) throw new Error(res.message || 'Could not save');
      m.remove(); alert('✅ ' + (n ? 'House view saved (' + n + ' photo' + (n > 1 ? 's' : '') + ' in ' + rooms.length + ' room' + (rooms.length > 1 ? 's' : '') + ').' : 'House view removed.'));
      if (opts.onSaved) opts.onSaved(n);
    } catch (e) { alert('❌ ' + tmsCleanErr(e)); save.disabled = false; save.textContent = '💾 Save photos'; }
  };
}

// Photo gallery viewer (tenant, landlord, admin).
// `images` can be a flat list of URLs, or room-wise: [{ label:'Room 1', images:[...] }, ...]
function tmsHouseView(title, images, start) {
  const list = [];
  (images || []).forEach(x => {
    if (!x) return;
    if (typeof x === 'string') list.push({ src: x, label: '' });
    else (x.images || []).forEach(src => src && list.push({ src, label: x.label || '' }));
  });
  if (!list.length) { alert('⚠️ No house view photos have been added for this property yet.'); return; }
  tmsCloseModals('house-view');
  let i = Math.min(Math.max(start || 0, 0), list.length - 1);
  const m = document.createElement('div'); m.setAttribute('data-tms-modal', 'house-view'); m.className = 'hv-viewer';
  m.innerHTML = '<div class="hv-vt"><span class="hv-vtitle"></span><span class="hv-count"></span><button type="button" class="hv-x" title="Close (Esc)">✕</button></div>'
    + '<div class="hv-tabs"></div>'
    + '<div class="hv-stage"><button type="button" class="hv-nav prev" title="Previous">‹</button><img class="hv-main" alt="House view"><button type="button" class="hv-nav next" title="Next">›</button></div>'
    + '<div class="hv-caption"></div><div class="hv-thumbs"></div>';
  m.querySelector('.hv-vtitle').textContent = '📷 ' + (title || 'House View');
  const main = m.querySelector('.hv-main'), cnt = m.querySelector('.hv-count'), th = m.querySelector('.hv-thumbs'), tabs = m.querySelector('.hv-tabs'), cap = m.querySelector('.hv-caption');
  // room tabs (only when photos are grouped by room)
  const labels = [...new Set(list.map(x => x.label).filter(Boolean))];
  labels.forEach(l => { const b = document.createElement('button'); b.type = 'button'; b.className = 'hv-tab'; b.dataset.l = l;
    b.textContent = l + ' (' + list.filter(x => x.label === l).length + ')'; b.onclick = () => go(list.findIndex(x => x.label === l)); tabs.appendChild(b); });
  if (!labels.length) tabs.style.display = 'none';
  list.forEach((x, k) => { const t = document.createElement('img'); t.src = x.src; t.alt = (x.label || 'Photo') + ' ' + (k + 1); t.onclick = () => go(k); th.appendChild(t); });
  const go = (k) => { i = (k + list.length) % list.length; main.src = list[i].src; cnt.textContent = (i + 1) + ' / ' + list.length;
    const cur = list[i], inRoom = list.filter(x => x.label === cur.label), pos = inRoom.indexOf(cur) + 1;
    cap.textContent = cur.label ? cur.label + ' · photo ' + pos + ' of ' + inRoom.length : '';
    [...th.children].forEach((t, j) => t.classList.toggle('on', j === i));
    [...tabs.children].forEach(b => b.classList.toggle('on', b.dataset.l === cur.label)); };
  m.querySelector('.prev').onclick = () => go(i - 1); m.querySelector('.next').onclick = () => go(i + 1);
  m.querySelector('.hv-x').onclick = () => { m.remove(); document.removeEventListener('keydown', key); };
  if (list.length < 2) m.querySelectorAll('.hv-nav').forEach(b => b.style.display = 'none');
  const key = (e) => { if (!document.body.contains(m)) return document.removeEventListener('keydown', key); if (e.key === 'ArrowLeft') go(i - 1); else if (e.key === 'ArrowRight') go(i + 1); };
  document.addEventListener('keydown', key);
  m.addEventListener('mousedown', e => { if (e.target === m || e.target.classList.contains('hv-stage')) m.querySelector('.hv-x').click(); });
  let sx = null; main.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); sx = null; });
  document.body.appendChild(m); go(i);
}

// ════════════════════════════════════════════════════════════
//  HOUSE ART — a distinct, good-looking exterior illustration for every property
//  that has no uploaded cover photo. Deterministic: the same property always gets
//  the same picture, different properties get different ones.
//  (Landlords can always replace it with a real photo via "Change Cover".)
// ════════════════════════════════════════════════════════════
function tmsHouseArt(seed, type) {
  let h = 2166136261; const str = String(seed || 'house') + '|' + (type || '');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  let st = h >>> 0;
  const R = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (a) => a[Math.floor(R() * a.length)], between = (a, b) => a + R() * (b - a), chance = (p) => R() < p;
  const kind = /villa/i.test(type) ? 'villa' : /flat|apartment/i.test(type) ? 'flat' : /room/i.test(type) ? 'room' : 'house';
  const W = 1200, H = 800, GY = 585;   // ground line
  let defs = '', body = '', n = 0;
  const gid = () => 'g' + (n++);
  const grad = (stops, x1, y1, x2, y2) => { const id = gid(); defs += `<linearGradient id="${id}" x1="${x1 || 0}" y1="${y1 || 0}" x2="${x2 || 0}" y2="${y2 || 1}">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`; return `url(#${id})`; };
  const rect = (x, y, w, h, f, extra) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${f}" ${extra || ''}/>`;
  const poly = (pts, f, extra) => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${f}" ${extra || ''}/>`;
  const circ = (x, y, r, f, extra) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${f}" ${extra || ''}/>`;
  const ell = (x, y, rx, ry, f, extra) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${f}" ${extra || ''}/>`;
  const shade = (hex, f) => { const c = parseInt(hex.slice(1), 16); let r = c >> 16, g = (c >> 8) & 255, b = c & 255; const m = f < 0 ? 0 : 255, t = Math.abs(f); r = Math.round(r + (m - r) * t); g = Math.round(g + (m - g) * t); b = Math.round(b + (m - b) * t); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };

  // ── sky ──
  const tod = pick(['day', 'day', 'day', 'golden', 'golden', 'dusk']);
  const skies = { day: [[0, '#4FA3E0'], [0.6, '#9ED0F2'], [1, '#EAF6FF']], golden: [[0, '#6C9BD1'], [0.55, '#F6C98B'], [1, '#FFE7BE']], dusk: [[0, '#2E3F7A'], [0.5, '#9C6FA8'], [1, '#F2A58A']] }[tod];
  body += rect(0, 0, W, GY + 40, grad(skies));
  const sunX = between(180, 1020), sunY = tod === 'day' ? between(110, 190) : between(300, 380);
  body += circ(sunX, sunY, 150, grad([[0, tod === 'dusk' ? '#FFD7A8' : '#FFFBE6', 0.9], [1, '#FFFBE6', 0]]).replace('linearGradient', 'x'), '');
  defs += `<radialGradient id="sun"><stop offset="0" stop-color="${tod === 'dusk' ? '#FFD9A8' : '#FFFDF0'}" stop-opacity="1"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></radialGradient>`;
  body += circ(sunX, sunY, 170, 'url(#sun)') + circ(sunX, sunY, tod === 'day' ? 34 : 40, tod === 'dusk' ? '#FFE3B8' : '#FFF9DD');
  for (let i = 0, k = 3 + Math.floor(R() * 3); i < k; i++) {
    const cx = between(40, 1160), cy = between(70, 300), s = between(0.7, 1.5), o = tod === 'dusk' ? 0.35 : 0.85;
    body += `<g opacity="${o}" fill="${tod === 'dusk' ? '#F6C7C0' : '#FFFFFF'}">${ell(cx, cy, 70 * s, 22 * s, '')}${ell(cx - 45 * s, cy + 6 * s, 48 * s, 17 * s, '')}${ell(cx + 48 * s, cy + 8 * s, 52 * s, 16 * s, '')}${ell(cx + 6 * s, cy - 14 * s, 42 * s, 20 * s, '')}</g>`;
  }
  // background: hills or skyline
  if (kind === 'flat') {
    let x = -20; while (x < W) { const w = between(70, 130), hh = between(120, 300); body += rect(x, GY - hh, w, hh + 10, shade(pick(['#8FA3BF', '#9DB0C8', '#A8B4C4', '#8795AD']), tod === 'dusk' ? -0.35 : 0), 'opacity="0.55"'); x += w + between(0, 14); }
  } else {
    const hc = pick(['#7FB38A', '#6FA37C', '#8DBB8F']); body += `<path d="M0 ${GY - 40} Q 200 ${GY - between(110, 170)} 420 ${GY - 60} T 800 ${GY - 70} T 1200 ${GY - 50} L1200 ${GY + 10} L0 ${GY + 10} Z" fill="${shade(hc, tod === 'dusk' ? -0.45 : 0.15)}" opacity="0.85"/>`;
    body += `<path d="M0 ${GY - 15} Q 300 ${GY - between(70, 110)} 640 ${GY - 25} T 1200 ${GY - 30} L1200 ${GY + 10} L0 ${GY + 10} Z" fill="${shade(hc, tod === 'dusk' ? -0.5 : 0)}"/>`;
  }
  // ── ground ──
  const grass = pick(['#6DB66A', '#7DBE6E', '#5FAE62', '#85C26F']);
  body += rect(0, GY, W, H - GY, grad([[0, shade(grass, tod === 'dusk' ? -0.35 : 0)], [1, shade(grass, tod === 'dusk' ? -0.55 : -0.28)]]));
  const bodyG = []; // building group (drawn after the road/driveway)

  // palettes
  const walls = pick([['#F4EBDD', '#E3D5BE'], ['#FAFAF7', '#E4E4DE'], ['#E8D3B4', '#D3B98F'], ['#CFC9BF', '#B5AEA1'], ['#F2D9C8', '#E0BFA8'], ['#DDE5D6', '#C5D1BC'], ['#EFE3CF', '#D9C7A8'], ['#D9DCE2', '#BFC4CE']]);
  const roof = pick(['#B5573B', '#8C3F2D', '#4A4F5A', '#6B4A3A', '#3F5368', '#7A3E34', '#555B66']);
  const door = pick(['#6B4226', '#2F4A66', '#8B2F2F', '#2E5E4E', '#3B3B3F', '#A06A2C']);
  const glassG = grad([[0, '#BFE3F7'], [0.5, '#6FB0DB'], [1, '#3A7DB0']]);
  const warmG = grad([[0, '#FFEFB5'], [1, '#FFC966']]);
  const lit = tod !== 'day';
  const win = (x, y, w, hh, style) => {
    let s = rect(x - 5, y - 5, w + 10, hh + 10, '#FFFFFF', 'opacity="0.95"') + rect(x, y, w, hh, (lit && chance(0.6)) ? warmG : glassG);
    s += rect(x + w / 2 - 1.5, y, 3, hh, '#FFFFFF', 'opacity="0.9"') + rect(x, y + hh / 2 - 1.5, w, 3, '#FFFFFF', 'opacity="0.9"');
    s += `<path d="M${x} ${y + hh} L${x + w * 0.45} ${y} L${x + w * 0.62} ${y} L${x + w * 0.17} ${y + hh} Z" fill="#fff" opacity="0.18"/>`;
    if (style === 'shutters') s += rect(x - 22, y - 4, 16, hh + 8, shade(door, 0.05)) + rect(x + w + 6, y - 4, 16, hh + 8, shade(door, 0.05));
    if (style === 'sill') s += rect(x - 9, y + hh + 5, w + 18, 7, shade(walls[1], -0.1));
    return s;
  };
  const tree = (x, base, s) => { const c = pick(['#3F8F4E', '#2F7D45', '#52A05A', '#3A8450']);
    return `${ell(x, base + 4, 46 * s, 9 * s, '#000', 'opacity="0.18"')}${rect(x - 5 * s, base - 70 * s, 10 * s, 72 * s, '#6A4A32')}${circ(x, base - 105 * s, 52 * s, shade(c, -0.15))}${circ(x - 30 * s, base - 82 * s, 36 * s, c)}${circ(x + 30 * s, base - 86 * s, 38 * s, shade(c, 0.08))}${circ(x - 6 * s, base - 120 * s, 34 * s, shade(c, 0.12))}`; };
  const palm = (x, base, s) => { let o = `${ell(x, base + 3, 30 * s, 7 * s, '#000', 'opacity="0.18"')}<path d="M${x} ${base} Q ${x + 14 * s} ${base - 90 * s} ${x + 4 * s} ${base - 170 * s}" stroke="#8A6A4A" stroke-width="${9 * s}" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < 7; i++) { const a = -150 + i * 50, r = 78 * s; const ex = x + 4 * s + Math.cos(a * Math.PI / 180) * r, ey = base - 170 * s + Math.sin(a * Math.PI / 180) * r * 0.6 + 14 * s;
      o += `<path d="M${x + 4 * s} ${base - 170 * s} Q ${(x + ex) / 2} ${base - 205 * s + (i % 2) * 20} ${ex} ${ey}" stroke="${i % 2 ? '#2F7D45' : '#3F9455'}" stroke-width="${11 * s}" fill="none" stroke-linecap="round"/>`; } return o; };
  const bush = (x, base, s, c) => circ(x, base - 14 * s, 24 * s, shade(c, -0.1)) + circ(x + 20 * s, base - 10 * s, 20 * s, c) + circ(x - 20 * s, base - 10 * s, 18 * s, shade(c, 0.08));
  const flowers = (x, base, w) => { let o = ''; for (let i = 0; i < 9; i++) o += circ(x + R() * w, base - R() * 12, 4 + R() * 3, pick(['#F2678A', '#FFC93C', '#FFFFFF', '#B07CF2', '#FF8A5B'])); return o; };
  const car = (x, y, s) => { const c = pick(['#C0392B', '#2C3E50', '#ECF0F1', '#1F6FEB', '#7F8C8D', '#F39C12']);
    return `${ell(x + 60 * s, y + 38 * s, 78 * s, 9 * s, '#000', 'opacity="0.25"')}<path d="M${x} ${y + 30 * s} Q${x + 4 * s} ${y + 8 * s} ${x + 28 * s} ${y + 6 * s} L${x + 48 * s} ${y - 16 * s} Q${x + 56 * s} ${y - 22 * s} ${x + 70 * s} ${y - 22 * s} L${x + 98 * s} ${y - 20 * s} Q${x + 110 * s} ${y - 8 * s} ${x + 122 * s} ${y + 6 * s} Q${x + 136 * s} ${y + 12 * s} ${x + 134 * s} ${y + 30 * s} Z" fill="${c}"/><path d="M${x + 52 * s} ${y + 4 * s} L${x + 62 * s} ${y - 14 * s} L${x + 94 * s} ${y - 14 * s} L${x + 108 * s} ${y + 4 * s} Z" fill="#CFE8F7" opacity="0.9"/>${circ(x + 32 * s, y + 32 * s, 13 * s, '#222')}${circ(x + 32 * s, y + 32 * s, 6 * s, '#BBB')}${circ(x + 104 * s, y + 32 * s, 13 * s, '#222')}${circ(x + 104 * s, y + 32 * s, 6 * s, '#BBB')}`; };

  const cx = 600;
  if (kind === 'house' || kind === 'room') {
    const small = kind === 'room', floors = small ? 1 : (chance(0.55) ? 2 : 1), bw = small ? 330 : between(430, 520), fh = 165, bh = floors * fh, bx = cx - bw / 2 + (small ? 0 : between(-30, 30)), by = GY - 22 - bh;
    // driveway & path
    body += `<path d="M${cx - 40} ${H} L${cx + 120} ${H} L${cx + 70} ${GY + 6} L${cx - 10} ${GY + 6} Z" fill="${grad([[0, '#B9B3A8'], [1, '#CFC9BE']])}"/>`;
    // boundary wall & hedge
    const wall = pick(['#EFE6D6', '#D8CFC0', '#C9BBA2']);
    for (const side of [[40, cx - 190], [cx + 200, 1160]]) body += rect(side[0], GY + 28, side[1] - side[0], 38, wall) + rect(side[0], GY + 22, side[1] - side[0], 10, shade(wall, -0.14));
    for (let i = 0; i < 9; i++) body += rect(46 + i * 60, GY + 22, 8, 52, shade(wall, -0.06), i < 4 || i > 5 ? '' : 'opacity="0"');
    body += rect(cx - 190, GY + 22, 8, 52, '#555') + rect(cx + 192, GY + 22, 8, 52, '#555');
    // building
    let b = ell(cx, GY - 6, bw / 2 + 60, 16, '#000', 'opacity="0.22"');
    const gw = chance(0.4) && !small; let gx = bx - 150;   // side garage
    if (gw) { b += rect(gx, GY - 22 - 130, 150, 130, walls[1]) + rect(gx - 8, GY - 22 - 142, 166, 14, shade(roof, -0.05)) + rect(gx + 18, GY - 22 - 100, 114, 100, '#E8E8EC') + [0, 1, 2, 3, 4].map(i => rect(gx + 18, GY - 22 - 100 + i * 20, 114, 3, '#C4C4CA')).join(''); }
    b += rect(bx, by, bw, bh + 22, grad([[0, walls[0]], [1, walls[1]]]));
    if (chance(0.5)) b += rect(bx, by + bh - 8, bw, 30, shade(walls[1], -0.12));   // plinth
    // roof
    const roofType = pick(['gable', 'hip', 'flat']);
    if (roofType === 'gable') { b += poly([[bx - 30, by + 6], [bx + bw / 2, by - 118], [bx + bw + 30, by + 6]], grad([[0, shade(roof, 0.1)], [1, shade(roof, -0.12)]])); for (let i = 1; i < 6; i++) b += `<line x1="${bx - 30 + i * 12}" y1="${by + 6 - i * 20}" x2="${bx + bw + 30 - i * 12}" y2="${by + 6 - i * 20}" stroke="#000" stroke-opacity="0.12" stroke-width="2"/>`; if (chance(0.5)) b += rect(bx + bw * 0.72, by - 100, 26, 70, shade(walls[1], -0.2)); }
    else if (roofType === 'hip') { b += poly([[bx - 34, by + 8], [bx + 80, by - 90], [bx + bw - 80, by - 90], [bx + bw + 34, by + 8]], grad([[0, shade(roof, 0.12)], [1, shade(roof, -0.1)]])); b += poly([[bx - 34, by + 8], [bx + 80, by - 90], [bx + 80, by + 8]], shade(roof, -0.12), 'opacity="0.5"'); }
    else { b += rect(bx - 16, by - 18, bw + 32, 24, shade(walls[1], -0.25)) + rect(bx - 16, by - 24, bw + 32, 8, '#FFFFFF', 'opacity="0.9"'); }
    // windows & door
    const cols = small ? 2 : 3, gap = bw / cols;
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
      const wx = bx + c * gap + gap / 2 - 36, wy = by + f * fh + 34; const isDoor = f === floors - 1 && c === Math.floor(cols / 2);
      if (isDoor) { b += rect(wx - 12, wy + 18, 96, 112, walls[1], 'opacity="0.6"') + rect(wx + 4, wy + 26, 64, 104, door) + rect(wx + 10, wy + 34, 52, 40, shade(door, 0.12)) + rect(wx + 10, wy + 82, 52, 40, shade(door, 0.12)) + circ(wx + 58, wy + 84, 4, '#E8C86A'); }
      else b += win(wx, wy, 72, 86, pick(['shutters', 'sill', 'sill', '']));
    }
    if (floors === 2 && chance(0.6)) b += rect(bx + 20, by + fh - 6, bw - 40, 9, '#FFFFFF', 'opacity="0.9"') + rect(bx + 20, by + fh - 34, bw - 40, 4, '#FFFFFF');   // balcony rail
    // porch roof & steps
    b += rect(bx + bw / 2 - 70, GY - 22 - 6, 140, 10, '#D8D2C6') + rect(bx + bw / 2 - 58, GY - 22 + 4, 116, 8, '#C8C1B4');
    body += b;
    // garden
    body += bush(bx - 10, GY + 4, 1.1, '#3F8F4E') + bush(bx + bw + 10, GY + 4, 1.1, '#52A05A') + flowers(bx + 20, GY + 14, bw - 40) + bush(bx + bw / 2 - 90, GY + 8, 0.7, '#3F8F4E') + bush(bx + bw / 2 + 90, GY + 8, 0.7, '#3F8F4E');
    body += tree(pick([120, 150, 190]), GY + 38, between(1.0, 1.3)) + (chance(0.6) ? tree(pick([1000, 1050, 1090]), GY + 40, between(0.9, 1.25)) : palm(1040, GY + 36, 1.05));
    if (chance(0.55) && !small) body += car(cx + 150, GY + 108, 1.05);
  } else if (kind === 'villa') {
    const bw = between(560, 640), bx = cx - bw / 2 + between(-20, 20), floorH = 150;
    body += `<path d="M${cx - 60} ${H} L${cx + 190} ${H} L${cx + 90} ${GY + 6} L${cx - 20} ${GY + 6} Z" fill="${grad([[0, '#BDB7AC'], [1, '#D6D0C5']])}"/>`;
    let b = ell(cx, GY - 4, bw / 2 + 80, 18, '#000', 'opacity="0.22"');
    const l1y = GY - 20 - floorH, l2y = l1y - floorH + 10, mod = pick(['#F7F6F2', '#EDEAE3', '#E3E1DB']), stone = pick(['#8C7B6B', '#7B8794', '#6E6B66']);
    // ground block
    b += rect(bx, l1y, bw, floorH + 20, mod) + rect(bx - 10, l1y - 10, bw + 20, 14, '#FFFFFF') + rect(bx - 10, l1y - 4, bw + 20, 6, shade(mod, -0.18));
    // stone accent wall
    b += rect(bx, l1y, 150, floorH + 20, stone); for (let i = 0; i < 8; i++) b += rect(bx, l1y + 6 + i * 22, 150, 2, '#000', 'opacity="0.18"'); for (let i = 0; i < 6; i++) b += rect(bx + (i % 2) * 40 + i * 21 % 130, l1y + 6 + Math.floor(i * 3) * 22, 2, 20, '#000', 'opacity="0.12"');
    // big glass
    b += rect(bx + 170, l1y + 24, bw - 340, 118, '#2B2B2F') + rect(bx + 176, l1y + 30, bw - 352, 106, glassG);
    for (let i = 1; i < 4; i++) b += rect(bx + 176 + i * (bw - 352) / 4 - 1.5, l1y + 30, 3, 106, '#2B2B2F');
    b += `<path d="M${bx + 190} ${l1y + 136} L${bx + 330} ${l1y + 30} L${bx + 380} ${l1y + 30} L${bx + 240} ${l1y + 136} Z" fill="#fff" opacity="0.2"/>`;
    // entrance
    b += rect(bx + bw - 150, l1y + 40, 100, 120, door) + rect(bx + bw - 140, l1y + 52, 80, 96, shade(door, 0.18)) + rect(bx + bw - 28, l1y + 40, 6, 120, '#E8C86A');
    // upper floor (offset block)
    const ubx = bx + 60 + (chance(0.5) ? 90 : 0), ubw = bw - 220;
    b += rect(ubx, l2y, ubw, floorH - 6, pick(['#F0EEE8', '#E8E4DA', '#DDE2E6'])) + rect(ubx - 12, l2y - 12, ubw + 24, 14, '#FFFFFF') + rect(ubx - 12, l2y - 5, ubw + 24, 6, shade(mod, -0.2));
    b += rect(ubx + 24, l2y + 28, ubw - 48, 90, '#2B2B2F') + rect(ubx + 30, l2y + 34, ubw - 60, 78, glassG) + rect(ubx + ubw / 2 - 1.5, l2y + 34, 3, 78, '#2B2B2F');
    b += rect(ubx + 24, l2y + 116, ubw - 48, 4, '#FFFFFF') + `<path d="M${ubx + 30} ${l2y + 112} L${ubx + 120} ${l2y + 34} L${ubx + 160} ${l2y + 34} L${ubx + 70} ${l2y + 112} Z" fill="#fff" opacity="0.2"/>`;
    for (let i = 0; i < 10; i++) b += rect(ubx + 30 + i * (ubw - 60) / 9, l2y + 118, 3, 26, '#FFFFFF', 'opacity="0.85"');
    if (lit) b += rect(bx + 176, l1y + 30, bw - 352, 106, 'url(#sun)', 'opacity="0.0"');
    body += b;
    // pool
    if (chance(0.7)) { const px = pick([110, 760]); body += `<path d="M${px} ${GY + 90} L${px + 300} ${GY + 90} L${px + 340} ${GY + 168} L${px - 40} ${GY + 168} Z" fill="#D9D3C8"/>` + `<path d="M${px + 14} ${GY + 98} L${px + 286} ${GY + 98} L${px + 314} ${GY + 158} L${px - 14} ${GY + 158} Z" fill="${grad([[0, '#5DD3F0'], [1, '#2AA8D8']])}"/>` + [0, 1, 2].map(i => `<path d="M${px + 30 + i * 70} ${GY + 120 + i * 6} q 20 -8 40 0" stroke="#fff" stroke-opacity="0.6" stroke-width="3" fill="none"/>`).join(''); }
    body += palm(130, GY + 44, 1.2) + palm(1090, GY + 40, 1.1) + bush(bx - 24, GY + 4, 1.0, '#3F8F4E') + bush(bx + bw + 20, GY + 4, 1.0, '#52A05A') + flowers(bx + 10, GY + 12, bw - 20);
    if (chance(0.5)) body += car(cx + 140, GY + 112, 1.1);
  } else { // flat / apartment block
    const floors = 4 + Math.floor(R() * 3), bw = between(420, 520), fh = 78, bh = floors * fh + 40, bx = cx - bw / 2 + between(-40, 40), by = GY - bh + 4;
    const facade = pick([['#E9E2D6', '#D0C5B2'], ['#D7DEE8', '#BCC7D6'], ['#EADFD2', '#D2BEA5'], ['#E1E4E0', '#C3C9C2']]), accent = pick(['#B5573B', '#3F5E8C', '#4F7F6A', '#8A5A83', '#C08A2E']);
    // side neighbours
    body += rect(bx - 190, GY - 190, 170, 196, shade('#A9B4C6', tod === 'dusk' ? -0.35 : 0)) + rect(bx + bw + 20, GY - 250, 160, 256, shade('#B7B2A6', tod === 'dusk' ? -0.35 : 0));
    for (let i = 0; i < 12; i++) body += rect(bx - 176 + (i % 4) * 40, GY - 176 + Math.floor(i / 4) * 52, 22, 30, lit && chance(0.5) ? '#FFD98A' : '#DDEBF7', 'opacity="0.85"') + rect(bx + bw + 34 + (i % 4) * 36, GY - 236 + Math.floor(i / 4) * 62, 22, 34, lit && chance(0.5) ? '#FFD98A' : '#DDEBF7', 'opacity="0.85"');
    let b = ell(cx, GY - 2, bw / 2 + 80, 16, '#000', 'opacity="0.22"') + rect(bx, by, bw, bh, grad([[0, facade[0]], [1, facade[1]]]));
    b += rect(bx - 8, by - 12, bw + 16, 16, accent) + rect(bx + bw * 0.15, by - 40, 70, 30, '#8F9AA6') + rect(bx + bw * 0.15 + 8, by - 52, 54, 14, '#A9B3BE');
    for (let f = 0; f < floors; f++) {
      const y = by + 24 + f * fh;
      for (let c = 0; c < 4; c++) { const x = bx + 32 + c * ((bw - 64) / 4);
        b += rect(x, y, 62, 50, '#FFFFFF') + rect(x + 4, y + 4, 54, 42, (lit && chance(0.55)) ? warmG : glassG) + rect(x + 29, y + 4, 3, 42, '#FFFFFF');
        if (f % 2 === 1) b += rect(x - 6, y + 52, 74, 16, accent, 'opacity="0.9"') + rect(x - 6, y + 52, 74, 3, '#fff', 'opacity="0.7"') + [0, 1, 2, 3, 4, 5].map(i => rect(x - 3 + i * 12, y + 55, 2, 12, '#fff', 'opacity="0.7"')).join('');
      }
      b += rect(bx, y + 62, bw, 3, '#000', 'opacity="0.10"');
    }
    b += rect(bx + bw / 2 - 60, GY - 78, 120, 82, '#2B2B2F') + rect(bx + bw / 2 - 52, GY - 70, 104, 74, glassG) + rect(bx + bw / 2 - 1.5, GY - 70, 3, 74, '#2B2B2F') + rect(bx + bw / 2 - 80, GY - 94, 160, 14, accent) + rect(bx + bw / 2 - 80, GY - 82, 160, 4, '#000', 'opacity="0.18"');
    body += b + rect(0, GY + 6, W, 120, grad([[0, '#6F7378'], [1, '#575B60']])) + rect(0, GY + 6, W, 8, '#B9B9B2') + [0, 1, 2, 3, 4, 5, 6].map(i => rect(60 + i * 180, GY + 78, 90, 7, '#F2E9C8', 'opacity="0.85"')).join('');
    body += tree(150, GY + 8, 1.1) + tree(1060, GY + 8, 1.2) + bush(bx + 10, GY + 4, 1.1, '#3F8F4E') + bush(bx + bw - 10, GY + 4, 1.1, '#52A05A');
    if (chance(0.6)) body += car(cx - 300, GY + 66, 0.95);
  }
  // soft light overlay / vignette
  defs += `<radialGradient id="vg" cx="0.5" cy="0.45" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${tod === 'dusk' ? 0.35 : 0.2}"/></radialGradient>`;
  body += rect(0, 0, W, H, 'url(#vg)');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
// <img> markup for a property card that has no uploaded cover photo
function tmsHouseArtImg(p) {
  return `<img src="${tmsHouseArt((p && (p._id || p.title)) || 'house', p && p.type)}" alt="${(p && p.title) || 'Property'}" style="width:100%;height:100%;object-fit:cover;display:block">`;
}
