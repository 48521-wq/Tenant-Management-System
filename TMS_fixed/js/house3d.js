/* ============================================================
   TMS — house3d.js  v4.0
   Three.js r128 — Config-driven 3D House Engine
   ============================================================ */

const _scenes = {};
const _furnitureScenes = {};

function hexToThree(hex) {
  if (!hex || typeof hex !== 'string') return 0x8B7355;
  return parseInt(hex.replace('#', ''), 16);
}

function initHouse3D(canvasId, cfg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (_scenes[canvasId]) { try { _scenes[canvasId].renderer.dispose(); } catch {} delete _scenes[canvasId]; }

  cfg = cfg || {};
  const houseType  = cfg.houseType  || 'standard';
  const wallColor  = hexToThree(cfg.wallColor  || '#8B7355');
  const roofColor  = hexToThree(cfg.roofColor  || '#5C3A1E');
  const floorColor = hexToThree(cfg.floorColor || '#D2B48C');
  const floors     = Math.max(1, Math.min(4, parseInt(cfg.floors) || 1));
  const hasGarden  = !!cfg.hasGarden;
  const hasPool    = !!cfg.hasPool;
  const hasGarage  = !!cfg.hasGarage;

  const W = canvas.clientWidth  || 640;
  const H = canvas.clientHeight || 420;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x080B12, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0A0D16, 0.025);
  const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xFFF5D6, 1.2);
  sun.position.set(10, 16, 8); sun.castShadow = true;
  sun.shadow.mapSize.width = sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -15;
  sun.shadow.camera.right = sun.shadow.camera.top   = 15;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4A9EFF, 0.35);
  fill.position.set(-6, 4, -6); scene.add(fill);

  const wallMat  = new THREE.MeshLambertMaterial({ color: wallColor });
  const roofMat  = new THREE.MeshLambertMaterial({ color: roofColor });
  const floorMat = new THREE.MeshLambertMaterial({ color: floorColor });
  const winMat   = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.75 });
  const doorMat  = new THREE.MeshLambertMaterial({ color: 0x5C3B1A });
  const groundMat= new THREE.MeshLambertMaterial({ color: 0x1A2A1A });
  const pathMat  = new THREE.MeshLambertMaterial({ color: 0x6B6050 });
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x888070 });
  const poolMat  = new THREE.MeshLambertMaterial({ color: 0x1A7ACC, transparent: true, opacity: 0.85 });

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    scene.add(m); return m;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const sg = new THREE.BufferGeometry(), sv = [];
  for (let i = 0; i < 400; i++) sv.push((Math.random()-0.5)*80, Math.random()*30+3, (Math.random()-0.5)*80);
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.4 })));

  const floorH = 2.6;

  if (houseType === 'apartment') {
    const bh = floorH * floors;
    box(6, bh, 4, wallMat, 0, bh/2, 0);
    box(6.4, 0.25, 4.4, roofMat, 0, bh, 0);
    for (let f = 0; f < floors; f++) {
      const fy = 1.0 + f * floorH;
      for (let wx = -2; wx <= 2; wx += 1.4) box(0.7, 0.8, 0.1, winMat, wx, fy, 2.05);
    }
    box(0.9, 1.4, 0.1, doorMat, 0, 0.7, 2.05);
  } else if (houseType === 'villa') {
    const bh = floorH * Math.min(floors, 2);
    box(7, bh, 5.5, wallMat, 0, bh/2, 0);
    const vr = new THREE.Mesh(new THREE.ConeGeometry(5.2, 1.6, 4), roofMat);
    vr.position.set(0, bh+0.8, 0); vr.rotation.y = Math.PI/4; vr.castShadow = true; scene.add(vr);
    [-2.5, 2.5].forEach(x => box(0.3, 2.2, 0.3, new THREE.MeshLambertMaterial({color:0xDDD0BB}), x, 1.1, 2.85));
    box(1.2, 1.2, 0.1, winMat, -2, 1.4, 2.8); box(1.2, 1.2, 0.1, winMat, 2, 1.4, 2.8);
    box(0.9, 1.8, 0.1, doorMat, 0, 0.9, 2.8);
    if (floors > 1) {
      box(5, floorH*(floors-1), 4, wallMat, 0, floorH+(floorH*(floors-1)/2), 0.3);
      const vr2 = new THREE.Mesh(new THREE.ConeGeometry(3.6, 1.2, 4), roofMat);
      vr2.position.set(0, floorH+(floorH*(floors-1))+0.6, 0.3); vr2.rotation.y=Math.PI/4; vr2.castShadow=true; scene.add(vr2);
    }
  } else if (houseType === 'bungalow') {
    box(6.5, 2, 4.5, wallMat, 0, 1, 0);
    const br = new THREE.Mesh(new THREE.ConeGeometry(4.8, 1.2, 4), roofMat);
    br.position.set(0, 2.6, 0); br.rotation.y=Math.PI/4; br.castShadow=true; scene.add(br);
    box(5, 0.15, 1.4, floorMat, 0, 0.075, 3.0);
    [-1.8,-0.6,0.6,1.8].forEach(x => box(0.2,1.9,0.2,new THREE.MeshLambertMaterial({color:0xBBAA88}),x,0.95,3.0));
    box(0.9,1.4,0.1,doorMat,0,0.7,2.26);
    box(0.8,0.7,0.1,winMat,-2.2,1.0,2.26); box(0.8,0.7,0.1,winMat,2.2,1.0,2.26);
  } else {
    box(4.5, floorH, 3.6, wallMat, 0, floorH*0.5, 0);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 4), roofMat);
    rf.position.set(0, floorH+0.75, 0); rf.rotation.y=Math.PI/4; rf.castShadow=true; scene.add(rf);
    box(0.45,1.1,0.45,new THREE.MeshLambertMaterial({color:0x7A5535}),0.9,floorH+1.1,0.5);
    for (let f = 1; f < floors; f++) {
      const fw = Math.max(4.5-f*0.5, 2.5);
      box(fw, floorH, 3.2-f*0.2, wallMat, 0, floorH*f+floorH*0.5, 0);
      const rf2 = new THREE.Mesh(new THREE.ConeGeometry(fw*0.76,1.2,4), roofMat);
      rf2.position.set(0, floorH*(f+1)+0.6, 0); rf2.rotation.y=Math.PI/4; rf2.castShadow=true; scene.add(rf2);
    }
    box(0.75,1.3,0.09,doorMat,0,0.65,1.85);
    box(0.75,0.65,0.09,winMat,1.35,1.5,1.85); box(0.75,0.65,0.09,winMat,-1.35,1.5,1.85);
    box(0.09,0.65,0.75,winMat,2.27,1.5,0.6); box(0.09,0.65,0.75,winMat,2.27,1.5,-0.6);
    box(1.5,0.15,0.65,floorMat,0,0.075,2.08);
    for (let f = 1; f < floors && f < 3; f++) {
      const fy = floorH*f+1.0;
      box(0.65,0.6,0.09,winMat,1.2,fy,1.85); box(0.65,0.6,0.09,winMat,-1.2,fy,1.85);
    }
  }

  box(0.6,0.05,3.5,pathMat,0,0.025,3.5);
  for (let i = -3; i <= 3; i += 0.55) box(0.07,0.6,0.07,fenceMat,i,0.3,3.0);
  box(3.6,0.07,0.07,fenceMat,0,0.5,3.0); box(3.6,0.07,0.07,fenceMat,0,0.2,3.0);

  function tree(x, z, s) {
    s=s||1;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.1*s,0.13*s,0.9*s,7), new THREE.MeshLambertMaterial({color:0x5C3B1A}));
    tr.position.set(x,0.45*s,z); tr.castShadow=true; scene.add(tr);
    const lv = new THREE.Mesh(new THREE.SphereGeometry(0.5*s,8,8), new THREE.MeshLambertMaterial({color:0x2D6A3F}));
    lv.position.set(x,1.2*s,z); lv.castShadow=true; scene.add(lv);
  }
  tree(-3,2,1); tree(3,2,1); tree(-4,-1,0.8); tree(4,-1,0.8);

  if (hasGarden) {
    box(3,0.06,2,new THREE.MeshLambertMaterial({color:0x2A5C2A}),-4,0.03,-1);
    tree(-4.5,-2,0.7); tree(-3.5,-2.5,0.6);
    [0xFF6B6B,0xFF9F43,0xF7DC6F,0xAD8BFF].forEach((c,i) => {
      box(0.2,0.4,0.2,new THREE.MeshLambertMaterial({color:c}),-3.5+(i%4)*0.4,0.2,-0.5-Math.floor(i/4)*0.4);
    });
  }
  if (hasPool) {
    box(3,0.3,2,new THREE.MeshLambertMaterial({color:0x4488AA}),4,0.15,-1);
    box(2.7,0.2,1.7,poolMat,4,0.3,-1);
    box(3.2,0.1,2.2,new THREE.MeshLambertMaterial({color:0xCCBB99}),4,0.32,-1);
  }
  if (hasGarage) {
    box(3,2.2,3,wallMat,-5,1.1,0);
    const gr = new THREE.Mesh(new THREE.ConeGeometry(2.2,0.8,4), roofMat);
    gr.position.set(-5,2.6,0); gr.rotation.y=Math.PI/4; gr.castShadow=true; scene.add(gr);
    box(2.2,1.6,0.1,new THREE.MeshLambertMaterial({color:0x888080}),-5,0.8,1.55);
  }

  let rotX=0.32, rotY=0.5, zoom=12, isDragging=false, prevX=0, prevY=0, autoRotate=true;
  function updateCamera() {
    camera.position.x=Math.sin(rotY)*Math.cos(rotX)*zoom;
    camera.position.y=Math.sin(rotX)*zoom+2;
    camera.position.z=Math.cos(rotY)*Math.cos(rotX)*zoom;
    camera.lookAt(0,2,0);
  }
  updateCamera();
  canvas.addEventListener('mousedown', e=>{isDragging=true;autoRotate=false;prevX=e.clientX;prevY=e.clientY;});
  window.addEventListener('mouseup', ()=>{isDragging=false;});
  window.addEventListener('mousemove', e=>{if(!isDragging)return;rotY+=(e.clientX-prevX)*0.008;rotX=Math.max(-0.3,Math.min(1.1,rotX+(e.clientY-prevY)*0.008));prevX=e.clientX;prevY=e.clientY;updateCamera();});
  canvas.addEventListener('wheel', e=>{zoom=Math.max(5,Math.min(25,zoom+e.deltaY*0.025));updateCamera();e.preventDefault();},{passive:false});
  canvas.addEventListener('touchstart', e=>{isDragging=true;autoRotate=false;prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;},{passive:true});
  canvas.addEventListener('touchend', ()=>{isDragging=false;});
  canvas.addEventListener('touchmove', e=>{if(!isDragging)return;rotY+=(e.touches[0].clientX-prevX)*0.008;rotX=Math.max(-0.3,Math.min(1.1,rotX+(e.touches[0].clientY-prevY)*0.008));prevX=e.touches[0].clientX;prevY=e.touches[0].clientY;updateCamera();},{passive:true});
  const ro=new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});
  ro.observe(canvas);
  function animate(){requestAnimationFrame(animate);if(autoRotate){rotY+=0.003;updateCamera();}renderer.render(scene,camera);}
  animate();
  _scenes[canvasId]={renderer,scene,camera,sun,ambient,fill,updateCamera,_isNight:false,
    get rotX(){return rotX;},set rotX(v){rotX=v;},get rotY(){return rotY;},set rotY(v){rotY=v;},get zoom(){return zoom;},set zoom(v){zoom=v;}};
}

