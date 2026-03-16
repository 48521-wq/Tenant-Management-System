/* ============================================================
   TMS — furniture3d.js
   Real-looking drag-and-drop furniture placement system
   Three.js r128 — No external assets needed
   ============================================================ */

const _fScenes = {};

// ── Build detailed furniture meshes ─────────────────────────
function buildFurniture(scene, type, color) {
  const group = new THREE.Group();

  function box(w,h,d,col,x,y,z,rx,ry,rz) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      new THREE.MeshPhongMaterial({ color: col })
    );
    m.position.set(x,y,z);
    if(rx) m.rotation.x=rx;
    if(ry) m.rotation.y=ry;
    if(rz) m.rotation.z=rz;
    m.castShadow=true; m.receiveShadow=true;
    group.add(m); return m;
  }
  function cyl(rt,rb,h,seg,col,x,y,z) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(rt,rb,h,seg),
      new THREE.MeshPhongMaterial({ color: col })
    );
    m.position.set(x,y,z); m.castShadow=true;
    group.add(m); return m;
  }
  function sph(r,col,x,y,z) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r,12,12),
      new THREE.MeshPhongMaterial({ color: col })
    );
    m.position.set(x,y,z); m.castShadow=true;
    group.add(m); return m;
  }

  const c = color || 0x8B7355;
  const dark = new THREE.Color(c).multiplyScalar(0.6).getHex();
  const light = new THREE.Color(c).multiplyScalar(1.3).getHex();

  switch(type) {

    case 'sofa': {
      // seat
      box(2.2,0.25,0.9, c, 0,0.25,0);
      // back
      box(2.2,0.7,0.2, dark, 0,0.65,-0.35);
      // left arm
      box(0.2,0.55,0.9, dark, -1.0,0.45,0);
      // right arm
      box(0.2,0.55,0.9, dark,  1.0,0.45,0);
      // cushions
      box(0.85,0.2,0.7, light, -0.55,0.45,0.05);
      box(0.85,0.2,0.7, light,  0.55,0.45,0.05);
      // legs
      box(0.08,0.25,0.08,0x3A2A1A,-0.95,0.1,0.35);
      box(0.08,0.25,0.08,0x3A2A1A, 0.95,0.1,0.35);
      box(0.08,0.25,0.08,0x3A2A1A,-0.95,0.1,-0.35);
      box(0.08,0.25,0.08,0x3A2A1A, 0.95,0.1,-0.35);
      break;
    }

    case 'armchair': {
      box(1.0,0.22,0.85, c, 0,0.22,0);
      box(1.0,0.65,0.18, dark, 0,0.62,-0.34);
      box(0.18,0.52,0.85, dark,-0.41,0.42,0);
      box(0.18,0.52,0.85, dark, 0.41,0.42,0);
      box(0.75,0.18,0.65, light, 0,0.4,0.05);
      box(0.07,0.2,0.07,0x3A2A1A,-0.38,0.1, 0.35);
      box(0.07,0.2,0.07,0x3A2A1A, 0.38,0.1, 0.35);
      box(0.07,0.2,0.07,0x3A2A1A,-0.38,0.1,-0.35);
      box(0.07,0.2,0.07,0x3A2A1A, 0.38,0.1,-0.35);
      break;
    }

    case 'bed_single': {
      // frame
      box(1.1,0.22,2.2, dark, 0,0.11,0);
      // mattress
      box(1.0,0.2,1.9, 0xF5F0E8, 0,0.32,0.1);
      // pillow
      box(0.8,0.12,0.38, 0xFFFFFF, 0,0.45,-0.8);
      // headboard
      box(1.1,0.65,0.1, dark, 0,0.54,-1.05);
      // footboard
      box(1.1,0.35,0.1, dark, 0,0.3, 1.05);
      // legs
      [[-0.45,-0.95],[-0.45,0.95],[0.45,-0.95],[0.45,0.95]].forEach(([x,z])=>
        box(0.07,0.22,0.07,0x2A1A0A,x,0.11,z));
      break;
    }

    case 'bed_double': {
      box(1.8,0.22,2.2, dark, 0,0.11,0);
      box(1.7,0.2,1.95, 0xF5F0E8, 0,0.32,0.05);
      box(0.7,0.12,0.38, 0xFFFFFF, -0.42,0.45,-0.82);
      box(0.7,0.12,0.38, 0xFFFFFF,  0.42,0.45,-0.82);
      box(1.8,0.7,0.12, dark, 0,0.57,-1.07);
      box(1.8,0.32,0.12, dark, 0,0.27, 1.07);
      [[-0.82,-0.95],[-0.82,0.95],[0.82,-0.95],[0.82,0.95]].forEach(([x,z])=>
        box(0.07,0.22,0.07,0x2A1A0A,x,0.11,z));
      break;
    }

    case 'dining_table': {
      // tabletop
      box(1.6,0.08,0.9, c, 0,0.76,0);
      // apron
      box(1.45,0.08,0.05, dark, 0,0.7, 0.41);
      box(1.45,0.08,0.05, dark, 0,0.7,-0.41);
      box(0.05,0.08,0.82, dark, 0.76,0.7,0);
      box(0.05,0.08,0.82, dark,-0.76,0.7,0);
      // legs
      [[-0.72,0.38],[-0.72,-0.38],[0.72,0.38],[0.72,-0.38]].forEach(([x,z])=>
        box(0.07,0.72,0.07,dark,x,0.36,z));
      break;
    }

    case 'chair': {
      // seat
      box(0.48,0.06,0.48, c, 0,0.45,0);
      // back slats
      for(let i=-1;i<=1;i++) box(0.04,0.55,0.04,dark,i*0.15,0.75,-0.21);
      // top rail
      box(0.48,0.05,0.05, dark, 0,1.02,-0.21);
      // legs
      [[-0.2,0.2],[-0.2,-0.2],[0.2,0.2],[0.2,-0.2]].forEach(([x,z])=>
        box(0.05,0.45,0.05,dark,x,0.22,z));
      break;
    }

    case 'wardrobe': {
      // body
      box(1.6,2.1,0.55, c, 0,1.05,0);
      // doors (slightly raised)
      box(0.74,1.9,0.03, light,-0.4,1.05,0.28);
      box(0.74,1.9,0.03, light, 0.4,1.05,0.28);
      // handles
      box(0.04,0.15,0.04,0xC0A060, -0.06,1.0,0.3);
      box(0.04,0.15,0.04,0xC0A060,  0.06,1.0,0.3);
      // top crown
      box(1.65,0.1,0.6, dark, 0,2.15,0);
      // base
      box(1.6,0.08,0.55, dark, 0,0.04,0);
      // middle divider
      box(0.04,2.0,0.52, dark, 0,1.0,0);
      break;
    }

    case 'tv_unit': {
      // cabinet
      box(1.8,0.5,0.4, c, 0,0.25,0);
      // doors
      box(0.82,0.4,0.03, light,-0.44,0.25,0.21);
      box(0.82,0.4,0.03, light, 0.44,0.25,0.21);
      // handles
      box(0.3,0.03,0.03,0x888888,-0.44,0.25,0.23);
      box(0.3,0.03,0.03,0x888888, 0.44,0.25,0.23);
      // TV screen
      box(1.5,0.85,0.06,0x111111, 0,1.02,0);
      // screen face
      box(1.38,0.75,0.02,0x1A2A3A, 0,1.03,0.04);
      // tv stand neck
      box(0.12,0.15,0.08,0x333333, 0,0.6,0);
      break;
    }

    case 'bookshelf': {
      // sides
      box(0.06,1.8,0.3, dark,-0.57,0.9,0);
      box(0.06,1.8,0.3, dark, 0.57,0.9,0);
      // shelves
      [0.05,0.52,1.0,1.48,1.78].forEach(y=>box(1.14,0.05,0.3,dark,0,y,0));
      // back panel
      box(1.14,1.8,0.03, dark, 0,0.9,-0.14);
      // books (colorful)
      const bkc=[0xE63946,0x2A9D8F,0xE9C46A,0x457B9D,0xA8DADC,0xF4A261];
      let bx=-0.45;
      [0.52,1.0,1.48].forEach(sy=>{
        bx=-0.45;
        bkc.forEach(bc=>{ box(0.1,0.3,0.22,bc,bx,sy+0.17,0); bx+=0.13; });
      });
      break;
    }

    case 'dining_chair': {
      box(0.44,0.05,0.44, c, 0,0.44,0);
      // upholstered seat pad
      box(0.38,0.06,0.38, light, 0,0.48,0);
      // curved back
      box(0.44,0.5,0.05, c, 0,0.72,-0.2);
      box(0.44,0.06,0.05, light, 0,0.72,-0.19);
      [[-0.18,0.18],[-0.18,-0.18],[0.18,0.18],[0.18,-0.18]].forEach(([x,z])=>
        box(0.04,0.44,0.04,dark,x,0.22,z));
      break;
    }

    case 'coffee_table': {
      // glass top
      box(1.1,0.05,0.6, 0x88CCEE, 0,0.46,0);
      // shelf
      box(0.9,0.04,0.5, c, 0,0.22,0);
      // legs — angled modern look
      [[-0.45,0.25],[-0.45,-0.25],[0.45,0.25],[0.45,-0.25]].forEach(([x,z])=>
        box(0.05,0.44,0.05,dark,x,0.22,z));
      break;
    }

    case 'lamp': {
      // base
      cyl(0.18,0.22,0.06,12, dark, 0,0.03,0);
      // pole
      cyl(0.03,0.03,1.1,8, dark, 0,0.58,0);
      // shade
      cyl(0.28,0.12,0.35,16, 0xFFEE99, 0,1.2,0);
      // bulb glow
      sph(0.08, 0xFFFF88, 0,1.12,0);
      break;
    }

    case 'plant': {
      // pot
      cyl(0.2,0.16,0.35,12, 0xA0522D, 0,0.17,0);
      // soil
      cyl(0.19,0.19,0.04,12, 0x4A3728, 0,0.36,0);
      // stem
      cyl(0.03,0.03,0.6,8, 0x3A5A28, 0,0.65,0);
      // leaves
      const lc = 0x2D8A3E;
      [[0.22,0.9,0],[-0.22,0.85,0],[0,0.95,0.2],[0,0.9,-0.2],
       [0.15,1.1,0.15],[-0.15,1.05,-0.15]].forEach(([x,y,z])=>
        sph(0.22, lc, x,y,z));
      break;
    }

    default: {
      // generic box fallback
      box(0.8,0.8,0.8, c, 0,0.4,0);
    }
  }

  group.traverse(m=>{ if(m.isMesh){ m.castShadow=true; m.receiveShadow=true; } });
  return group;
}

