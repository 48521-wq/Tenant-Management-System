/* ============================================================
   TMS — furniture3d.js  v8.0  (FINAL FIX)
   
   Key fixes in this version:
   1. Furniture drag: Uses a Y=0 horizontal plane intersection
      that ALWAYS succeeds (no null returns) — camera angle
      irrelevant because we use a ground plane in world space.
   2. Drag delta: Stored at mousedown, applied at mousemove
      so object doesn't jump to cursor center.
   3. model-viewer: pointer-events:none so canvas gets ALL events.
   4. Canvas: z-index:3 to ensure it's always on top.
   5. Property cards: model-viewer for GLB preview.
   ============================================================ */

const _fScenes = {};

/* ── Materials ───────────────────────────────────────────────*/
const woodMat  = c => new THREE.MeshStandardMaterial({color:c||0x8B5E3C,roughness:0.75,metalness:0});
const fabMat   = c => new THREE.MeshStandardMaterial({color:c||0x6B7A8D,roughness:0.95,metalness:0});
const metMat   = c => new THREE.MeshStandardMaterial({color:c||0xB0B0B0,roughness:0.25,metalness:0.9});
const glassMat =  () => new THREE.MeshStandardMaterial({color:0xBBDDFF,roughness:0.05,metalness:0.1,transparent:true,opacity:0.35});
const bedMat   =  () => new THREE.MeshStandardMaterial({color:0xF2EEE8,roughness:0.9});

/* ── Rounded box geometry ────────────────────────────────────*/
function rboxGeo(w,h,d,r){
  r=Math.min(r||0,w/2-0.001,h/2-0.001,d/2-0.001);
  const sh=new THREE.Shape();
  const [x,y,X,Y]=[-w/2+r,-h/2+r,w/2-r,h/2-r];
  sh.moveTo(x-r,y);sh.lineTo(X+r,y);sh.absarc(X,y,r,-Math.PI/2,0,false);
  sh.lineTo(X+r,Y);sh.absarc(X,Y,r,0,Math.PI/2,false);
  sh.lineTo(x-r,Y+r);sh.absarc(x,Y,r,Math.PI/2,Math.PI,false);
  sh.lineTo(x-r,y);sh.absarc(x,y,r,Math.PI,3*Math.PI/2,false);
  const g=new THREE.ExtrudeGeometry(sh,{depth:d,bevelEnabled:false});
  g.center();return g;
}