// ── Furniture 3D ────────────────────────────────────────────
function initFurniture3D(canvasId, cfg) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (_furnitureScenes[canvasId]) { try { _furnitureScenes[canvasId].renderer.dispose(); } catch {} delete _furnitureScenes[canvasId]; }
  cfg = cfg || {};
  const W=canvas.clientWidth||640, H=canvas.clientHeight||400;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setSize(W,H); renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.shadowMap.enabled=true; renderer.setClearColor(0x0A0F1A,1);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(50,W/H,0.1,100);
  scene.add(new THREE.AmbientLight(0xffffff,0.65));
  const dl=new THREE.DirectionalLight(0xFFF5E0,0.9); dl.position.set(5,10,5); dl.castShadow=true; scene.add(dl);
  const floorM=new THREE.MeshLambertMaterial({color:hexToThree(cfg.floorColor||'#D2B48C')});
  const wallM =new THREE.MeshLambertMaterial({color:hexToThree(cfg.wallColor ||'#C8B89A')});
  const fw=8, fd=7, fh=3.5;
  const floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(fw,fd),floorM); floorMesh.rotation.x=-Math.PI/2; floorMesh.receiveShadow=true; scene.add(floorMesh);
  const bw=new THREE.Mesh(new THREE.BoxGeometry(fw,fh,0.15),wallM); bw.position.set(0,fh/2,-fd/2); scene.add(bw);
  const lw=new THREE.Mesh(new THREE.BoxGeometry(0.15,fh,fd),wallM); lw.position.set(-fw/2,fh/2,0); scene.add(lw);
  const rw=new THREE.Mesh(new THREE.BoxGeometry(0.15,fh,fd),wallM); rw.position.set(fw/2,fh/2,0); scene.add(rw);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8),new THREE.MeshLambertMaterial({color:0xFFFF99})); bulb.position.set(0,fh-0.05,0); scene.add(bulb);
  const pl=new THREE.PointLight(0xFFEECC,0.8,12); pl.position.set(0,fh-0.2,0); scene.add(pl);
  function fbox(w,h,d,col,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:col}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
  const layout=cfg.furniture||{};
  const items=[
    {key:'sofa',    color:0x7B5EA7,w:2.0,h:0.8,d:0.9, x:layout.sofa?.x??-2,    z:layout.sofa?.z??1.5  },
    {key:'bed',     color:0x8B6D5E,w:1.8,h:0.6,d:2.4, x:layout.bed?.x??2,      z:layout.bed?.z??-1.5  },
    {key:'table',   color:0xAA8855,w:1.4,h:0.75,d:1.0,x:layout.table?.x??0,     z:layout.table?.z??1.5 },
    {key:'wardrobe',color:0x7A6555,w:1.2,h:2.1,d:0.55,x:layout.wardrobe?.x??-3, z:layout.wardrobe?.z??-2.5},
    {key:'tv',      color:0x333333,w:1.4,h:0.9,d:0.35,x:layout.tv?.x??0,        z:layout.tv?.z??-3.0   },
    {key:'plant',   color:0x2D6A3F,w:0.4,h:0.9,d:0.4, x:layout.plant?.x??2.8,   z:layout.plant?.z??2.0 },
  ];
  items.forEach(it=>{
    if(layout[it.key]?.visible===false) return;
    fbox(it.w,it.h,it.d,it.color,it.x,it.h/2,it.z);
    if(it.key==='bed'){fbox(1.8,0.25,2.4,0xF5E6DC,it.x,it.h+0.125,it.z);fbox(1.8,0.6,0.4,0x8B6D5E,it.x,it.h/2,it.z-1.0);}
    if(it.key==='sofa'){fbox(2.0,0.5,0.3,0x7B5EA7,it.x,it.h+0.25,it.z-0.3);fbox(0.25,0.7,0.9,0x7B5EA7,it.x-0.9,it.h,it.z);fbox(0.25,0.7,0.9,0x7B5EA7,it.x+0.9,it.h,it.z);}
    if(it.key==='tv'){fbox(1.3,0.8,0.06,0x111111,it.x,it.h+0.7,it.z);}
    if(it.key==='plant'){fbox(0.3,0.3,0.3,0x8B6555,it.x,0.15,it.z);fbox(0.1,0.6,0.1,0x5C3B1A,it.x,0.6,it.z);const lv=new THREE.Mesh(new THREE.SphereGeometry(0.3,8,8),new THREE.MeshLambertMaterial({color:0x2D6A3F}));lv.position.set(it.x,1.1,it.z);scene.add(lv);}
  });
  let rotX=0.55,rotY=0.3,zoom=9,isDragging=false,prevX=0,prevY=0;
  function uc(){camera.position.x=Math.sin(rotY)*Math.cos(rotX)*zoom;camera.position.y=Math.sin(rotX)*zoom+1;camera.position.z=Math.cos(rotY)*Math.cos(rotX)*zoom;camera.lookAt(0,1,0);}
  uc();
  canvas.addEventListener('mousedown',e=>{isDragging=true;prevX=e.clientX;prevY=e.clientY;});
  window.addEventListener('mouseup',()=>{isDragging=false;});
  window.addEventListener('mousemove',e=>{if(!isDragging)return;rotY+=(e.clientX-prevX)*0.008;rotX=Math.max(0.1,Math.min(1.3,rotX+(e.clientY-prevY)*0.008));prevX=e.clientX;prevY=e.clientY;uc();});
  canvas.addEventListener('wheel',e=>{zoom=Math.max(4,Math.min(18,zoom+e.deltaY*0.025));uc();e.preventDefault();},{passive:false});
  const ro2=new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});
  ro2.observe(canvas);
  function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
  animate();
  _furnitureScenes[canvasId]={renderer,scene,camera,uc,get rotX(){return rotX;},set rotX(v){rotX=v;},get rotY(){return rotY;},set rotY(v){rotY=v;},get zoom(){return zoom;},set zoom(v){zoom=v;}};
}

