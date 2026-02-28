/* ============================================
   Tenant Management System — 3D House Engine
   File: js/house3d.js  (Three.js r128)
   Supports: mini thumbnail previews + full interactive modal
   ============================================ */

const _scenes = {};

function initHouse3D(canvasId, key) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || _scenes[key]) return;

  const isMini = key.startsWith('mini-');

  const W = canvas.offsetWidth  || (isMini ? 320 : 600);
  const H = canvas.offsetHeight || (isMini ? 180 : 400);

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMini, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(isMini ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isMini;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080B12, 0);

  // ── Scene ──
  const scene = new THREE.Scene();
  if (!isMini) scene.fog = new THREE.FogExp2(0x080B12, 0.032);

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);

  // ── Lights ──
  const ambient = new THREE.AmbientLight(0xffffff, isMini ? 0.7 : 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFF5D6, isMini ? 1.0 : 1.2);
  sun.position.set(8, 12, 6);
  if (!isMini) {
    sun.castShadow = true;
    sun.shadow.mapSize.width  = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
    sun.shadow.camera.right = sun.shadow.camera.top = 10;
  }
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x4A9EFF, 0.3);
  fill.position.set(-5, 3, -5);
  scene.add(fill);

  // ── Color theme: landlord (gold) vs tenant (blue) vs mini ──
  const isLandlord = ['ll','ll-full','modal'].includes(key);
  const wallColor  = isLandlord ? 0xD4B483 : 0x5B8FCC;
  const roofColor  = isLandlord ? 0x8B5A2B : 0x2A4A7A;
  const accentColor= isLandlord ? 0xC9A96E : 0x4A9EFF;

  const wallMat   = new THREE.MeshLambertMaterial({ color: wallColor });
  const roofMat   = new THREE.MeshLambertMaterial({ color: roofColor });
  const winMat    = new THREE.MeshLambertMaterial({ color: accentColor, transparent: true, opacity: 0.75 });
  const doorMat   = new THREE.MeshLambertMaterial({ color: 0x5C3B1A });
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x1A2F1A });
  const chimMat   = new THREE.MeshLambertMaterial({ color: isLandlord ? 0x7A4F2A : 0x3A5A8A });

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = !isMini; m.receiveShadow = !isMini;
    scene.add(m); return m;
  }

  // ── Ground ──
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !isMini;
  scene.add(ground);

  // ── House Body ──
  box(4, 2.4, 3.2, wallMat, 0, 1.2, 0);

  // ── Roof ──
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 4), roofMat);
  roof.position.set(0, 2.4 + 0.7, 0); roof.rotation.y = Math.PI / 4;
  roof.castShadow = !isMini; scene.add(roof);

  // ── Chimney ──
  box(0.4, 1.0, 0.4, chimMat, 0.8, 3.2, 0.5);

  // ── Door ──
  box(0.7, 1.2, 0.08, doorMat, 0, 0.6, 1.64);
  box(0.8, 1.3, 0.06, new THREE.MeshLambertMaterial({ color: 0x3A2510 }), 0, 0.65, 1.65);

  // ── Windows ──
  box(0.7, 0.6, 0.08, winMat,  1.3, 1.4, 1.64);
  box(0.7, 0.6, 0.08, winMat, -1.3, 1.4, 1.64);
  box(0.08, 0.6, 0.7, winMat,  2.04, 1.4,  0.6);
  box(0.08, 0.6, 0.7, winMat,  2.04, 1.4, -0.6);

  // ── Porch ──
  box(1.4, 0.15, 0.6, new THREE.MeshLambertMaterial({ color: 0x8B7355 }), 0, 0.075, 1.95);

  // ── Path ──
  box(0.5, 0.05, 2.5, new THREE.MeshLambertMaterial({ color: 0x6B6050 }), 0, 0.025, 3.2);

  // ── Trees ──
  function tree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x5C3B1A }));
    trunk.position.set(x, 0.4, z); trunk.castShadow = !isMini; scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 7, 7), new THREE.MeshLambertMaterial({ color: 0x2D6A3F }));
    leaves.position.set(x, 1.1, z); leaves.castShadow = !isMini; scene.add(leaves);
  }
  tree(-2.5, 1.5); tree(2.5, 1.5);
  if (!isMini) { tree(-2.8, -0.5); tree(2.8, -0.5); }

  // ── Fence (only for full view) ──
  if (!isMini) {
    for (let i = -2.5; i <= 2.5; i += 0.5) {
      box(0.06, 0.5, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), i, 0.25, 2.6);
    }
    box(3.06, 0.06, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), -0.5, 0.42, 2.6);
    box(3.06, 0.06, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), -0.5, 0.14, 2.6);
  }

  // ── Stars (only full view) ──
  if (!isMini) {
    const sg = new THREE.BufferGeometry();
    const sv = [];
    for (let i = 0; i < 300; i++) sv.push((Math.random()-0.5)*60, (Math.random()*20)+2, (Math.random()-0.5)*60);
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5 }));
    scene.add(stars);
    _scenes._stars = _scenes._stars || {};
    _scenes._stars[key] = stars;
  }

  // ── Camera state ──
  let rotX = isMini ? 0.28 : 0.3;
  let rotY = isMini ? 0.6  : 0.5;
  let zoom = isMini ? 11   : 10;
  let isDragging = false, prevX = 0, prevY = 0;
  let autoRotate = true;

  function updateCamera() {
    camera.position.x = Math.sin(rotY) * Math.cos(rotX) * zoom;
    camera.position.y = Math.sin(rotX) * zoom + 2;
    camera.position.z = Math.cos(rotY) * Math.cos(rotX) * zoom;
    camera.lookAt(0, 1.5, 0);
  }
  updateCamera();

  // ── Interaction (only for full view / modal) ──
  if (!isMini) {
    canvas.addEventListener('mousedown', e => { isDragging = true; autoRotate = false; prevX = e.clientX; prevY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      rotY += (e.clientX - prevX) * 0.008;
      rotX = Math.max(-0.4, Math.min(1.2, rotX + (e.clientY - prevY) * 0.008));
      prevX = e.clientX; prevY = e.clientY;
      updateCamera();
    });
    canvas.addEventListener('touchstart', e => { isDragging = true; autoRotate = false; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', e => {
      if (!isDragging) return;
      rotY += (e.touches[0].clientX - prevX) * 0.008;
      rotX = Math.max(-0.4, Math.min(1.2, rotX + (e.touches[0].clientY - prevY) * 0.008));
      prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
      updateCamera();
    }, { passive: true });
    canvas.addEventListener('wheel', e => {
      zoom = Math.max(4, Math.min(20, zoom + e.deltaY * 0.02));
      updateCamera(); e.preventDefault();
    }, { passive: false });
  }

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvas);

  // ── Animate ──
  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) { rotY += isMini ? 0.005 : 0.003; updateCamera(); }
    renderer.render(scene, camera);
  }
  animate();

  // ── Store ──
  _scenes[key] = {
    renderer, scene, camera, sun, ambient, fill, updateCamera,
    get rotX() { return rotX; }, set rotX(v) { rotX = v; },
    get rotY() { return rotY; }, set rotY(v) { rotY = v; },
    get zoom()  { return zoom;  }, set zoom(v)  { zoom = v;  },
    get isNight() { return _scenes[key]._isNight || false; },
    set isNight(v) { _scenes[key]._isNight = v; }
  };
}

