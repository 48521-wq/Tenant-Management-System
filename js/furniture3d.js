/* ============================================================
   TMS — furniture3d.js  v4.0
   Realistic furniture: procedural wood / fabric / leather / marble
   textures, true rounded geometry, smooth normals, environment
   reflections, soft shadows and a furnished room.
   ============================================================ */

const _fScenes = {};
const _TX = {};
let _seed = 7;
const _rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
const _cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const _col = (hex) => '#' + new THREE.Color(hex).getHexString();
const _shade = (hex, f) => { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return c.getHex(); };
const _hue = (hex, d) => { const c = new THREE.Color(hex); c.offsetHSL(d, 0, 0); return c.getHex(); };
const TILE = 0.5; // metres per texture repeat

function _tex(key, draw, size) {
  if (!_TX[key]) {
    _seed = 11 + key.length * 13;
    const c = _cv(size || 512, size || 512), x = c.getContext('2d'); draw(x, c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.encoding = THREE.sRGBEncoding;
    t.repeat.set(1 / TILE, 1 / TILE); _TX[key] = t;
  }
  return _TX[key];
}
const _woodTex = (hex) => _tex('wood' + hex, (x, w, h) => {
  x.fillStyle = _col(hex); x.fillRect(0, 0, w, h);
  for (let i = 0; i < 170; i++) {
    const y = _rnd() * h, a = _rnd() * 0.07 + 0.02, dark = _rnd() < 0.62;
    x.strokeStyle = dark ? `rgba(38,20,6,${a})` : `rgba(255,236,205,${a * 0.7})`; x.lineWidth = _rnd() * 2.6 + 0.4;
    x.beginPath(); x.moveTo(0, y);
    for (let px = 0; px <= w; px += 32) x.lineTo(px, y + Math.sin(px * 0.018 + i) * 3.5 + (_rnd() - 0.5) * 1.6);
    x.stroke();
  }
  for (let k = 0; k < 2; k++) { const px = _rnd() * w, py = _rnd() * h; for (let r = 18; r > 2; r -= 3) { x.strokeStyle = `rgba(40,20,5,${0.05 + (18 - r) * 0.004})`; x.lineWidth = 1.2; x.beginPath(); x.ellipse(px, py, r * 2.2, r * 0.8, 0, 0, 6.3); x.stroke(); } }
});
const _fabTex = (hex) => _tex('fab' + hex, (x, w, h) => {
  x.fillStyle = _col(hex); x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 3) { x.fillStyle = i % 6 ? 'rgba(0,0,0,0.055)' : 'rgba(255,255,255,0.04)'; x.fillRect(i, 0, 1.4, h); x.fillRect(0, i, w, 1.4); }
  for (let i = 0; i < 6000; i++) { x.fillStyle = `rgba(${_rnd() < 0.5 ? '0,0,0' : '255,255,255'},${_rnd() * 0.07})`; x.fillRect(_rnd() * w, _rnd() * h, 2, 2); }
});
const _leaTex = (hex) => _tex('lea' + hex, (x, w, h) => {
  x.fillStyle = _col(hex); x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const px = _rnd() * w, py = _rnd() * h, r = 3 + _rnd() * 5; x.strokeStyle = `rgba(0,0,0,${0.06 + _rnd() * 0.08})`; x.lineWidth = 1; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.stroke(); }
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.08)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const _marbleTex = () => _tex('marble', (x, w, h) => {
  x.fillStyle = '#F2F0EC'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 16; i++) { let px = _rnd() * w, py = _rnd() * h; x.strokeStyle = `rgba(95,100,110,${0.12 + _rnd() * 0.25})`; x.lineWidth = 0.6 + _rnd() * 2; x.beginPath(); x.moveTo(px, py);
    for (let s = 0; s < 22; s++) { px += (_rnd() - 0.3) * 40; py += (_rnd() - 0.5) * 40; x.lineTo(px, py); } x.stroke(); }
});

const M = {
  wood: (hex, rough) => { const t = _woodTex(hex); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.25, roughness: rough || 0.5, metalness: 0, envMapIntensity: 0.7 }); },
  fabric: (hex) => { const t = _fabTex(hex); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.55, roughness: 0.96, metalness: 0, envMapIntensity: 0.25 }); },
  leather: (hex) => { const t = _leaTex(hex); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.9, roughness: 0.42, metalness: 0.02, envMapIntensity: 0.9 }); },
  marble: () => { const t = _marbleTex(); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.05, envMapIntensity: 1.0 }); },
  metal: (hex, r) => new THREE.MeshStandardMaterial({ color: hex || 0xC9CED6, roughness: r == null ? 0.28 : r, metalness: 1, envMapIntensity: 1.3 }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xD4AF6A, roughness: 0.25, metalness: 1, envMapIntensity: 1.4 }),
  paint: (hex, r) => new THREE.MeshStandardMaterial({ color: hex, roughness: r == null ? 0.6 : r, metalness: 0, envMapIntensity: 0.5 }),
  ceramic: (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.18, metalness: 0, envMapIntensity: 1.0 }),
  glass: () => new THREE.MeshStandardMaterial({ color: 0xDDEEFF, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.28, envMapIntensity: 1.6 }),
  mirror: () => new THREE.MeshStandardMaterial({ color: 0xE9EEF2, roughness: 0.02, metalness: 1, envMapIntensity: 1.8 }),
  screen: () => new THREE.MeshStandardMaterial({ color: 0x05070B, roughness: 0.05, metalness: 0.6, envMapIntensity: 1.6 }),
  glow: (hex, em) => { const m = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: em || 0.8, roughness: 0.8 }); m.userData.em = hex; return m; },
};