/* ── Build furniture group ───────────────────────────────────*/
function buildFurniture(type, col){
  const G=new THREE.Group();
  const C=col||0x8B5E3C, Cd=Math.max(0,C-0x303030), Cl=Math.min(0xFFFFFF,C+0x404040);

  const mk=(geo,mat,x,y,z,ry)=>{
    const m=new THREE.Mesh(geo,mat);
    m.position.set(x||0,y||0,z||0);
    if(ry)m.rotation.y=ry;
    m.castShadow=m.receiveShadow=true;
    G.add(m);return m;
  };
  const B =(w,h,d,mat,x,y,z,ry)=>mk(new THREE.BoxGeometry(w,h,d),mat,x,y,z,ry);
  const CY=(rt,rb,h,s,mat,x,y,z) =>mk(new THREE.CylinderGeometry(rt,rb,h,s||16),mat,x,y,z);
  const SP=(r,mat,x,y,z)          =>mk(new THREE.SphereGeometry(r,16,12),mat,x,y,z);
  const RB=(w,h,d,r,mat,x,y,z)   =>mk(rboxGeo(w,h,d,r),mat,x,y,z);

  switch(type){
    case 'sofa':
      B(2.4,0.18,0.95,woodMat(0x4A3020),0,0.09,0);
      RB(0.72,0.22,0.82,0.04,fabMat(C),-0.8,0.31,0.02);
      RB(0.72,0.22,0.82,0.04,fabMat(Cl),0,0.31,0.02);
      RB(0.72,0.22,0.82,0.04,fabMat(C),0.8,0.31,0.02);
      RB(0.72,0.62,0.18,0.05,fabMat(Cd),-0.8,0.65,-0.35);
      RB(0.72,0.62,0.18,0.05,fabMat(C),0,0.65,-0.35);
      RB(0.72,0.62,0.18,0.05,fabMat(Cd),0.8,0.65,-0.35);
      RB(0.22,0.55,0.95,0.06,fabMat(Cd),-1.09,0.42,0);
      RB(0.22,0.55,0.95,0.06,fabMat(Cd),1.09,0.42,0);
      [[-1,0.32],[-1,-0.35],[1,0.32],[1,-0.35]].forEach(([lx,lz])=>CY(0.04,0.055,0.18,8,woodMat(0x3D2B1F),lx,0.09,lz));
      break;
    case 'armchair':
      RB(0.9,0.2,0.82,0.04,fabMat(C),0,0.24,0);
      B(0.9,0.1,0.82,woodMat(0x4A3020),0,0.14,0);
      RB(0.9,0.68,0.2,0.06,fabMat(Cd),0,0.6,-0.31);
      RB(0.18,0.5,0.82,0.05,fabMat(Cd),-0.36,0.44,0);
      RB(0.18,0.5,0.82,0.05,fabMat(Cd),0.36,0.44,0);
      [[-0.3,0.3],[-0.3,-0.3],[0.3,0.3],[0.3,-0.3]].forEach(([lx,lz])=>CY(0.04,0.05,0.16,8,woodMat(0x3D2B1F),lx,0.08,lz));
      break;
    case 'bed_double':
      B(1.8,0.28,2.2,woodMat(C),0,0.14,0);
      RB(1.7,0.22,1.9,0.05,bedMat(),0,0.39,0.1);
      B(1.8,0.72,0.14,woodMat(C),0,0.5,-0.97);
      B(1.8,0.2,0.12,woodMat(C),0,0.14,0.97);
      RB(0.52,0.12,0.36,0.05,fabMat(0xF0EBE3),-0.46,0.52,-0.62);
      RB(0.52,0.12,0.36,0.05,fabMat(0xF0EBE3),0.46,0.52,-0.62);
      [[-0.82,-0.92],[-0.82,0.92],[0.82,-0.92],[0.82,0.92]].forEach(([lx,lz])=>CY(0.06,0.07,0.16,8,woodMat(C),lx,0.08,lz));
      break;
    case 'bed_single':
      B(1.0,0.26,2.1,woodMat(C),0,0.13,0);
      RB(0.9,0.2,1.85,0.04,bedMat(),0,0.37,0.1);
      B(1.0,0.65,0.13,woodMat(C),0,0.45,-0.97);
      RB(0.52,0.11,0.32,0.04,fabMat(0xF0EBE3),0,0.49,-0.65);
      [[-0.42,-0.92],[-0.42,0.92],[0.42,-0.92],[0.42,0.92]].forEach(([lx,lz])=>CY(0.05,0.06,0.14,8,woodMat(C),lx,0.07,lz));
      break;
    case 'dining_table':
      B(1.6,0.07,0.9,woodMat(C),0,0.72,0);
      [[-0.7,0.38],[-0.7,-0.38],[0.7,0.38],[0.7,-0.38]].forEach(([lx,lz])=>CY(0.04,0.05,0.72,8,woodMat(C),lx,0.36,lz));
      break;
    case 'dining_chair':
      B(0.46,0.05,0.44,woodMat(C),0,0.44,0);
      RB(0.4,0.06,0.4,0.03,fabMat(Cd),0,0.49,0);
      B(0.46,0.65,0.06,woodMat(C),0,0.77,-0.18);
      [[-0.18,0.18],[-0.18,-0.18],[0.18,0.18],[0.18,-0.18]].forEach(([lx,lz])=>CY(0.025,0.03,0.44,8,woodMat(C),lx,0.22,lz));
      break;
    case 'chair':
      B(0.5,0.05,0.5,woodMat(C),0,0.46,0);
      RB(0.44,0.07,0.44,0.04,fabMat(C),0,0.51,0);
      B(0.5,0.72,0.06,woodMat(C),0,0.84,-0.21);
      [[-0.2,0.2],[-0.2,-0.2],[0.2,0.2],[0.2,-0.2]].forEach(([lx,lz])=>CY(0.025,0.03,0.46,8,woodMat(C),lx,0.23,lz));
      break;
    case 'wardrobe':
      B(1.8,2.2,0.6,woodMat(C),0,1.1,0);
      B(0.06,2.18,0.62,woodMat(Cd),0,1.1,0);
      B(1.78,0.05,0.58,woodMat(Cd),0,2.17,0);
      B(1.78,0.05,0.58,woodMat(Cd),0,0.03,0);
      CY(0.025,0.025,0.08,8,metMat(0xD4AF37),-0.44,1.2,0.32);
      CY(0.025,0.025,0.08,8,metMat(0xD4AF37),0.44,1.2,0.32);
      break;
    case 'tv_unit':
      B(1.8,0.52,0.45,woodMat(C),0,0.26,0);
      B(1.76,0.04,0.41,woodMat(Cd),0,0.52,0);
      B(0.04,0.5,0.43,woodMat(Cd),-0.6,0.26,0);
      B(0.04,0.5,0.43,woodMat(Cd),0.6,0.26,0);
      B(1.55,0.88,0.06,new THREE.MeshStandardMaterial({color:0x111111,roughness:0.2,metalness:0.4}),0,1.44,0.18);
      B(1.45,0.78,0.02,new THREE.MeshStandardMaterial({color:0x080808,roughness:0.05}),0,1.46,0.21);
      break;
    case 'bookshelf':
      B(1.0,2.0,0.32,woodMat(C),0,1.0,0);
      [-0.7,-0.28,0.14,0.56,0.98].forEach(y=>B(0.96,0.04,0.3,woodMat(Cd),0,y+1.0,0));
      [0x8B2020,0x205080,0x408020,0xA06020,0x602080].forEach((bc,i)=>
        B(0.08,0.28,0.24,new THREE.MeshStandardMaterial({color:bc,roughness:0.85}),(i-2)*0.16,0.62,0.02));
      break;
    case 'coffee_table':
      B(1.1,0.06,0.6,woodMat(C),0,0.38,0);
      B(1.04,0.04,0.54,glassMat(),0,0.41,0);
      [[-0.48,0.25],[-0.48,-0.25],[0.48,0.25],[0.48,-0.25]].forEach(([lx,lz])=>CY(0.03,0.04,0.38,8,woodMat(C),lx,0.19,lz));
      break;
    case 'lamp':
      CY(0.06,0.09,0.05,16,metMat(0xC8A040),0,0.025,0);
      CY(0.025,0.025,1.55,8,metMat(0xC8A040),0,0.8,0);
      mk(new THREE.CylinderGeometry(0.28,0.18,0.32,24),
        new THREE.MeshStandardMaterial({color:0xF5E6C8,roughness:0.7,emissive:0x332200,emissiveIntensity:0.5}),
        0,1.78,0.3);
      break;
    case 'plant':
      CY(0.18,0.14,0.32,16,new THREE.MeshStandardMaterial({color:0xB05A30,roughness:0.85}),0,0.16,0);
      SP(0.28,new THREE.MeshStandardMaterial({color:0x2D6A2D,roughness:0.9}),0,0.56,0);
      SP(0.2,new THREE.MeshStandardMaterial({color:0x3D7A3D,roughness:0.9}),0.16,0.63,0.1);
      SP(0.18,new THREE.MeshStandardMaterial({color:0x255225,roughness:0.9}),-0.14,0.61,-0.08);
      break;
    case 'mirror':
      B(0.08,1.4,0.04,woodMat(C),-0.62,0.7,0);
      B(0.08,1.4,0.04,woodMat(C),0.62,0.7,0);
      B(1.28,0.08,0.04,woodMat(C),0,1.36,0);
      B(1.28,0.08,0.04,woodMat(C),0,0.04,0);
      B(1.12,1.22,0.02,glassMat(),0,0.7,0.01);
      break;
    case 'desk':
      B(1.4,0.05,0.7,woodMat(C),0,0.74,0);
      [[-0.64,0.3],[0.64,0.3],[-0.64,-0.3],[0.64,-0.3]].forEach(([lx,lz])=>CY(0.04,0.05,0.74,8,metMat(0x888888),lx,0.37,lz));
      B(0.6,0.38,0.04,new THREE.MeshStandardMaterial({color:0x111111,roughness:0.3,metalness:0.5}),0,1.02,0.16);
      CY(0.04,0.04,0.22,8,metMat(0x888888),0,0.89,0.16);
      B(0.22,0.03,0.12,metMat(0x888888),0,0.78,0.16);
      break;
    default:
      B(0.6,0.6,0.6,woodMat(C),0,0.3,0);
  }
  return G;
}

