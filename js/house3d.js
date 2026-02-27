/* ============================================
   Tenant Management System — 3D House Engine
   File: js/house3d.js  (uses Three.js r128)
   ============================================ */

const _scenes = {};

function initHouse3D(canvasId, key) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || _scenes[key]) return;

  const W = canvas.clientWidth  || canvas.offsetWidth  || 600;
  const H = canvas.clientHeight || canvas.offsetHeight || 320;

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080B10, 0);

  // ── Scene ──
  const scene = new THREE.Scene();
  scene.fog   = new THREE.FogExp2(0x080B10, 0.035);

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
  camera.position.set(6, 5, 8);
  camera.lookAt(0, 1, 0);

  // ── Lights ──
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xFFF5D6, 1.2);
  sun.position.set(8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 50;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
  sun.shadow.camera.right = sun.shadow.camera.top = 10;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x4A9EFF, 0.3);
  fill.position.set(-5, 3, -5);
  scene.add(fill);

  // ── Materials ──
  const isLandlord = ['ll','ll-full','modal'].includes(key);
  const wallColor  = isLandlord ? 0xD4B483 : 0x5B8FCC;
  const roofColor  = isLandlord ? 0x8B5A2B : 0x2A4A7A;
  const accentColor= isLandlord ? 0xC9A96E : 0x4A9EFF;

  const wallMat  = new THREE.MeshLambertMaterial({ color: wallColor });
  const roofMat  = new THREE.MeshLambertMaterial({ color: roofColor });
  const winMat   = new THREE.MeshLambertMaterial({ color: accentColor, transparent: true, opacity: 0.7 });
  const doorMat  = new THREE.MeshLambertMaterial({ color: 0x5C3B1A });
  const groundMat= new THREE.MeshLambertMaterial({ color: 0x1A2F1A });
  const chimMat  = new THREE.MeshLambertMaterial({ color: isLandlord ? 0x7A4F2A : 0x3A5A8A });

  // ── Ground ──
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Helper
  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  // ── Main House Body ──
  box(4, 2.4, 3.2, wallMat, 0, 1.2, 0);

  // ── Roof (prism via scaled box) ──
  const roofGeo = new THREE.ConeGeometry(3.2, 1.4, 4);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 2.4 + 0.7, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  // ── Chimney ──
  box(0.4, 1.0, 0.4, chimMat, 0.8, 3.2, 0.5);

  // ── Door ──
  box(0.7, 1.2, 0.08, doorMat, 0, 0.6, 1.64);
  // Door frame
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x3A2510 });
  box(0.8, 1.3, 0.06, frameMat, 0, 0.65, 1.65);

  // ── Windows (front) ──
  box(0.7, 0.6, 0.08, winMat,  1.3, 1.4, 1.64);
  box(0.7, 0.6, 0.08, winMat, -1.3, 1.4, 1.64);
  // Windows (side)
  box(0.08, 0.6, 0.7, winMat,  2.04, 1.4,  0.6);
  box(0.08, 0.6, 0.7, winMat,  2.04, 1.4, -0.6);

  // ── Porch / Step ──
  box(1.4, 0.15, 0.6, new THREE.MeshLambertMaterial({ color: 0x8B7355 }), 0, 0.075, 1.95);

  // ── Garden path ──
  box(0.5, 0.05, 2.5, new THREE.MeshLambertMaterial({ color: 0x6B6050 }), 0, 0.025, 3.2);

  // ── Decorative trees ──
  function tree(x, z) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), new THREE.MeshLambertMaterial({ color: 0x5C3B1A }));
    trunk.position.set(x, 0.4, z); trunk.castShadow = true; scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshLambertMaterial({ color: 0x2D6A3F }));
    leaves.position.set(x, 1.1, z); leaves.castShadow = true; scene.add(leaves);
  }
  tree(-2.5, 1.5); tree(2.5, 1.5); tree(-2.8, -0.5); tree(2.8, -0.5);

  // ── Fence ──
  for (let i = -2.5; i <= 2.5; i += 0.5) {
    box(0.06, 0.5, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), i, 0.25, 2.6);
  }
  box(3.06, 0.06, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), -0.5, 0.42, 2.6);
  box(3.06, 0.06, 0.06, new THREE.MeshLambertMaterial({ color: 0x888070 }), -0.5, 0.14, 2.6);

  // ── Stars / Particle BG ──
  const starGeo = new THREE.BufferGeometry();
  const starVerts = [];
  for (let i = 0; i < 300; i++) {
    starVerts.push((Math.random() - 0.5) * 60, (Math.random() * 20) + 2, (Math.random() - 0.5) * 60);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6 }));
  scene.add(stars);

  // ── State ──
  let isDragging  = false;
  let prevX = 0, prevY = 0;
  let rotX = 0.3, rotY = 0.5;
  let zoomLevel = 10;
  let isWireframe = false;
  let isNight = false;

  // ── Group all meshes ──
  const houseGroup = new THREE.Group();
  scene.children.filter(c => c instanceof THREE.Mesh || c instanceof THREE.Points).forEach(c => {
    scene.remove(c); houseGroup.add(c);
  });
  scene.add(houseGroup);

  function updateCamera() {
    camera.position.x = Math.sin(rotY) * Math.cos(rotX) * zoomLevel;
    camera.position.y = Math.sin(rotX) * zoomLevel + 2;
    camera.position.z = Math.cos(rotY) * Math.cos(rotX) * zoomLevel;
    camera.lookAt(0, 1.5, 0);
  }
  updateCamera();

  // ── Mouse drag ──
  canvas.addEventListener('mousedown', e => { isDragging = true; prevX = e.clientX; prevY = e.clientY; });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    rotY += (e.clientX - prevX) * 0.008;
    rotX += (e.clientY - prevY) * 0.008;
    rotX = Math.max(-0.4, Math.min(1.2, rotX));
    prevX = e.clientX; prevY = e.clientY;
    updateCamera();
  });

  // ── Touch drag ──
  canvas.addEventListener('touchstart', e => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY; }, { passive: true });
  canvas.addEventListener('touchend', () => { isDragging = false; });
  canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    rotY += (e.touches[0].clientX - prevX) * 0.008;
    rotX += (e.touches[0].clientY - prevY) * 0.008;
    rotX = Math.max(-0.4, Math.min(1.2, rotX));
    prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
    updateCamera();
  }, { passive: true });

  // ── Scroll zoom ──
  canvas.addEventListener('wheel', e => {
    zoomLevel += e.deltaY * 0.02;
    zoomLevel = Math.max(4, Math.min(20, zoomLevel));
    updateCamera();
    e.preventDefault();
  }, { passive: false });

  // ── Animate ──
  let autoRotate = true;
  canvas.addEventListener('mousedown', () => { autoRotate = false; });

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) { rotY += 0.003; updateCamera(); }
    stars.rotation.y += 0.0002;
    renderer.render(scene, camera);
  }
  animate();

  // ── Resize ──
  const resizeObs = new ResizeObserver(() => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObs.observe(canvas);

  // ── Store ──
  _scenes[key] = { renderer, scene, camera, houseGroup, sun, ambient, fill, updateCamera,
                   get rotX() { return rotX; }, set rotX(v) { rotX = v; },
                   get rotY() { return rotY; }, set rotY(v) { rotY = v; },
                   get zoomLevel() { return zoomLevel; }, set zoomLevel(v) { zoomLevel = v; },
                   get isWireframe() { return isWireframe; }, set isWireframe(v) { isWireframe = v; },
                   get isNight() { return isNight; }, set isNight(v) { isNight = v; } };
}