function _smooth(g) {
  const p = g.attributes.position, n = new Float32Array(p.count * 3), map = new Map();
  const key = i => Math.round(p.getX(i) * 1e3) + ',' + Math.round(p.getY(i) * 1e3) + ',' + Math.round(p.getZ(i) * 1e3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    f.subVectors(c, b).cross(a.clone().sub(b));
    for (let k = 0; k < 3; k++) { const kk = key(i + k); let v = map.get(kk); if (!v) { v = new THREE.Vector3(); map.set(kk, v); } v.add(f); }
  }
  for (let i = 0; i < p.count; i++) { const v = map.get(key(i)).clone().normalize(); n[i * 3] = v.x; n[i * 3 + 1] = v.y; n[i * 3 + 2] = v.z; }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3)); return g;
}
function _rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2; r = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001));
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false); return s;
}
function roundedBox(w, h, d, r, seg) {
  r = Math.min(r || 0.01, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
  const g = new THREE.ExtrudeGeometry(_rrShape(w - 2 * r, h - 2 * r, r * 1.2), { depth: Math.max(0.001, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg || 3, curveSegments: 6, steps: 1 });
  g.center(); return _smooth(g);
}
function _boxUV(g, w, h, d) {
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  return g;
}

// ── Main furniture builder ───────────────────────────────────
function buildFurniture(scene, type, colorHex) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    if (rx) m.rotation.x = rx; if (ry) m.rotation.y = ry; if (rz) m.rotation.z = rz;
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, rx, ry, rz) => add(_boxUV(new THREE.BoxGeometry(w, h, d), w, h, d), mat, x, y, z, rx, ry, rz);
  const rbox = (w, h, d, r, mat, x, y, z, rx, ry, rz) => add(roundedBox(w, h, d, r), mat, x, y, z, rx, ry, rz);
  const pillow = (w, h, d, mat, x, y, z, rx, ry, rz) => rbox(w, h, d, Math.min(w, h, d) * 0.4, mat, x, y, z, rx, ry, rz);
  const cyl = (rt, rb, h, mat, x, y, z, rx, ry, rz, seg) => add(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat, x, y, z, rx, ry, rz);
  const sph = (r, mat, x, y, z, sx, sy, sz) => { const m = add(new THREE.SphereGeometry(r, 20, 14), mat, x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); return m; };
  const lathe = (pts, mat, x, y, z) => add(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 28), mat, x, y, z);
  const leg = (rt, rb, h, mat, x, z, y0) => cyl(rt, rb, h, mat, x, (y0 || 0) + h / 2, z, 0, 0, 0, 14);

  const C = colorHex || 0x8B5E3C, dark = _shade(C, -0.1), light = _shade(C, 0.08), accent = _hue(C, 0.5);
  const woodDark = 0x4A3020, woodMid = 0x8A5A38;

  switch (type) {
    case 'sofa': {
      const fab = M.fabric(C), fabD = M.fabric(dark), fabL = M.fabric(light), wd = M.wood(woodDark);
      rbox(2.3, 0.22, 0.98, 0.03, wd, 0, 0.27, 0);
      [[-1.0, 0.36], [-1.0, -0.36], [1.0, 0.36], [1.0, -0.36]].forEach(p => leg(0.03, 0.045, 0.17, M.wood(0x2E2016), p[0], p[1]));
      rbox(0.26, 0.64, 1.0, 0.1, fabD, -1.15, 0.58, 0); rbox(0.26, 0.64, 1.0, 0.1, fabD, 1.15, 0.58, 0);
      cyl(0.13, 0.13, 1.0, fab, -1.15, 0.9, 0, Math.PI / 2, 0, 0, 24); cyl(0.13, 0.13, 1.0, fab, 1.15, 0.9, 0, Math.PI / 2, 0, 0, 24);
      rbox(2.04, 0.66, 0.22, 0.08, fabD, 0, 0.74, -0.42);
      [-0.67, 0, 0.67].forEach((x, i) => { pillow(0.66, 0.2, 0.74, i === 1 ? fabL : fab, x, 0.47, 0.08); pillow(0.64, 0.5, 0.2, i === 1 ? fabL : fab, x, 0.86, -0.27, -0.16); });
      pillow(0.4, 0.4, 0.13, M.fabric(accent), -0.85, 0.82, 0.02, -0.2, 0.3, 0.12); pillow(0.4, 0.38, 0.13, M.fabric(_shade(accent, -0.15)), 0.85, 0.8, 0.0, -0.2, -0.25, -0.1);
      break;
    }
    case 'armchair': {
      const fab = M.fabric(C), fabD = M.fabric(dark), wd = M.wood(woodMid);
      rbox(0.95, 0.2, 0.9, 0.04, M.wood(woodDark), 0, 0.3, 0);
      [[-0.38, 0.34], [-0.38, -0.34], [0.38, 0.34], [0.38, -0.34]].forEach(p => leg(0.025, 0.04, 0.2, wd, p[0], p[1]));
      rbox(0.22, 0.6, 0.9, 0.09, fabD, -0.4, 0.58, 0); rbox(0.22, 0.6, 0.9, 0.09, fabD, 0.4, 0.58, 0);
      rbox(0.95, 0.74, 0.2, 0.09, fabD, 0, 0.76, -0.36, -0.1);
      pillow(0.6, 0.2, 0.68, fab, 0, 0.5, 0.06); pillow(0.58, 0.46, 0.17, fab, 0, 0.78, -0.22, -0.2);
      pillow(0.34, 0.34, 0.12, M.fabric(accent), 0.12, 0.74, -0.02, -0.25, 0.3, 0.1);
      break;
    }
    case 'bed_double': case 'bed_single': {
      const dbl = type === 'bed_double', W = dbl ? 1.6 : 0.95, L = 2.05, wd = M.wood(woodMid), wdD = M.wood(woodDark);
      const fab = M.fabric(C), fabD = M.fabric(dark), sheet = M.fabric(0xF3EFE8);
      rbox(W + 0.1, 0.24, L + 0.1, 0.03, wd, 0, 0.3, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(s => box(0.08, 0.3, 0.08, wdD, s[0] * (W / 2 + 0.01), 0.15, s[1] * (L / 2 - 0.02)));
      rbox(W + 0.14, 1.05, 0.1, 0.04, wd, 0, 0.78, -L / 2 - 0.02);
      const n = dbl ? 4 : 2; for (let i = 0; i < n; i++) pillow(W / n - 0.03, 0.82, 0.1, fabD, -W / 2 + (i + 0.5) * W / n, 0.84, -L / 2 + 0.04);
      rbox(W + 0.1, 0.45, 0.08, 0.03, wd, 0, 0.42, L / 2 + 0.03);
      rbox(W, 0.26, L - 0.1, 0.09, M.paint(0xF4F1EA, 0.9), 0, 0.55, 0.0);
      pillow(W - 0.04, 0.09, L * 0.66, fab, 0, 0.7, 0.3); pillow(W - 0.02, 0.12, 0.42, fabD, 0, 0.72, -0.25);
      pillow(W - 0.02, 0.025, 0.38, M.fabric(accent), 0, 0.77, 0.62);
      const pw = dbl ? 0.62 : 0.55; (dbl ? [-0.4, 0.4] : [0]).forEach(x => { pillow(pw, 0.16, 0.4, sheet, x, 0.76, -L / 2 + 0.38, -0.12); });
      if (dbl) { pillow(0.4, 0.4, 0.12, M.fabric(accent), -0.18, 0.84, -L / 2 + 0.55, -0.9, 0, 0.3); }
      break;
    }
    case 'dining_table': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.08));
      rbox(1.7, 0.06, 0.95, 0.02, wd, 0, 0.75, 0); box(1.4, 0.08, 0.6, wdD, 0, 0.68, 0);
      [[-0.76, 0.38], [-0.76, -0.38], [0.76, 0.38], [0.76, -0.38]].forEach(p => leg(0.03, 0.05, 0.72, wdD, p[0], p[1]));
      add(new THREE.BoxGeometry(1.5, 0.006, 0.28), M.fabric(_hue(C, 0.45)), 0, 0.783, 0);
      lathe([[0.001, 0], [0.09, 0.0], [0.17, 0.07], [0.19, 0.095], [0.18, 0.095], [0.15, 0.05], [0.001, 0.02]], M.ceramic(0xF4F1EA), 0, 0.786, 0);
      [[0, 0.1, 0.02, 0xD9402B], [0.07, 0.09, 0.04, 0xE8A62B], [-0.06, 0.1, -0.03, 0x8DB844]].forEach(f => sph(0.045, M.paint(f[3], 0.4), f[0], 0.84, f[2]));
      lathe([[0.001, 0], [0.05, 0], [0.06, 0.1], [0.035, 0.2], [0.03, 0.26], [0.045, 0.28], [0.03, 0.28], [0.022, 0.24], [0.04, 0.1], [0.001, 0.02]], M.glass(), 0.6, 0.786, 0.1);
      break;
    }
    case 'dining_chair': case 'chair': {
      const dc = type === 'dining_chair', wd = M.wood(dc ? C : woodMid), seat = dc ? M.fabric(_shade(C, 0.15)) : M.wood(_shade(woodMid, 0.04));
      [[-0.19, 0.19], [0.19, 0.19]].forEach(p => leg(0.018, 0.024, 0.45, wd, p[0], p[1]));
      [[-0.19, -0.19], [0.19, -0.19]].forEach(p => leg(0.02, 0.026, 0.9, wd, p[0], p[1]));
      rbox(0.44, 0.04, 0.42, 0.012, wd, 0, 0.45, 0); if (dc) pillow(0.4, 0.07, 0.38, seat, 0, 0.5, 0.0); else rbox(0.42, 0.035, 0.4, 0.015, seat, 0, 0.485, 0);
      box(0.44, 0.07, 0.025, wd, 0, 0.88, -0.19); box(0.44, 0.05, 0.025, wd, 0, 0.74, -0.19);
      [-0.13, 0, 0.13].forEach(x => box(0.04, 0.2, 0.02, wd, x, 0.8, -0.19));
      box(0.4, 0.03, 0.03, wd, 0, 0.3, 0.19); box(0.4, 0.03, 0.03, wd, 0, 0.3, -0.19);
      break;
    }
    case 'wardrobe': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.06)), br = M.brass();
      box(1.5, 0.08, 0.6, M.wood(woodDark), 0, 0.04, 0); rbox(1.5, 1.92, 0.6, 0.015, wd, 0, 1.04, 0); box(1.56, 0.06, 0.64, wdD, 0, 2.03, 0);
      box(1.5, 0.03, 0.01, M.paint(0x1a1209, 0.9), 0, 1.04, 0.303);
      [-0.375, 0.375].forEach(x => { rbox(0.7, 1.4, 0.02, 0.01, wdD, x, 1.28, 0.31); box(0.5, 1.2, 0.012, wd, x, 1.28, 0.324); });
      [-0.04, 0.04].forEach(x => cyl(0.012, 0.012, 0.24, br, x, 1.2, 0.34, 0, 0, 0, 12));
      [-0.375, 0.375].forEach(x => { rbox(0.7, 0.28, 0.02, 0.01, wdD, x, 0.38, 0.31); cyl(0.014, 0.014, 0.04, br, x, 0.38, 0.34, Math.PI / 2, 0, 0, 12); sph(0.022, br, x, 0.38, 0.355); });
      break;
    }
    case 'tv_unit': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.07)), br = M.brass();
      rbox(1.9, 0.46, 0.42, 0.02, wd, 0, 0.35, 0);
      [[-0.85, 0.15], [0.85, 0.15], [-0.85, -0.15], [0.85, -0.15]].forEach(p => leg(0.02, 0.014, 0.14, br, p[0], p[1]));
      [-0.63, 0, 0.63].forEach(x => { rbox(0.6, 0.38, 0.015, 0.008, wdD, x, 0.35, 0.215); box(0.16, 0.014, 0.015, br, x, 0.5, 0.232); });
      rbox(1.9, 0.02, 0.44, 0.008, M.wood(_shade(C, 0.05)), 0, 0.59, 0);
      box(0.5, 0.025, 0.2, M.metal(0x2A2D33, 0.4), 0, 0.615, 0.02); box(0.04, 0.12, 0.04, M.metal(0x2A2D33, 0.4), 0, 0.66, 0);
      box(1.35, 0.78, 0.045, M.paint(0x0B0C10, 0.35), 0, 1.07, 0.0); box(1.29, 0.72, 0.01, M.screen(), 0, 1.07, 0.027);
      box(0.6, 0.06, 0.08, M.fabric(0x222428), 0, 0.64, 0.14); sph(0.045, M.ceramic(0xF0E9DC), 0.78, 0.65, 0.05);
      break;
    }
    case 'bookshelf': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.08)), H = 1.95, W = 0.95, D = 0.32;
      box(0.035, H, D, wd, -W / 2, H / 2, 0); box(0.035, H, D, wd, W / 2, H / 2, 0); box(W, H, 0.012, wdD, 0, H / 2, -D / 2 + 0.006);
      box(W, 0.07, D, wd, 0, 0.035, 0); box(W + 0.04, 0.035, D + 0.02, wd, 0, H + 0.01, 0);
      const ys = [0.07, 0.43, 0.79, 1.15, 1.51]; ys.forEach(y => box(W - 0.03, 0.025, D - 0.01, wd, 0, y + 0.37, 0));
      const cols = [0xA33B3B, 0x2F5D8C, 0x3F7A4D, 0xC49A3A, 0x5B3F7A, 0x8A8A86, 0x1E3A44, 0xB5651D];
      ys.forEach((y, row) => {
        let x = -W / 2 + 0.05; _seed = 40 + row * 17;
        while (x < W / 2 - 0.12) { if (row === 3 && x > 0.1 && x < 0.28) { lathe([[0.001, 0], [0.05, 0], [0.06, 0.1], [0.03, 0.2], [0.001, 0.2]], M.ceramic(0x3B6E8F), 0.19, y + 0.0 + 0.02, 0); x = 0.3; continue; }
          const bw = 0.025 + _rnd() * 0.03, bh = 0.22 + _rnd() * 0.1; box(bw, bh, D - 0.08, M.paint(cols[(_rnd() * cols.length) | 0], 0.7), x + bw / 2, y + 0.0125 + bh / 2 + 0.012, 0, 0, 0, _rnd() < 0.08 ? 0.18 : 0); x += bw + 0.004; }
      });
      break;
    }
    case 'coffee_table': {
      const wd = M.wood(C), br = M.brass();
      rbox(1.1, 0.04, 0.62, 0.015, M.marble(), 0, 0.42, 0); rbox(0.96, 0.03, 0.5, 0.012, wd, 0, 0.14, 0);
      [[-0.5, 0.26], [0.5, 0.26], [-0.5, -0.26], [0.5, -0.26]].forEach(p => leg(0.015, 0.015, 0.4, br, p[0], p[1]));
      box(1.04, 0.015, 0.014, br, 0, 0.395, 0.29); box(1.04, 0.015, 0.014, br, 0, 0.395, -0.29);
      rbox(0.34, 0.012, 0.24, 0.005, wd, -0.2, 0.452, 0.05); box(0.22, 0.03, 0.16, M.paint(0x2F5D8C, 0.7), 0.3, 0.455, -0.05, 0, 0.3, 0); box(0.2, 0.025, 0.14, M.paint(0xC9A24B, 0.7), 0.3, 0.485, -0.05, 0, -0.2, 0);
      lathe([[0.001, 0], [0.04, 0], [0.05, 0.06], [0.03, 0.14], [0.012, 0.18], [0.001, 0.18]], M.ceramic(0xE8E1D4), -0.2, 0.458, 0.05);
      cyl(0.035, 0.035, 0.06, M.paint(0xF2E6C9, 0.9), -0.38, 0.49, 0.1, 0, 0, 0, 20);
      break;
    }
    case 'lamp': {
      const br = M.brass(), shade = M.glow(0xFFE9B8, 0.55);
      cyl(0.17, 0.19, 0.03, M.metal(0x2A2A2E, 0.35), 0, 0.015, 0, 0, 0, 0, 32); cyl(0.012, 0.012, 1.45, br, 0, 0.75, 0, 0, 0, 0, 12);
      sph(0.03, br, 0, 0.42, 0); sph(0.03, br, 0, 1.45, 0);
      add(new THREE.CylinderGeometry(0.14, 0.22, 0.32, 32, 1, true), Object.assign(shade, { side: THREE.DoubleSide }), 0, 1.62, 0).castShadow = false;
      sph(0.06, M.glow(0xFFF3D0, 1.6), 0, 1.58, 0);
      const pl = new THREE.PointLight(0xFFD9A0, 0.55, 4.5, 2); pl.position.set(0, 1.6, 0); g.add(pl);
      break;
    }
    case 'plant': {
      const pot = M.ceramic(0xE9E3D8), soil = M.paint(0x2A1C12, 1);
      lathe([[0.001, 0], [0.15, 0], [0.2, 0.2], [0.23, 0.38], [0.2, 0.4], [0.001, 0.4]], pot, 0, 0, 0); cyl(0.21, 0.21, 0.02, soil, 0, 0.37, 0, 0, 0, 0, 24);
      const greens = [0x2F6B3A, 0x3C8148, 0x25552F, 0x4A944F]; _seed = 99;
      for (let i = 0; i < 26; i++) {
        const a = _rnd() * 6.283, tilt = 0.25 + _rnd() * 0.85, len = 0.34 + _rnd() * 0.32, h0 = 0.38;
        const stem = new THREE.Group(); stem.rotation.y = a; stem.position.y = h0;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, len, 6), M.paint(0x3F6B38, 0.8)); st.position.set(0, len / 2, 0); st.rotation.z = tilt; st.position.x = Math.sin(tilt) * len / 2; st.position.y = Math.cos(tilt) * len / 2; st.castShadow = true; stem.add(st);
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 10), new THREE.MeshStandardMaterial({ color: greens[i % 4], roughness: 0.5, side: THREE.DoubleSide }));
        lf.scale.set(0.55 + _rnd() * 0.3, 0.05, 0.95); lf.position.set(Math.sin(tilt) * len, Math.cos(tilt) * len, 0); lf.rotation.z = -tilt * 0.6 + (_rnd() - 0.5) * 0.5; lf.rotation.y = (_rnd() - 0.5) * 1.2; lf.castShadow = true; stem.add(lf); g.add(stem);
      }
      break;
    }
    case 'mirror': {
      const fr = M.brass(), fw = 0.05, W = 0.8, H = 1.85;
      const m = new THREE.Group(); m.rotation.x = -0.09; m.position.set(0, 0.04, 0); g.add(m);
      const put = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; m.add(o); return o; };
      put(new THREE.BoxGeometry(W, fw, 0.05), fr, 0, H - fw / 2, 0); put(new THREE.BoxGeometry(W, fw, 0.05), fr, 0, fw / 2, 0);
      put(new THREE.BoxGeometry(fw, H, 0.05), fr, -W / 2 + fw / 2, H / 2, 0); put(new THREE.BoxGeometry(fw, H, 0.05), fr, W / 2 - fw / 2, H / 2, 0);
      put(new THREE.BoxGeometry(W - 2 * fw, H - 2 * fw, 0.012), M.mirror(), 0, H / 2, 0.005);
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.2, 8), M.wood(woodDark)); sp.position.set(0, 0.62, -0.28); sp.rotation.x = 0.43; sp.castShadow = true; g.add(sp);
      break;
    }
    case 'desk': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.08)), br = M.metal(0x2A2D33, 0.4);
      rbox(1.5, 0.045, 0.72, 0.015, wd, 0, 0.75, 0);
      rbox(0.45, 0.62, 0.62, 0.015, wdD, -0.5, 0.4, 0); [0.57, 0.4, 0.23].forEach(y => { rbox(0.41, 0.15, 0.015, 0.006, wd, -0.5, y - 0.07, 0.318); box(0.12, 0.012, 0.012, M.brass(), -0.5, y - 0.025, 0.332); });
      box(0.04, 0.72, 0.62, br, 0.7, 0.36, 0); box(0.04, 0.04, 0.6, br, 0.7, 0.05, 0); box(0.02, 0.02, 0.6, br, 0.35, 0.68, 0);
      box(0.1, 0.012, 0.12, M.metal(0x2A2D33, 0.3), 0.15, 0.78, -0.12); box(0.03, 0.2, 0.025, M.metal(0x2A2D33, 0.3), 0.15, 0.88, -0.14);
      box(0.62, 0.38, 0.025, M.paint(0x0B0C10, 0.35), 0.15, 1.04, -0.15); box(0.58, 0.34, 0.006, M.glow(0x1B3A5A, 0.5), 0.15, 1.04, -0.135);
      box(0.4, 0.015, 0.13, M.paint(0x1D1F24, 0.5), 0.12, 0.78, 0.15); rbox(0.06, 0.02, 0.1, 0.008, M.paint(0x1D1F24, 0.5), 0.45, 0.78, 0.15);
      cyl(0.04, 0.035, 0.09, M.ceramic(0x2F5D8C), -0.2, 0.82, -0.2, 0, 0, 0, 20); box(0.22, 0.02, 0.16, M.paint(0xE9E3D8, 0.9), 0.5, 0.783, -0.2, 0, 0.2, 0);
      break;
    }
    case 'rug': {
      const t = _tex('rug' + C, (x, w, h) => { x.fillStyle = _col(C); x.fillRect(0, 0, w, h); x.strokeStyle = _col(_shade(C, 0.22)); x.lineWidth = 14; x.strokeRect(34, 34, w - 68, h - 68); x.strokeStyle = _col(_shade(C, -0.14)); x.lineWidth = 6; x.strokeRect(62, 62, w - 124, h - 124);
        for (let i = 0; i < 16000; i++) { x.fillStyle = `rgba(${_rnd() < 0.5 ? '0,0,0' : '255,255,255'},${_rnd() * 0.07})`; x.fillRect(_rnd() * w, _rnd() * h, 2, 2); } });
      const tt = t.clone(); tt.repeat.set(1, 1); tt.needsUpdate = true;
      const r = rbox(2.4, 0.03, 1.6, 0.012, new THREE.MeshStandardMaterial({ map: tt, bumpMap: tt, bumpScale: 1.2, roughness: 1 }), 0, 0.016, 0); r.castShadow = false;
      const uv = r.geometry.attributes.uv, pos = r.geometry.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 1.2) / 2.4, (pos.getZ(i) + 0.8) / 1.6);
      break;
    }
    case 'side_table': {
      const wd = M.wood(C), br = M.brass();
      cyl(0.26, 0.26, 0.035, wd, 0, 0.55, 0, 0, 0, 0, 36); cyl(0.2, 0.2, 0.02, wd, 0, 0.2, 0, 0, 0, 0, 36);
      [0, 2.094, 4.188].forEach(a => leg(0.015, 0.012, 0.55, br, Math.cos(a) * 0.17, Math.sin(a) * 0.17));
      lathe([[0.001, 0], [0.05, 0], [0.06, 0.1], [0.03, 0.2], [0.02, 0.24], [0.001, 0.24]], M.ceramic(0xD7C6A5), 0.08, 0.568, 0.04);
      box(0.16, 0.025, 0.12, M.paint(0x8A3B2E, 0.7), -0.1, 0.58, -0.05, 0, 0.4, 0);
      break;
    }
    case 'dresser': {
      const wd = M.wood(C), wdD = M.wood(_shade(C, -0.07)), br = M.brass();
      rbox(1.3, 0.8, 0.48, 0.015, wd, 0, 0.5, 0); rbox(1.34, 0.03, 0.5, 0.012, M.wood(_shade(C, 0.04)), 0, 0.915, 0);
      [[-0.6, 0.18], [0.6, 0.18], [-0.6, -0.18], [0.6, -0.18]].forEach(p => leg(0.022, 0.014, 0.12, wdD, p[0], p[1]));
      [[-0.33, 0.75], [0.33, 0.75], [-0.33, 0.5], [0.33, 0.5], [-0.33, 0.25], [0.33, 0.25]].forEach(p => { rbox(0.6, 0.22, 0.015, 0.008, wdD, p[0], p[1] + 0.1, 0.245); sph(0.02, br, p[0], p[1] + 0.1, 0.268); });
      lathe([[0.001, 0], [0.06, 0], [0.07, 0.12], [0.04, 0.24], [0.025, 0.3], [0.001, 0.3]], M.ceramic(0xCFE0E6), -0.45, 0.93, 0); box(0.3, 0.2, 0.025, M.brass(), 0.15, 1.05, -0.1, -0.15, 0, 0); box(0.26, 0.16, 0.01, M.mirror(), 0.15, 1.05, -0.083, -0.15, 0, 0);
      break;
    }
    default: box(0.8, 0.8, 0.8, M.wood(C), 0, 0.4, 0);
  }

  // soft contact shadow blob under every piece (adds grounding)
  const bb = new THREE.Box3().setFromObject(g), sz = bb.getSize(new THREE.Vector3()), ct = bb.getCenter(new THREE.Vector3());
  if (type !== 'rug') {
    const k = 'blob'; if (!_TX[k]) { const c = _cv(128, 128), x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 8, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); _TX[k] = new THREE.CanvasTexture(c); }
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 1.25 + 0.2, sz.z * 1.25 + 0.2), new THREE.MeshBasicMaterial({ map: _TX[k], transparent: true, depthWrite: false }));
    bl.rotation.x = -Math.PI / 2; bl.position.set(ct.x, 0.004, ct.z); bl.userData.blob = true; bl.renderOrder = 1; g.add(bl);
  }
  g.userData.size = sz; return g;
}