// ── Main Furniture Placement Scene ──────────────────────────
function initFurniturePlacement(canvasId, savedLayout, onSave) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (_fScenes[canvasId]) {
    try { _fScenes[canvasId].renderer.dispose(); } catch {}
    delete _fScenes[canvasId];
  }

  savedLayout = savedLayout || {};
  const W = canvas.clientWidth  || 800;
  const H = canvas.clientHeight || 550;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x1A1A2E, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 100);
  camera.position.set(0, 9, 9);
  camera.lookAt(0, 0, 0);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dlight = new THREE.DirectionalLight(0xFFF5E0, 0.9);
  dlight.position.set(6, 10, 6); dlight.castShadow = true;
  dlight.shadow.mapSize.width = dlight.shadow.mapSize.height = 2048;
  scene.add(dlight);
  const plight = new THREE.PointLight(0xFFEECC, 0.5, 20);
  plight.position.set(0, 4, 0); scene.add(plight);

  // Room — floor + walls
  const ROOM_W = 8, ROOM_D = 8;
  const floorMat = new THREE.MeshPhongMaterial({ color: 0xD2B48C });
  const wallMat  = new THREE.MeshPhongMaterial({ color: 0xE8DCC8 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);

  // Floor grid
  const gridHelper = new THREE.GridHelper(ROOM_W, 16, 0xBBAA88, 0xCCBB99);
  gridHelper.position.y = 0.01; scene.add(gridHelper);

  // Walls
  const wallGeo = new THREE.PlaneGeometry(ROOM_W, 3.5);
  const backW = new THREE.Mesh(wallGeo, wallMat);
  backW.position.set(0, 1.75, -ROOM_D/2); scene.add(backW);
  const leftW = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, 3.5), wallMat);
  leftW.rotation.y = Math.PI/2; leftW.position.set(-ROOM_W/2, 1.75, 0); scene.add(leftW);
  const rightW = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, 3.5), wallMat);
  rightW.rotation.y = -Math.PI/2; rightW.position.set(ROOM_W/2, 1.75, 0); scene.add(rightW);

  // Ceiling light fixture
  const clight = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.15, 16),
    new THREE.MeshPhongMaterial({ color: 0xFFFFCC, emissive: 0x444400 }));
  clight.position.set(0, 3.4, 0); scene.add(clight);

  // ── Furniture catalog ──
  const CATALOG = [
    { id:'sofa',         label:'Sofa',          color:0x6B5B95, icon:'🛋️' },
    { id:'armchair',     label:'Armchair',      color:0x7B4F3A, icon:'🪑' },
    { id:'bed_double',   label:'Double Bed',    color:0x8B6D5E, icon:'🛏️' },
    { id:'bed_single',   label:'Single Bed',    color:0x7A8B6E, icon:'🛏️' },
    { id:'dining_table', label:'Dining Table',  color:0xAA8855, icon:'🍽️' },
    { id:'dining_chair', label:'Dining Chair',  color:0xBB9966, icon:'🪑' },
    { id:'chair',        label:'Chair',         color:0x5B7A8E, icon:'🪑' },
    { id:'wardrobe',     label:'Wardrobe',      color:0x6B5A4E, icon:'🚪' },
    { id:'tv_unit',      label:'TV Unit',       color:0x4A5568, icon:'📺' },
    { id:'bookshelf',    label:'Bookshelf',     color:0x7A6040, icon:'📚' },
    { id:'coffee_table', label:'Coffee Table',  color:0x8A7060, icon:'☕' },
    { id:'lamp',         label:'Floor Lamp',    color:0xC0A060, icon:'💡' },
    { id:'plant',        label:'Indoor Plant',  color:0x3A6A40, icon:'🪴' },
  ];

  // ── Placed furniture objects ──
  const placed = [];  // { mesh, type, id, rotY }

  // Load saved layout — supports both {type: [...items]} and {type: {x,z,rotY}}
  Object.entries(savedLayout).forEach(([key, data]) => {
    if (!data) return;
    const cat = CATALOG.find(c => c.id === key);
    if (!cat) return;
    const items = Array.isArray(data) ? data : [data];
    items.forEach(item => {
      if (item.visible === false) return;
      const mesh = buildFurniture(scene, cat.id, cat.color);
      mesh.position.set(item.x||0, 0, item.z||0);
      mesh.rotation.y = item.rotY||0;
      scene.add(mesh);
      placed.push({ mesh, type: cat.id, id: key+'_'+Date.now(), rotY: item.rotY||0 });
    });
  });

  // ── Drag interaction ──
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let dragging = null, dragOffset = new THREE.Vector3();
  let selected = null;
  let orbitDragging = false, orbitPrev = {x:0,y:0};
  let camTheta = Math.PI/4, camPhi = 0.9, camDist = 14;

  function updateCamera() {
    camera.position.x = camDist * Math.sin(camPhi) * Math.sin(camTheta);
    camera.position.y = camDist * Math.cos(camTheta);
    camera.position.z = camDist * Math.sin(camPhi) * Math.cos(camTheta);
    camera.lookAt(0, 0, 0);
  }
  updateCamera();

  function getMouseWorld(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
    const pt = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, pt);
    return pt;
  }

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  function selectObject(obj) {
    if (selected) {
      selected.mesh.traverse(m => {
        if (m.isMesh && m._origColor !== undefined)
          m.material.emissive.setHex(0);
      });
    }
    selected = obj;
    if (selected) {
      selected.mesh.traverse(m => {
        if (m.isMesh) m.material.emissive.setHex(0x222200);
      });
    }
    // Update rotate/delete UI
    const rPanel = document.getElementById('furn-action-panel');
    if (rPanel) rPanel.style.display = selected ? 'flex' : 'none';
  }

  canvas.addEventListener('mousedown', e => {
    if (e.button === 2) { orbitDragging = true; orbitPrev={x:e.clientX,y:e.clientY}; return; }
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse, camera);
    // Check against placed furniture
    const meshes = placed.map(p=>p.mesh).filter(Boolean);
    // collect all child meshes
    const allMeshes = [];
    meshes.forEach(g=>g.traverse(m=>{ if(m.isMesh) allMeshes.push(m); }));
    const hits = raycaster.intersectObjects(allMeshes);
    if (hits.length) {
      // find which group
      let hitMesh = hits[0].object;
      let found = null;
      for (const p of placed) {
        let inside = false;
        p.mesh.traverse(m=>{ if(m===hitMesh) inside=true; });
        if(inside){ found=p; break; }
      }
      if (found) {
        selectObject(found);
        dragging = found;
        const wp = getMouseWorld(e);
        if (wp) dragOffset.copy(found.mesh.position).sub(wp);
      }
    } else {
      selectObject(null);
    }
  });

  window.addEventListener('mousemove', e => {
    if (orbitDragging) {
      camPhi   += (e.clientX - orbitPrev.x) * 0.005;
      camTheta = clamp(camTheta + (e.clientY-orbitPrev.y)*0.005, 0.15, 1.4);
      orbitPrev = {x:e.clientX,y:e.clientY};
      updateCamera(); return;
    }
    if (!dragging) return;
    const wp = getMouseWorld(e);
    if (!wp) return;
    const nx = clamp(wp.x + dragOffset.x, -3.5, 3.5);
    const nz = clamp(wp.z + dragOffset.z, -3.5, 3.5);
    dragging.mesh.position.set(nx, 0, nz);
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 2) { orbitDragging = false; return; }
    dragging = null;
  });

  canvas.addEventListener('wheel', e => {
    camDist = clamp(camDist + e.deltaY*0.02, 5, 22);
    updateCamera(); e.preventDefault();
  }, { passive:false });

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ── Touch support ──
  let touchDragging = null, lastTouch = null;
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const synth = { clientX:touch.clientX, clientY:touch.clientY, button:0 };
      canvas.dispatchEvent(new MouseEvent('mousedown', synth));
      lastTouch = {x:touch.clientX,y:touch.clientY};
    }
  }, {passive:true});
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      window.dispatchEvent(new MouseEvent('mousemove', {clientX:touch.clientX,clientY:touch.clientY}));
    }
  }, {passive:true});
  canvas.addEventListener('touchend', () => window.dispatchEvent(new MouseEvent('mouseup', {button:0})));

  // ── API ──
  function addFurniture(type, color) {
    const mesh = buildFurniture(scene, type, color);
    // place near center with slight offset
    const ox = (Math.random()-0.5)*2;
    const oz = (Math.random()-0.5)*2;
    mesh.position.set(ox, 0, oz);
    scene.add(mesh);
    const item = { mesh, type, id: type+'_'+Date.now(), rotY: 0 };
    placed.push(item);
    selectObject(item);
  }

  function rotateSelected(deg) {
    if (!selected) return;
    selected.rotY += deg * Math.PI/180;
    selected.mesh.rotation.y = selected.rotY;
  }

  function deleteSelected() {
    if (!selected) return;
    scene.remove(selected.mesh);
    const idx = placed.indexOf(selected);
    if (idx>-1) placed.splice(idx,1);
    selectObject(null);
  }

  function getLayout() {
    const layout = {};
    placed.forEach(p => {
      layout[p.type] = layout[p.type] || [];
      layout[p.type].push({
        x: Math.round(p.mesh.position.x*100)/100,
        z: Math.round(p.mesh.position.z*100)/100,
        rotY: Math.round(p.rotY*100)/100,
        visible: true
      });
    });
    return layout;
  }

  // Animate
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  const ro = new ResizeObserver(()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvas);

  _fScenes[canvasId] = { renderer, scene, camera, placed, addFurniture, rotateSelected, deleteSelected, getLayout, updateCamera };
  return _fScenes[canvasId];
}

function getFurnitureScene(canvasId) { return _fScenes[canvasId]; }