/* ═══════════════════════════════════════════════════════════
   initFurniturePlacement(containerId, savedLayout, onSave)
   ═══════════════════════════════════════════════════════════ */
function initFurniturePlacement(containerId, savedLayout, onSave){
  const container = document.getElementById(containerId);
  if(!container){ console.warn('[furniture3d] container not found:', containerId); return null; }

  // Cleanup previous
  if(_fScenes[containerId]){
    try{ _fScenes[containerId].renderer.dispose(); }catch{}
    try{ _fScenes[containerId]._ro.disconnect(); }catch{}
    delete _fScenes[containerId];
  }

  container.innerHTML='';
  Object.assign(container.style,{position:'relative',overflow:'hidden',background:'#100d08'});

  /* ── GLB room background via model-viewer ── */
  const mv=document.createElement('model-viewer');
  mv.setAttribute('src','../models/interior-room.glb');
  mv.setAttribute('alt','Room');
  mv.setAttribute('shadow-intensity','1');
  mv.setAttribute('environment-image','neutral');
  mv.setAttribute('exposure','1.1');
  mv.setAttribute('camera-orbit','0deg 65deg 7m');
  mv.setAttribute('field-of-view','42deg');
  // CRITICAL: pointer-events:none so canvas gets ALL mouse/pointer events
  mv.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:1;--progress-bar-height:0px;pointer-events:none;';
  container.appendChild(mv);

  /* loading overlay */
  const spin=document.createElement('div');
  spin.style.cssText='position:absolute;inset:0;background:#100d08;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:none;transition:opacity 0.5s;';
  spin.innerHTML='<div style="width:38px;height:38px;border:3px solid rgba(201,169,110,0.2);border-top-color:#C9A96E;border-radius:50%;animation:spin 0.8s linear infinite;"></div><span style="color:#C9A96E;font-size:12px;font-family:DM Sans,sans-serif;font-weight:600;">Loading room…</span>';
  container.appendChild(spin);
  const hideSpin=()=>{spin.style.opacity='0';setTimeout(()=>{try{spin.remove();}catch{}},600);};
  mv.addEventListener('load',hideSpin,{once:true});
  setTimeout(hideSpin,7000);

  /* ── Three.js canvas (transparent, on top of GLB) ── */
  const W=container.clientWidth||800, H=container.clientHeight||520;
  const canvas=document.createElement('canvas');
  canvas.width=W; canvas.height=H;
  // z-index:3 — above model-viewer(1) and spinner(20 only during load)
  canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:10;display:block;touch-action:none;cursor:grab;';
  container.appendChild(canvas);

  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setSize(W,H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.setClearColor(0,0);  // fully transparent
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;

  const scene=new THREE.Scene();  // transparent background

  /* Camera — fixed overhead angle, matches GLB room view */
  let camT=0.52, camP=0.0, camD=13;
  const camera=new THREE.PerspectiveCamera(42,W/H,0.1,100);

  function moveCam(){
    camera.position.set(
      camD*Math.sin(camT)*Math.sin(camP),
      camD*Math.cos(camT)+1.5,
      camD*Math.sin(camT)*Math.cos(camP)
    );
    camera.lookAt(0,0.8,0);
    camera.updateProjectionMatrix();
  }
  moveCam();

  /* Lighting — bright to match GLB */
  scene.add(new THREE.AmbientLight(0xffffff,2.0));
  const sun=new THREE.DirectionalLight(0xFFFDF0,2.5);
  sun.position.set(6,12,8);scene.add(sun);
  scene.add(Object.assign(new THREE.DirectionalLight(0xCCDDFF,0.6),{position:new THREE.Vector3(-5,8,-5)}));

  /* Ground plane at Y=0 for raycasting — always intersects */
  const GPLANE=new THREE.Plane(new THREE.Vector3(0,1,0),0); // Y=0 plane

  /* Furniture */
  const CATALOG=[
    {id:'sofa',         label:'Sofa',         color:0x5D5A7E,icon:'🛋️'},
    {id:'armchair',     label:'Armchair',     color:0x7B4F3A,icon:'🪑'},
    {id:'bed_double',   label:'Double Bed',   color:0x7B4F2A,icon:'🛏️'},
    {id:'bed_single',   label:'Single Bed',   color:0x7A8B6E,icon:'🛏️'},
    {id:'dining_table', label:'Dining Table', color:0xA0734A,icon:'🍽️'},
    {id:'dining_chair', label:'Dining Chair', color:0xA0734A,icon:'🪑'},
    {id:'chair',        label:'Chair',        color:0x8B6040,icon:'🪑'},
    {id:'wardrobe',     label:'Wardrobe',     color:0x9B7B5A,icon:'🚪'},
    {id:'tv_unit',      label:'TV Unit',      color:0x4A3A2A,icon:'📺'},
    {id:'bookshelf',    label:'Bookshelf',    color:0x8B6A3A,icon:'📚'},
    {id:'coffee_table', label:'Coffee Table', color:0xA08060,icon:'☕'},
    {id:'lamp',         label:'Floor Lamp',   color:0xC0A060,icon:'💡'},
    {id:'plant',        label:'Indoor Plant', color:0x3A6A40,icon:'🪴'},
    {id:'mirror',       label:'Mirror',       color:0xC8A060,icon:'🪞'},
    {id:'desk',         label:'Desk',         color:0x9B7A4A,icon:'🖥️'},
  ];

  const placed=[];
  savedLayout=savedLayout||{};
  Object.entries(savedLayout).forEach(([key,data])=>{
    if(!data)return;
    const cat=CATALOG.find(c=>c.id===key);if(!cat)return;
    (Array.isArray(data)?data:[data]).forEach(item=>{
      if(item.visible===false)return;
      const grp=buildFurniture(cat.id,cat.color);
      grp.position.set(item.x||0,0,item.z||0);
      grp.rotation.y=item.rotY||0;
      scene.add(grp);
      placed.push({grp,type:cat.id,rotY:item.rotY||0});
    });
  });

  /* ── Interaction ── */
  const rc=new THREE.Raycaster();
  const uv=new THREE.Vector2();
  let sel=null, isDragging=false, isRightDrag=false;
  let lastPtr={x:0,y:0};
  let dDelta={x:0,z:0}; // grab-point offset

  function panelId(){
    return({'c3d-tfurn':'tfurn-action-panel','c3d-furn':'furn-action-panel',
            'c3d-furnpage':'furn-page-controls','c3d-lfurnpage':'lfurn-controls'}[containerId]||'furn-action-panel');
  }

  function glow(obj,on){
    if(!obj)return;
    obj.grp.traverse(m=>{if(m.isMesh&&m.material?.emissive)m.material.emissive.setHex(on?0x221800:0);});
  }

  function selectItem(obj){
    glow(sel,false); sel=obj; glow(sel,true);
    const p=document.getElementById(panelId());
    if(p) p.style.display=obj?'flex':'none';
  }

  /* Get NDC coords from client coords relative to canvas */
  function toNDC(cx,cy){
    const r=canvas.getBoundingClientRect();
    uv.x= 2*(cx-r.left)/r.width -1;
    uv.y=-2*(cy-r.top) /r.height+1;
  }

  /* Project screen point → Y=0 world point.
     Uses THREE.Plane.intersectRay which NEVER fails for non-parallel rays. */
  function toGround(cx,cy){
    toNDC(cx,cy);
    rc.setFromCamera(uv,camera);
    const pt=new THREE.Vector3();
    // intersectLine with ground plane — always returns a point
    rc.ray.intersectPlane(GPLANE,pt);
    return pt; // may be very far if camera is nearly horizontal — clamp later
  }

  /* Hit-test placed furniture */
  function hitTest(cx,cy){
    toNDC(cx,cy);
    rc.setFromCamera(uv,camera);
    const all=[];placed.forEach(p=>p.grp.traverse(m=>{if(m.isMesh)all.push(m);}));
    const hits=rc.intersectObjects(all,false);
    if(!hits.length)return null;
    for(const p of placed){let f=false;p.grp.traverse(m=>{if(m===hits[0].object)f=true;});if(f)return p;}
    return null;
  }

  const BOUND=3.8;
  const clamp=v=>Math.max(-BOUND,Math.min(BOUND,v));

  /* Pointer down — select + start drag */
  // Track active pointers for pinch-zoom and two-finger orbit
  const activePointers={};
  let pinchDist0=0;

  canvas.addEventListener('pointerdown',e=>{
    canvas.setPointerCapture(e.pointerId);
    activePointers[e.pointerId]={x:e.clientX,y:e.clientY};

    // Right-click OR ctrl+click OR two-finger tap → orbit mode
    const isOrbitBtn = e.button===2 || e.ctrlKey || e.button===1;
    if(isOrbitBtn){isRightDrag=true;lastPtr={x:e.clientX,y:e.clientY};e.preventDefault();return;}

    // Two fingers already down → start pinch/orbit (handled in pointermove)
    if(Object.keys(activePointers).length>=2){
      isRightDrag=true;
      const pts=Object.values(activePointers);
      pinchDist0=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      lastPtr={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};
      isDragging=false; selectItem(null);
      return;
    }

    const hit=hitTest(e.clientX,e.clientY);
    if(hit){
      selectItem(hit);
      isDragging=true;
      // Store offset between grab-point on ground and object center
      const gp=toGround(e.clientX,e.clientY);
      dDelta={x:hit.grp.position.x-gp.x, z:hit.grp.position.z-gp.z};
      canvas.style.cursor='grabbing';
    } else {
      // Empty area single-finger drag → orbit
      selectItem(null);
      isRightDrag=true;
      lastPtr={x:e.clientX,y:e.clientY};
    }
  });

  /* Pointer move — drag object OR orbit camera */
  canvas.addEventListener('pointermove',e=>{
    if(e.pointerId in activePointers) activePointers[e.pointerId]={x:e.clientX,y:e.clientY};

    // Two-finger pinch+orbit
    const pts=Object.values(activePointers);
    if(pts.length>=2){
      const cx=(pts[0].x+pts[1].x)/2, cy=(pts[0].y+pts[1].y)/2;
      const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      if(pinchDist0){
        camD=Math.max(4,Math.min(22,camD*(pinchDist0/dist)));
        pinchDist0=dist;
      }
      camP-=(cx-lastPtr.x)*0.005;
      camT=Math.max(0.2,Math.min(1.4,camT+(cy-lastPtr.y)*0.005));
      lastPtr={x:cx,y:cy};
      moveCam();return;
    }

    if(isRightDrag){
      camP-=(e.clientX-lastPtr.x)*0.005;
      camT=Math.max(0.2,Math.min(1.4,camT+(e.clientY-lastPtr.y)*0.005));
      lastPtr={x:e.clientX,y:e.clientY};
      moveCam();return;
    }
    if(!isDragging||!sel)return;
    const gp=toGround(e.clientX,e.clientY);
    // Apply stored delta so object follows from grab point, not center
    sel.grp.position.set(clamp(gp.x+dDelta.x), 0, clamp(gp.z+dDelta.z));
  });

  /* Pointer up — stop drag */
  canvas.addEventListener('pointerup',e=>{
    canvas.releasePointerCapture(e.pointerId);
    delete activePointers[e.pointerId];
    if(Object.keys(activePointers).length<2){pinchDist0=0;}
    if(e.button===2||isRightDrag&&!isDragging){isRightDrag=false;return;}
    isDragging=false;
    isRightDrag=false;
    canvas.style.cursor='default';
  });

  canvas.addEventListener('pointercancel',e=>{
    delete activePointers[e.pointerId];
    isDragging=false; isRightDrag=false; pinchDist0=0;
    canvas.style.cursor='default';
  });

  canvas.addEventListener('wheel',e=>{
    camD=Math.max(4,Math.min(22,camD+e.deltaY*0.02));
    moveCam();e.preventDefault();
  },{passive:false});

  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  /* ── Public API ── */
  function addFurniture(type,colorHex){
    const cat=CATALOG.find(c=>c.id===type);
    const grp=buildFurniture(type,colorHex||cat?.color||0x888888);
    grp.position.set((Math.random()-0.5)*3,0,(Math.random()-0.5)*3);
    scene.add(grp);
    const item={grp,type,rotY:0};
    placed.push(item);
    selectItem(item);
  }

  function rotateSelected(deg){
    if(!sel)return;
    sel.rotY+=deg*Math.PI/180;
    sel.grp.rotation.y=sel.rotY;
  }

  function deleteSelected(){
    if(!sel)return;
    scene.remove(sel.grp);
    placed.splice(placed.indexOf(sel),1);
    selectItem(null);
  }

  function getLayout(){
    const out={};
    placed.forEach(p=>{
      if(!out[p.type])out[p.type]=[];
      out[p.type].push({x:+(p.grp.position.x.toFixed(2)),z:+(p.grp.position.z.toFixed(2)),rotY:+(p.rotY.toFixed(2)),visible:true});
    });
    return out;
  }

  /* Render loop */
  (function loop(){requestAnimationFrame(loop);renderer.render(scene,camera);})();

  /* Resize */
  const _ro=new ResizeObserver(()=>{
    const w=container.clientWidth,h=container.clientHeight;
    if(!w||!h)return;
    canvas.width=w;canvas.height=h;
    renderer.setSize(w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  });
  _ro.observe(container);

  const sc={renderer,scene,camera,placed,CATALOG,_ro,addFurniture,rotateSelected,deleteSelected,getLayout};
  _fScenes[containerId]=sc;
  return sc;
}

function getFurnitureScene(id){return _fScenes[id];}

function downloadFurnitureScreenshot(cid,fname){
  const sc=_fScenes[cid];if(!sc)return;
  sc.renderer.render(sc.scene,sc.camera);
  const a=document.createElement('a');
  a.href=sc.renderer.domElement.toDataURL('image/png');
  a.download=(fname||'layout')+'.png';a.click();
}

function downloadFurnitureJSON(cid,title,role){
  const sc=_fScenes[cid];if(!sc)return;
  const a=document.createElement('a');
  const blob=new Blob([JSON.stringify({property:title||'Property',role:role||'layout',
    savedAt:new Date().toISOString(),furniture:sc.getLayout()},null,2)],{type:'application/json'});
  a.href=URL.createObjectURL(blob);
  a.download=(title||'furniture').replace(/\s+/g,'-')+'-'+(role||'layout')+'.json';
  a.click();URL.revokeObjectURL(a.href);
}