// ── Dimension lines + labels on the floor edges ──
function buildRoomDims(scene, RW, RD) {
  const mat = new THREE.LineBasicMaterial({ color: 0xC9A96E });
  const line = (a, b) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]); scene.add(new THREE.Line(g, mat)); };
  const y = 0.02, o = 0.35;
  line([-RW / 2, y, RD / 2 + o], [RW / 2, y, RD / 2 + o]); line([-RW / 2, y, RD / 2 + o - 0.12], [-RW / 2, y, RD / 2 + o + 0.12]); line([RW / 2, y, RD / 2 + o - 0.12], [RW / 2, y, RD / 2 + o + 0.12]);
  line([RW / 2 + o, y, -RD / 2], [RW / 2 + o, y, RD / 2]); line([RW / 2 + o - 0.12, y, -RD / 2], [RW / 2 + o + 0.12, y, -RD / 2]); line([RW / 2 + o - 0.12, y, RD / 2], [RW / 2 + o + 0.12, y, RD / 2]);
  const label = (txt, x, z) => {
    const c = _cv(256, 72), g = c.getContext('2d'); g.fillStyle = 'rgba(20,20,28,0.85)'; g.beginPath(); g.roundRect ? g.roundRect(6, 8, 244, 56, 14) : g.rect(6, 8, 244, 56); g.fill();
    g.strokeStyle = '#C9A96E'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#F3E6C8'; g.font = '700 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 37);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    sp.scale.set(2.1, 0.6, 1); sp.position.set(x, 0.25, z); sp.renderOrder = 10; scene.add(sp);
  };
  label(RW.toFixed(1) + ' m', 0, RD / 2 + o + 0.45); label(RD.toFixed(1) + ' m', RW / 2 + o + 0.75, 0);
}