// ── Controls ─────────────────────────────────
function resetCamera3D(key) {
  const s = _scenes[key]; if (!s) return;
  s.rotX = 0.3; s.rotY = 0.5; s.zoom = 10;
  s.updateCamera();
}

function toggleWireframe(key) {
  const s = _scenes[key]; if (!s) return;
  s.scene.traverse(obj => { if (obj.isMesh) obj.material.wireframe = !obj.material.wireframe; });
}

function rotateFront(key) { const s = _scenes[key]; if(!s) return; s.rotX=0.1; s.rotY=0; s.updateCamera(); }
function rotateSide(key)  { const s = _scenes[key]; if(!s) return; s.rotX=0.15; s.rotY=Math.PI/2; s.updateCamera(); }
function rotateTop(key)   { const s = _scenes[key]; if(!s) return; s.rotX=1.1; s.rotY=0; s.updateCamera(); }

function zoomIn(key)  { const s = _scenes[key]; if(!s) return; s.zoom = Math.max(4, s.zoom-1.5); s.updateCamera(); }
function zoomOut(key) { const s = _scenes[key]; if(!s) return; s.zoom = Math.min(20, s.zoom+1.5); s.updateCamera(); }

function toggleDayNight() {
  Object.keys(_scenes).forEach(key => {
    const s = _scenes[key]; if (!s || !s.sun) return;
    s.isNight = !s.isNight;
    if (s.isNight) {
      s.sun.intensity = 0.15; s.ambient.intensity = 0.12;
      s.fill.color.setHex(0x2233AA); s.fill.intensity = 0.8;
    } else {
      s.sun.intensity = 1.2; s.ambient.intensity = 0.5;
      s.fill.color.setHex(0x4A9EFF); s.fill.intensity = 0.3;
    }
  });
}