// Controls
function h3d_reset(id){const s=_scenes[id];if(!s)return;s.rotX=0.32;s.rotY=0.5;s.zoom=12;s.updateCamera();}
function h3d_front(id){const s=_scenes[id];if(!s)return;s.rotX=0.1;s.rotY=0;s.updateCamera();}
function h3d_side(id){const s=_scenes[id];if(!s)return;s.rotX=0.15;s.rotY=Math.PI/2;s.updateCamera();}
function h3d_top(id){const s=_scenes[id];if(!s)return;s.rotX=1.1;s.rotY=0;s.updateCamera();}
function h3d_zoomin(id){const s=_scenes[id];if(!s)return;s.zoom=Math.max(5,s.zoom-2);s.updateCamera();}
function h3d_zoomout(id){const s=_scenes[id];if(!s)return;s.zoom=Math.min(25,s.zoom+2);s.updateCamera();}
function h3d_night(id){const s=_scenes[id];if(!s)return;s._isNight=!s._isNight;if(s._isNight){s.sun.intensity=0.1;s.ambient.intensity=0.1;s.fill.color.setHex(0x1133AA);s.fill.intensity=0.7;}else{s.sun.intensity=1.2;s.ambient.intensity=0.55;s.fill.color.setHex(0x4A9EFF);s.fill.intensity=0.35;}}
function furn3d_reset(id){const s=_furnitureScenes[id];if(!s)return;s.rotX=0.55;s.rotY=0.3;s.zoom=9;s.uc();}
function furn3d_top(id){const s=_furnitureScenes[id];if(!s)return;s.rotX=1.3;s.rotY=0;s.uc();}