// ── Furnished room: plank floor, skirting, window + curtains, art, lights, environment ──
function buildRoom(scene, renderer, RW, RD) {
  RW = RW || 8; RD = RD || 8; const RH = 3.6, MX = Math.max(RW, RD) / 8;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // image-based lighting from a small studio-style environment
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(30, 20, 30), new THREE.MeshBasicMaterial({ color: 0x8C8578, side: THREE.BackSide })));
  const panel = (w, h, x, y, z, ry, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.y = ry; env.add(m); };
  panel(14, 8, -14, 6, 0, Math.PI / 2, 0xFFFFFF * 1); panel(10, 6, 0, 9.5, 0, 0, 0xFFF3E0); panel(12, 5, 8, 5, 13, Math.PI, 0xDDE8F5);
  env.children.forEach(c => { if (c.material && c.material.color && c.geometry.type === 'PlaneGeometry') c.material.color.multiplyScalar(6); });
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
  scene.background = new THREE.Color(0x14141C);

  // lights
  scene.add(new THREE.HemisphereLight(0xFFF4E4, 0x8A7A66, 0.35));
  const sun = new THREE.DirectionalLight(0xFFF1DC, 1.5); sun.position.set(-6 * MX, 8 * MX + 2, 4 * MX); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
  const sb = Math.max(RW, RD) * 0.9; sun.shadow.camera.left = sun.shadow.camera.bottom = -sb; sun.shadow.camera.right = sun.shadow.camera.top = sb; sun.shadow.camera.far = 40 * MX + 10;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 5; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xD6E4FF, 0.3); fill.position.set(5, 4, -4); scene.add(fill);
  const cl = new THREE.PointLight(0xFFE7C2, 0.5, 14 * MX + 4, 2); cl.position.set(0, 3.3, 0); scene.add(cl);

  // floor: oak planks
  const plank = _tex('floorplank', (x, w, h) => {
    const rows = 8, ph = h / rows; _seed = 5;
    for (let r = 0; r < rows; r++) { let px = -_rnd() * 300; while (px < w) { const pw = 260 + _rnd() * 220, t = 0.86 + _rnd() * 0.2; x.fillStyle = `rgb(${158 * t | 0},${118 * t | 0},${78 * t | 0})`; x.fillRect(px, r * ph, pw, ph);
      for (let i = 0; i < 14; i++) { x.strokeStyle = `rgba(70,40,15,${0.04 + _rnd() * 0.09})`; x.lineWidth = 0.6 + _rnd(); const y = r * ph + _rnd() * ph; x.beginPath(); x.moveTo(px, y); x.bezierCurveTo(px + pw * 0.3, y + (_rnd() - 0.5) * 5, px + pw * 0.7, y + (_rnd() - 0.5) * 5, px + pw, y); x.stroke(); }
      x.fillStyle = 'rgba(30,15,5,0.45)'; x.fillRect(px, r * ph, 1.5, ph); px += pw; }
      x.fillStyle = 'rgba(30,15,5,0.4)'; x.fillRect(0, r * ph, w, 1.5); }
  }, 1024);
  const ft = plank.clone(); ft.repeat.set(RW / 2.4, RD / 2.4); ft.needsUpdate = true;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ map: ft, bumpMap: ft, bumpScale: 0.25, roughness: 0.4, metalness: 0, envMapIntensity: 0.6 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // walls (back, left, right) + ceiling
  const wallTex = _tex('wallpaint', (x, w, h) => { x.fillStyle = '#EFE9DF'; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${_rnd() < 0.5 ? '0,0,0' : '255,255,255'},${_rnd() * 0.04})`; x.fillRect(_rnd() * w, _rnd() * h, 2, 2); } }, 512);
  const wm = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95, envMapIntensity: 0.3 }), wmB = wm.clone(); wmB.color = new THREE.Color(0xF6F0E4);
  const wall = (w, x, y, z, ry, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, RH), mat || wm); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  wall(RW, 0, RH / 2, -RD / 2, 0, wmB); wall(RD, -RW / 2, RH / 2, 0, Math.PI / 2); wall(RD, RW / 2, RH / 2, 0, -Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), new THREE.MeshStandardMaterial({ color: 0xFAF7F0, roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; scene.add(ceil);

  // skirting + crown
  const trim = new THREE.MeshStandardMaterial({ color: 0xFBF9F4, roughness: 0.5 });
  const bar = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim); m.position.set(x, y, z); m.castShadow = y < 1; m.receiveShadow = true; scene.add(m); };
  bar(RW, 0.14, 0.03, 0, 0.07, -RD / 2 + 0.015); bar(0.03, 0.14, RD, -RW / 2 + 0.015, 0.07, 0); bar(0.03, 0.14, RD, RW / 2 - 0.015, 0.07, 0);
  bar(RW, 0.1, 0.06, 0, RH - 0.05, -RD / 2 + 0.03); bar(0.06, 0.1, RD, -RW / 2 + 0.03, RH - 0.05, 0); bar(0.06, 0.1, RD, RW / 2 - 0.03, RH - 0.05, 0);

  // window on the back wall with sheer curtains
  const wx = 0, wy = 1.9, ww = Math.min(2.2, RW * 0.4), wh = 1.7, wz = -RD / 2;
  const sky = _tex('sky', (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9CC7F0'); gr.addColorStop(1, '#F6FAFF'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 7; i++) { x.beginPath(); x.ellipse(_rnd() * w, 80 + _rnd() * 200, 70 + _rnd() * 60, 22, 0, 0, 6.3); x.fill(); } });
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), new THREE.MeshBasicMaterial({ map: sky })); pane.material.map = sky.clone(); pane.material.map.repeat.set(1, 1); pane.material.map.needsUpdate = true; pane.position.set(wx, wy, wz + 0.012); scene.add(pane);
  const fr = (w, h, x, y) => bar(w, h, 0.09, wx + x, wy + y, wz + 0.045);
  fr(ww + 0.16, 0.08, 0, wh / 2 + 0.04); fr(ww + 0.16, 0.08, 0, -wh / 2 - 0.04); fr(0.08, wh, -ww / 2 - 0.04, 0); fr(0.08, wh, ww / 2 + 0.04, 0); fr(0.05, wh, 0, 0); fr(ww, 0.05, 0, 0);
  bar(ww + 0.4, 0.05, 0.2, wx, wy - wh / 2 - 0.1, wz + 0.1);
  const sheer = new THREE.MeshStandardMaterial({ color: 0xF3EEE4, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  [-1, 1].forEach(s => { const gm = new THREE.PlaneGeometry(0.7, 2.55, 28, 1), p = gm.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 22) * 0.045); gm.computeVertexNormals();
    const c = new THREE.Mesh(gm, sheer); c.position.set(wx + s * (ww / 2 + 0.38), 1.95, wz + 0.2); c.castShadow = true; scene.add(c); });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, ww + 1.7, 12), M.brass()); rod.rotation.z = Math.PI / 2; rod.position.set(wx, 3.27, wz + 0.2); scene.add(rod);

  // framed art on the side walls
  const art = (hex, h2, w, h, x, y, z, ry) => {
    const t = _tex('art' + hex, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, cw, ch); gr.addColorStop(0, _col(hex)); gr.addColorStop(1, _col(h2)); c.fillStyle = gr; c.fillRect(0, 0, cw, ch); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(cw * 0.65, ch * 0.35, 70, 0, 6.3); c.fill(); c.fillStyle = 'rgba(30,40,50,0.35)'; c.beginPath(); c.moveTo(0, ch); c.lineTo(cw * 0.35, ch * 0.45); c.lineTo(cw * 0.7, ch); c.fill(); });
    const g2 = new THREE.Group(); g2.position.set(x, y, z); g2.rotation.y = ry; scene.add(g2);
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.04), M.wood(0x3A2616)); f.castShadow = true; g2.add(f);
    const pm2 = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t.clone(), roughness: 0.6 })); pm2.material.map.repeat.set(1, 1); pm2.material.map.needsUpdate = true; pm2.position.z = 0.022; g2.add(pm2);
  };
  const as = Math.min(1, RD / 6.5);
  art(0x3E6B8F, 0xE4C58A, 1.2 * as, 0.8 * as, -RW / 2 + 0.03, 1.9, -RD * 0.18, Math.PI / 2); if (RD > 4.2) art(0x7A5C8F, 0xF0B8A0, 0.8 * as, 1.1 * as, -RW / 2 + 0.03, 1.8, RD * 0.2, Math.PI / 2);
  art(0x4F8F6E, 0xF2E3B0, 1.4 * as, 0.9 * as, RW / 2 - 0.03, 1.9, RD * 0.03, -Math.PI / 2);
  buildRoomDims(scene, RW, RD);

}

function _initRoomScene(canvasId, savedLayout, onSave, room){
  room = room || { w: 8, d: 8, id: 'room', name: 'Room' };
  const BX = Math.max(1, room.w / 2 - 0.35), BZ = Math.max(1, room.d / 2 - 0.35);
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  if(_fScenes[canvasId]){
    _fScenes[canvasId].dispose();
    delete _fScenes[canvasId];
  }

  savedLayout = savedLayout||{};
  const W=canvas.clientWidth||800, H=canvas.clientHeight||550;

  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0x14141C,1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42,W/H,0.1,80);
  camera.position.set(0,9,10);
  camera.lookAt(0,0,0);
  buildRoom(scene, renderer, room.w, room.d);

  // ── Catalog ──
  const CATALOG=[
    {id:'sofa',         label:'Sofa',          color:0x5D5A7E, icon:'🛋️'},
    {id:'armchair',     label:'Armchair',      color:0x7B4F3A, icon:'🪑'},
    {id:'bed_double',   label:'Double Bed',    color:0x7B4F2A, icon:'🛏️'},
    {id:'bed_single',   label:'Single Bed',    color:0x7A8B6E, icon:'🛏️'},
    {id:'dining_table', label:'Dining Table',  color:0xA0734A, icon:'🍽️'},
    {id:'dining_chair', label:'Dining Chair',  color:0xA0734A, icon:'🪑'},
    {id:'chair',        label:'Chair',         color:0x8B6040, icon:'🪑'},
    {id:'wardrobe',     label:'Wardrobe',      color:0x9B7B5A, icon:'🚪'},
    {id:'tv_unit',      label:'TV Unit',       color:0x4A3A2A, icon:'📺'},
    {id:'bookshelf',    label:'Bookshelf',     color:0x8B6A3A, icon:'📚'},
    {id:'coffee_table', label:'Coffee Table',  color:0xA08060, icon:'☕'},
    {id:'lamp',         label:'Floor Lamp',    color:0xC0A060, icon:'💡'},
    {id:'plant',        label:'Indoor Plant',  color:0x3A6A40, icon:'🪴'},
    {id:'mirror',       label:'Mirror',        color:0xC8A060, icon:'🪞'},
    {id:'desk',         label:'Desk',          color:0x9B7A4A, icon:'🖥️'},
    {id:'rug',          label:'Rug',           color:0x7C8A9E, icon:'🟫'},
    {id:'side_table',   label:'Side Table',    color:0x9B7B5A, icon:'🔘'},
    {id:'dresser',      label:'Dresser',       color:0x8B6A4A, icon:'🗄️'},
  ];

  // ── Placed items ──
  const placed=[];

  Object.entries(savedLayout).forEach(([key,data])=>{
    if(!data) return;
    const cat=CATALOG.find(c=>c.id===key); if(!cat) return;
    const items=Array.isArray(data)?data:[data];
    items.forEach(item=>{
      if(item.visible===false) return;
      const mesh=buildFurniture(scene,cat.id,cat.color);
      mesh.position.set(Math.max(-BX,Math.min(BX,item.x||0)),0,Math.max(-BZ,Math.min(BZ,item.z||0)));
      mesh.rotation.y=item.rotY||0;
      scene.add(mesh);
      placed.push({mesh,type:cat.id,id:key+'_'+Date.now(),rotY:item.rotY||0});
    });
  });

  { const rp0=document.getElementById(canvasId==='c3d-tfurn' ? 'tfurn-action-panel' : 'furn-action-panel'); if(rp0) rp0.style.display='none'; }
  // ── Interaction ──
  const raycaster=new THREE.Raycaster();
  const mouse=new THREE.Vector2();
  let dragging=null, dragOffset=new THREE.Vector3();
  let selected=null;
  let orbitDragging=false, orbitPrev={x:0,y:0};
  let camTheta=0.48, camPhi=0.72, camDist=Math.max(room.w,room.d)*1.35+3; const camMax=camDist*1.5;

  function updateCamera(){
    camera.position.x=camDist*Math.sin(camPhi)*Math.sin(camTheta);
    camera.position.y=camDist*Math.cos(camTheta);
    camera.position.z=camDist*Math.sin(camPhi)*Math.cos(camTheta);
    camera.lookAt(0,0.5,0);
  }
  updateCamera();

  function getWorldXZ(e){
    const rect=canvas.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const pt=new THREE.Vector3();
    raycaster.ray.intersectPlane(plane,pt);
    return pt;
  }

  function selectObj(obj){
    if(selected){
      selected.mesh.traverse(m=>{
        if(m.isMesh&&m.material.emissive) m.material.emissive.setHex((m.material.userData&&m.material.userData.em)||0);
      });
    }
    selected=obj;
    if(selected){
      selected.mesh.traverse(m=>{
        if(m.isMesh&&m.material.emissive&&!m.userData.blob) m.material.emissive.setHex(0x2A2000);
      });
    }
    const panelId=canvasId==='c3d-tfurn'
      ? 'tfurn-action-panel'
      : canvasId==='c3d-lfurnpage' ? 'lfurn-controls'
      : canvasId==='c3d-furnpage' ? 'furn-page-controls' : 'furn-action-panel';
    const rp=document.getElementById(panelId);
    if(rp) rp.style.display=selected?'flex':'none';
  }

  function onMouseDown(e){
    if(e.button===2){orbitDragging=true;orbitPrev={x:e.clientX,y:e.clientY};return;}
    const rect=canvas.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const allM=[];
    placed.forEach(p=>p.mesh.traverse(m=>{if(m.isMesh&&!m.userData.blob)allM.push(m);}));
    const hits=raycaster.intersectObjects(allM);
    if(hits.length){
      let found=null;
      for(const p of placed){
        let inside=false;
        p.mesh.traverse(m=>{if(m===hits[0].object)inside=true;});
        if(inside){found=p;break;}
      }
      if(found){
        selectObj(found); dragging=found;
        const wp=getWorldXZ(e);
        if(wp) dragOffset.copy(found.mesh.position).sub(wp);
      }
    } else { selectObj(null); }
  }
  canvas.addEventListener('mousedown',onMouseDown);

  function onMouseMove(e){
    if(orbitDragging){
      camPhi  +=(e.clientX-orbitPrev.x)*0.004;
      camTheta=Math.max(0.15,Math.min(1.45,camTheta+(e.clientY-orbitPrev.y)*0.004));
      orbitPrev={x:e.clientX,y:e.clientY};
      updateCamera(); return;
    }
    if(!dragging) return;
    const wp=getWorldXZ(e);
    if(!wp) return;
    dragging.mesh.position.set(
      Math.max(-BX,Math.min(BX,wp.x+dragOffset.x)),0,
      Math.max(-BZ,Math.min(BZ,wp.z+dragOffset.z))
    );
  }
  window.addEventListener('mousemove',onMouseMove);

  function onMouseUp(e){
    if(e.button===2){orbitDragging=false;return;}
    dragging=null;
  }
  window.addEventListener('mouseup',onMouseUp);

  function onWheel(e){
    camDist=Math.max(3,Math.min(camMax,camDist+e.deltaY*0.018));
    updateCamera(); e.preventDefault();
  }
  canvas.addEventListener('wheel',onWheel,{passive:false});
  function onContextMenu(e){e.preventDefault();}
  canvas.addEventListener('contextmenu',onContextMenu);

  // ── Public API ──
  function addFurniture(type,colorHex){
    const cat=CATALOG.find(c=>c.id===type);
    const color=colorHex||cat?.color||0x888888;
    const mesh=buildFurniture(scene,type,color);
    mesh.position.set((Math.random()-0.5)*Math.min(3,BX*1.2),0,(Math.random()-0.5)*Math.min(3,BZ*1.2));
    scene.add(mesh);
    const item={mesh,type,id:type+'_'+Date.now(),rotY:0};
    placed.push(item);
    selectObj(item);
  }

  function rotateSelected(deg){
    if(!selected) return;
    selected.rotY+=deg*Math.PI/180;
    selected.mesh.rotation.y=selected.rotY;
  }

  function deleteSelected(){
    if(!selected) return;
    scene.remove(selected.mesh);
    placed.splice(placed.indexOf(selected),1);
    selectObj(null);
  }

  function getLayout(){
    const layout={};
    placed.forEach(p=>{
      if(!layout[p.type]) layout[p.type]=[];
      layout[p.type].push({
        x:Math.round(p.mesh.position.x*100)/100,
        z:Math.round(p.mesh.position.z*100)/100,
        rotY:Math.round(p.rotY*100)/100,
        visible:true
      });
    });
    return layout;
  }

  let _dead=false;
  function animate(){
    if(_dead) return;
    animationFrameId=requestAnimationFrame(animate);
    renderer.render(scene,camera);
  }
  let animationFrameId=requestAnimationFrame(animate);

  const ro=new ResizeObserver(()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h) return;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvas);

  function destroy(){
    if(_dead) return;
    _dead=true;
    cancelAnimationFrame(animationFrameId);
    ro.disconnect();
    canvas.removeEventListener('mousedown',onMouseDown);
    canvas.removeEventListener('wheel',onWheel);
    canvas.removeEventListener('contextmenu',onContextMenu);
    window.removeEventListener('mousemove',onMouseMove);
    window.removeEventListener('mouseup',onMouseUp);
    renderer.dispose();
  }
  const api={renderer,scene,camera,placed,CATALOG,room,
    addFurniture,rotateSelected,deleteSelected,getLayout,updateCamera,
    destroy,dispose:destroy};
  _fScenes[canvasId]=api;
  return api;
}

function getFurnitureScene(canvasId){return _fScenes[canvasId];}

// ── Download layout as PNG screenshot ───────────────────────
function downloadFurnitureScreenshot(canvasId, filename) {
  const sc = _fScenes[canvasId];
  if (!sc) return;
  // render one more frame
  sc.renderer.render(sc.scene, sc.camera);
  const dataURL = sc.renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = (filename || 'furniture-layout') + '.png';
  a.click();
}

// ── Download layout as JSON ──────────────────────────────────
function downloadFurnitureJSON(canvasId, propTitle, role) {
  const sc = _fScenes[canvasId];
  if (!sc) return;
  const layout = sc.getLayout();
  const blob = new Blob([JSON.stringify({
    property: propTitle || 'Property',
    role: role || 'layout',
    savedAt: new Date().toISOString(),
    furniture: layout
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (propTitle || 'furniture').replace(/\s+/g,'-').toLowerCase() + '-' + (role||'layout') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ════════════════════════════════════════════════════════════
//  ROOM-WISE LAYOUTS
//  Each room of the house gets its own correctly sized 3D room
//  and its own saved furniture layout.
//  Sizes come from property.model3d.rooms [{id,name,w,d}] (metres)
//  when the landlord has set them, otherwise they are derived from
//  the property's area (sqft), bedrooms and type.
// ════════════════════════════════════════════════════════════
const _SQM = 0.0929;
function _furnPropFor(canvasId) {
  try {
    const g = (n) => (typeof window[n] !== 'undefined' ? window[n] : undefined);
    if (canvasId === 'c3d-furn' && g('_furnProp')) return g('_furnProp');
    let id = null, maps = [];
    if (canvasId === 'c3d-tfurn') { id = g('_tFurnPropId'); maps = [g('_tenantPropMap')]; }
    else if (canvasId === 'c3d-furnpage') { try { id = _furnPagePropId; } catch (e) { id = g('_furnPagePropId'); } maps = [g('_tenantPropMap')]; }
    else if (canvasId === 'c3d-lfurnpage') { try { id = _lFurnPropId; } catch (e) { id = g('_lFurnPropId'); } maps = [g('_propMap')]; const mp = g('_myProperties'); if (Array.isArray(mp)) maps.push(Object.fromEntries(mp.map(x => [x._id, x]))); }
    for (const m of maps) if (m && id && m[id]) return m[id];
  } catch (e) {}
  return null;
}
function _roomsFor(p) {
  const custom = p && p.model3d && Array.isArray(p.model3d.rooms) ? p.model3d.rooms.filter(r => +r.w > 1 && +r.d > 1) : [];
  if (custom.length) return custom.map((r, i) => ({ id: r.id || ('r' + i), name: r.name || ('Room ' + (i + 1)), w: +r.w, d: +r.d, custom: true }));
  const type = (p && p.type) || 'House', beds = Math.max(0, Math.round(+(p && p.beds) || 2));
  const sqft = +(p && p.sqft) || (beds * 450 + 500);
  const usable = sqft * _SQM * 0.78;
  const defs = [];
  if (type === 'Room') defs.push({ id: 'room', name: 'Room', wt: 1, asp: 1.25 });
  else {
    defs.push({ id: 'living', name: 'Living Room', wt: 1.7, asp: 1.3 });
    defs.push({ id: 'dining', name: 'Dining Area', wt: 1.0, asp: 1.15 });
    if (beds >= 1) defs.push({ id: 'master', name: beds > 1 ? 'Master Bedroom' : 'Bedroom', wt: 1.35, asp: 1.2 });
    for (let i = 2; i <= Math.min(beds, 6); i++) defs.push({ id: 'bed' + i, name: 'Bedroom ' + i, wt: 1.0, asp: 1.1 });
    if (beds >= 4) defs.push({ id: 'study', name: 'Study', wt: 0.7, asp: 1.2 });
  }
  const tot = defs.reduce((a, d) => a + d.wt, 0), cl = (v) => Math.max(2.8, Math.min(9, v));
  return defs.map(d => { const A = usable * d.wt / tot, w = cl(Math.sqrt(A * d.asp)), dd = cl(A / Math.sqrt(A * d.asp)); return { id: d.id, name: d.name, w: Math.round(w * 10) / 10, d: Math.round(dd * 10) / 10 }; });
}
function _splitLayout(saved, rooms) {
  const out = {};
  if (saved && saved.__v === 2 && saved.rooms) { rooms.forEach(r => { if (saved.rooms[r.id]) out[r.id] = saved.rooms[r.id]; }); return out; }
  if (saved && Object.keys(saved).filter(k => k !== '__v').length) out[rooms[0].id] = saved;   // legacy single-room layout
  return out;
}

function initFurniturePlacement(canvasId, savedLayout, onSave) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const prev = _fScenes[canvasId];
  if (prev) { try { prev.destroy && prev.destroy(); } catch (e) {} try { prev.renderer.dispose(); } catch (e) {} delete _fScenes[canvasId]; }
  const parent = canvas.parentElement;
  const old = parent.querySelector('.furn-rooms'); if (old) old.remove();

  const prop = _furnPropFor(canvasId), rooms = _roomsFor(prop);
  const st = { rooms, layouts: _splitLayout(savedLayout, rooms), cur: null, inner: null };
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';

  const bar = document.createElement('div'); bar.className = 'furn-rooms';
  bar.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;z-index:6;display:flex;gap:8px;flex-wrap:wrap;pointer-events:none;font-family:"DM Sans",system-ui,sans-serif';
  parent.appendChild(bar);

  const facade = {
    get renderer() { return st.inner.renderer; }, get scene() { return st.inner.scene; }, get camera() { return st.inner.camera; },
    get placed() { return st.inner.placed; }, get CATALOG() { return st.inner.CATALOG; }, get room() { return st.inner.room; }, rooms, st,
    addFurniture: (t, c) => st.inner.addFurniture(t, c), rotateSelected: (d) => st.inner.rotateSelected(d), deleteSelected: () => st.inner.deleteSelected(),
    updateCamera: () => st.inner.updateCamera(), destroy: () => { st.inner.destroy(); bar.remove(); },
    switchRoom: (id) => open(id),
    getLayout() {
      if (st.inner) st.layouts[st.cur] = st.inner.getLayout();
      const rm = {}; Object.entries(st.layouts).forEach(([k, v]) => { if (v && Object.keys(v).length) rm[k] = v; });
      return Object.keys(rm).length ? { __v: 2, rooms: rm } : {};
    },
  };

  function paint() {
    bar.innerHTML = '';
    rooms.forEach(r => {
      const n = Object.values(st.layouts[r.id] || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 1), 0);
      const b = document.createElement('button'); b.type = 'button'; const on = r.id === st.cur;
      b.style.cssText = 'pointer-events:auto;cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:7px 13px;border-radius:12px;font-family:inherit;border:1.5px solid ' + (on ? '#C9A96E' : 'rgba(255,255,255,0.18)') + ';background:' + (on ? 'rgba(201,169,110,0.95)' : 'rgba(20,20,28,0.78)') + ';color:' + (on ? '#1A1408' : '#F3E6C8') + ';backdrop-filter:blur(6px);box-shadow:0 4px 14px rgba(0,0,0,0.3)';
      b.innerHTML = '<span style="font-weight:700;font-size:13px">' + r.name + (n ? ' \u00B7 ' + n : '') + '</span><span style="font-size:11px;opacity:.8">' + r.w.toFixed(1) + ' \u00D7 ' + r.d.toFixed(1) + ' m \u00B7 ' + Math.round(r.w * r.d) + ' m\u00B2</span>';
      b.onclick = () => open(r.id); bar.appendChild(b);
    });
  }
  function open(id) {
    if (st.inner) { st.layouts[st.cur] = st.inner.getLayout(); st.inner.destroy(); try { st.inner.renderer.dispose(); } catch (e) {} delete _fScenes[canvasId];
      const c2 = canvas.cloneNode(false); canvas.parentNode.replaceChild(c2, canvas); canvas = c2; }
    st.cur = id; const room = rooms.find(r => r.id === id) || rooms[0];
    st.inner = _initRoomScene(canvasId, st.layouts[id] || {}, onSave, room);
    _fScenes[canvasId] = facade; paint();
  }
  open(rooms[0].id);
  return facade;
}