// ── Controls ──
function resetCamera3D(key) {
  const s = _scenes[key]; if (!s) return;
  s.rotX = 0.3; s.rotY = 0.5; s.zoomLevel = 10;
  s.updateCamera();
}

function toggleWireframe(key) {
  const s = _scenes[key]; if (!s) return;
  s.isWireframe = !s.isWireframe;
  s.scene.traverse(obj => { if (obj.isMesh) obj.material.wireframe = s.isWireframe; });
}

function zoomIn(key)  { const s = _scenes[key || 'full'] || _scenes['ll-full']; if (!s) return; s.zoomLevel = Math.max(4, s.zoomLevel - 1.5); s.updateCamera(); }
function zoomOut(key) { const s = _scenes[key || 'full'] || _scenes['ll-full']; if (!s) return; s.zoomLevel = Math.min(20, s.zoomLevel + 1.5); s.updateCamera(); }

function zoomInModal()  { zoomIn('modal'); }
function zoomOutModal() { zoomOut('modal'); }

function rotateFront(key) {
  const s = _scenes[key || 'll-full']; if (!s) return;
  s.rotX = 0.1; s.rotY = 0; s.updateCamera();
}
function rotateSide(key) {
  const s = _scenes[key || 'll-full']; if (!s) return;
  s.rotX = 0.15; s.rotY = Math.PI / 2; s.updateCamera();
}
function rotateTop(key) {
  const s = _scenes[key || 'll-full']; if (!s) return;
  s.rotX = 1.1; s.rotY = 0; s.updateCamera();
}

function toggleDayNight() {
  ['ll', 'll-full', 'modal', 'tenant', 'full'].forEach(key => {
    const s = _scenes[key]; if (!s) return;
    s.isNight = !s.isNight;
    if (s.isNight) {
      s.sun.intensity = 0.2; s.ambient.intensity = 0.15;
      s.fill.color.setHex(0x2233AA); s.fill.intensity = 0.8;
    } else {
      s.sun.intensity = 1.2; s.ambient.intensity = 0.5;
      s.fill.color.setHex(0x4A9EFF); s.fill.intensity = 0.3;
    }
  });
}
