/* ============================================================
   TMS — furniture3d.js  v3.0
   Photorealistic furniture via Three.js PBR materials + 
   high-detail procedural geometry — no external GLB needed
   ============================================================ */

const _fScenes = {};

// ── PBR Material helpers ────────────────────────────────────
// ── Material factory functions ───────────────────────────────
// Each returns a fresh MeshStandardMaterial with PBR properties
// tuned for that surface type. Pass hex to override base color.

/** Warm wood — matte, no metalness */
function woodMat(hex) {
  return new THREE.MeshStandardMaterial({
    color:     hex || 0x8B5E3C,
    roughness: 0.75,
    metalness: 0.0,
  });
}

/** Upholstery fabric — very rough, soft appearance */
function fabricMat(hex) {
  return new THREE.MeshStandardMaterial({
    color:     hex || 0x6B7A8D,
    roughness: 0.95,
    metalness: 0.0,
  });
}

/** Brushed / polished metal — low roughness, high metalness */
function metalMat(hex) {
  return new THREE.MeshStandardMaterial({
    color:     hex || 0xB0B0B0,
    roughness: 0.25,
    metalness: 0.9,
  });
}

/** Transparent glass — near-zero roughness, slight metalness */
function glassMat() {
  return new THREE.MeshStandardMaterial({
    color:       0xBBDDFF,
    roughness:   0.05,
    metalness:   0.1,
    transparent: true,
    opacity:     0.35,
  });
}

/** Leather — semi-rough, very slight sheen */
function leatherMat(hex) {
  return new THREE.MeshStandardMaterial({
    color:     hex || 0x3D2B1F,
    roughness: 0.6,
    metalness: 0.05,
  });
}

/** Mattress fabric — off-white, very rough */
function mattressMat() {
  return new THREE.MeshStandardMaterial({
    color:     0xF2EEE8,
    roughness: 0.9,
  });
}

/** Concrete / plaster — matte, no metalness */
function concreteMat(hex) {
  return new THREE.MeshStandardMaterial({
    color:     hex || 0xC8C0B4,
    roughness: 0.85,
    metalness: 0.0,
  });
}

// ── Rounded box via shape extrude ───────────────────────────
function roundedBox(w,h,d,r,segs){
  r = Math.min(r||0, w/2-0.001, h/2-0.001, d/2-0.001);
  segs = segs||2;
  const shape = new THREE.Shape();
  const x=-w/2+r, y=-h/2+r, X=w/2-r, Y=h/2-r;
  shape.moveTo(x-r, y);
  shape.lineTo(X+r, y);
  shape.absarc(X, y, r, -Math.PI/2, 0, false);
  shape.lineTo(X+r, Y);
  shape.absarc(X, Y, r, 0, Math.PI/2, false);
  shape.lineTo(x-r, Y+r);
  shape.absarc(x, Y, r, Math.PI/2, Math.PI, false);
  shape.lineTo(x-r, y);
  shape.absarc(x, y, r, Math.PI, 3*Math.PI/2, false);
  const extrudeSettings = { depth:d, bevelEnabled:false, steps:1 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

// ═══════════════════════════════════════════════════════════════
//  buildFurniture  —  Procedural 3D furniture generator
//  Builds a THREE.Group containing all meshes for one furniture item.
//  All geometry is procedural — no external GLB / OBJ files needed.
//
//  @param {THREE.Scene} scene    - scene to add the group to
//  @param {string}      type     - furniture type key (e.g. 'sofa', 'bed_double')
//  @param {number}      colorHex - base color as Three.js integer
//  @returns {THREE.Group}
// ═══════════════════════════════════════════════════════════════
function buildFurniture(scene, type, colorHex) {
  const g = new THREE.Group();

  // ── Internal mesh helper ────────────────────────────────────
  // Creates a mesh, positions/rotates it, enables shadows, adds to group
  function add(geo, mat, x, y, z, rx, ry, rz) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    if (rx) m.rotation.x = rx;
    if (ry) m.rotation.y = ry;
    if (rz) m.rotation.z = rz;
    m.castShadow    = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }

  /** Shorthand: box mesh */
  function box(w, h, d, mat, x, y, z, rx, ry, rz) {
    return add(new THREE.BoxGeometry(w, h, d, 1, 1, 1), mat, x, y, z, rx, ry, rz);
  }
  /** Shorthand: cylinder mesh */
  function cyl(rt, rb, h, seg, mat, x, y, z, rx, ry, rz) {
    return add(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat, x, y, z, rx, ry, rz);
  }

  /** Shorthand: sphere mesh */
  function sph(r, mat, x, y, z) {
    return add(new THREE.SphereGeometry(r, 16, 12), mat, x, y, z);
  }

  /** Shorthand: rounded-corner box mesh */
  function rbox(w, h, d, r, mat, x, y, z) {
    return add(roundedBox(w, h, d, r), mat, x, y, z);
  }

  /** Shorthand: torus mesh */
  function tor(R, r, seg, tseg, mat, x, y, z, rx) {
    return add(new THREE.TorusGeometry(R, r, seg || 8, tseg || 24), mat, x, y, z, rx || 0, 0, 0);
  }

  // ── Color variants derived from the base color ──────────────
  const C      = colorHex || 0x8B5E3C;
  const Cdark  = Math.max(0,        C - 0x303030); // darker shade for contrast
  const Clight = Math.min(0xFFFFFF, C + 0x404040); // lighter shade for highlights

  // ── Build geometry based on furniture type ────────────────────
  switch (type) {

    // ══════════════════════════════════════════════════════════
    case 'sofa': {
      const fab   = fabricMat(C);
      const fabD  = fabricMat(Cdark);
      const fabL  = fabricMat(Clight);
      const legM  = woodMat(0x3D2B1F);

      // Base frame
      box(2.4,0.18,0.95, woodMat(0x4A3020), 0,0.09,0);
      // Seat cushions (3 separate, rounded)
      rbox(0.72,0.22,0.82,0.04, fab, -0.8,0.31,0.02);
      rbox(0.72,0.22,0.82,0.04, fabL,  0.0,0.31,0.02);
      rbox(0.72,0.22,0.82,0.04, fab,   0.8,0.31,0.02);
      // Back cushions (3 separate)
      rbox(0.72,0.62,0.18,0.05, fabD,-0.8,0.65,-0.35);
      rbox(0.72,0.62,0.18,0.05, fab,  0.0,0.65,-0.35);
      rbox(0.72,0.62,0.18,0.05, fabD, 0.8,0.65,-0.35);
      // Arms (rounded)
      rbox(0.22,0.55,0.95,0.06, fabD,-1.09,0.42,0);
      rbox(0.22,0.55,0.95,0.06, fabD, 1.09,0.42,0);
      // Arm tops (flat cushion-like)
      rbox(0.22,0.08,0.95,0.03, fab,-1.09,0.72,0);
      rbox(0.22,0.08,0.95,0.03, fab, 1.09,0.72,0);
      // Back frame panel
      box(2.4,0.08,0.12, woodMat(0x4A3020), 0,1.0,-0.42);
      // Legs (turned wood look)
      [[-1.0,0.32],[-1.0,-0.35],[1.0,0.32],[1.0,-0.35]].forEach(([lx,lz])=>{
        cyl(0.04,0.055,0.18,8, legM, lx,0.09,lz);
        cyl(0.025,0.04,0.04,8, legM, lx,0.18,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'armchair': {
      const fab  = fabricMat(C);
      const fabD = fabricMat(Cdark);
      const legM = woodMat(0x3D2B1F);
      // Seat
      rbox(0.9,0.2,0.82,0.04, fab, 0,0.24,0);
      // Seat base
      box(0.9,0.1,0.82, woodMat(0x4A3020), 0,0.14,0);
      // Back cushion
      rbox(0.9,0.68,0.2,0.06, fabD, 0,0.6,-0.31);
      // Arms
      rbox(0.18,0.5,0.82,0.05, fabD,-0.36,0.44,0);
      rbox(0.18,0.5,0.82,0.05, fabD, 0.36,0.44,0);
      // Arm tops
      rbox(0.2,0.07,0.82,0.03, fab,-0.36,0.72,0);
      rbox(0.2,0.07,0.82,0.03, fab, 0.36,0.72,0);
      // Back top rail
      box(0.9,0.06,0.1, woodMat(0x3A2010), 0,0.97,-0.33);
      // Legs
      [[-0.32,0.28],[-0.32,-0.28],[0.32,0.28],[0.32,-0.28]].forEach(([lx,lz])=>{
        cyl(0.038,0.048,0.2,8, legM, lx,0.1,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'bed_double': {
      const WM = woodMat(C||0x7B4F2A);
      const WD = woodMat(Cdark);
      const legM = woodMat(0x2A1A08);
      // Platform base
      box(1.95,0.18,2.3, WD, 0,0.09,0);
      // Mattress
      rbox(1.82,0.26,2.05,0.05, mattressMat(), 0,0.31,0.04);
      // Mattress top fabric line detail
      box(1.82,0.03,2.05, new THREE.MeshStandardMaterial({color:0xEEE8E0,roughness:0.95}), 0,0.45,0.04);
      // Two pillows
      rbox(0.72,0.1,0.42,0.06, new THREE.MeshStandardMaterial({color:0xFFFAF5,roughness:0.9}), -0.44,0.49,-0.75);
      rbox(0.72,0.1,0.42,0.06, new THREE.MeshStandardMaterial({color:0xFFF8F0,roughness:0.9}),  0.44,0.49,-0.75);
      // Headboard
      box(1.95,0.08,0.08, WD, 0,0.26,-1.12);
      box(1.95,0.88,0.12, WM, 0,0.75,-1.12);
      // Headboard panel detail
      box(1.65,0.62,0.04, WD, 0,0.75,-1.07);
      // Footboard
      box(1.95,0.42,0.1, WM, 0,0.3, 1.14);
      // Legs
      [[-0.88,-1.05],[-0.88,1.05],[0.88,-1.05],[0.88,1.05]].forEach(([lx,lz])=>{
        cyl(0.05,0.06,0.18,8, legM, lx,0.09,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'bed_single': {
      const WM = woodMat(C||0x7B4F2A);
      const WD = woodMat(Cdark);
      const legM = woodMat(0x2A1A08);
      box(1.05,0.16,2.1, WD, 0,0.08,0);
      rbox(0.95,0.24,1.92,0.04, mattressMat(), 0,0.28,0.05);
      rbox(0.82,0.1,0.4,0.05, new THREE.MeshStandardMaterial({color:0xFFFAF5,roughness:0.9}), 0,0.44,-0.72);
      // Headboard
      box(1.05,0.82,0.1, WM, 0,0.6,-1.05);
      box(0.82,0.58,0.04, WD, 0,0.6,-1.01);
      // Footboard
      box(1.05,0.34,0.08, WM, 0,0.25,1.05);
      [[-0.44,-0.98],[-0.44,0.98],[0.44,-0.98],[0.44,0.98]].forEach(([lx,lz])=>{
        cyl(0.04,0.05,0.16,8, legM, lx,0.08,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'dining_table': {
      const WM = woodMat(C||0xA0734A);
      const WD = woodMat(Cdark);
      // Tabletop — thick, rounded edges
      rbox(1.7,0.06,0.9,0.025, WM, 0,0.78,0);
      // Apron
      box(1.56,0.07,0.05, WD, 0,0.72, 0.41);
      box(1.56,0.07,0.05, WD, 0,0.72,-0.41);
      box(0.05,0.07,0.82, WD, 0.80,0.72,0);
      box(0.05,0.07,0.82, WD,-0.80,0.72,0);
      // Legs — tapered
      [[-0.76,0.37],[-0.76,-0.37],[0.76,0.37],[0.76,-0.37]].forEach(([lx,lz])=>{
        cyl(0.04,0.055,0.75,8, WD, lx,0.375,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'dining_chair': {
      const WM = woodMat(C||0xA0734A);
      const WD = woodMat(Cdark);
      const fab = fabricMat(Clight);
      // Seat with upholstery
      box(0.46,0.06,0.46, WM, 0,0.46,0);
      rbox(0.4,0.07,0.4,0.03, fab, 0,0.5,0);
      // Back uprights
      box(0.04,0.52,0.04, WD,-0.18,0.75,-0.2);
      box(0.04,0.52,0.04, WD, 0.18,0.75,-0.2);
      // Back slat x3
      box(0.38,0.04,0.03, WM, 0,0.62,-0.19);
      box(0.38,0.04,0.03, WM, 0,0.78,-0.19);
      box(0.38,0.04,0.03, WM, 0,0.94,-0.19);
      // Top rail
      box(0.46,0.04,0.04, WD, 0,1.01,-0.2);
      // Legs
      [[-0.18,0.18],[-0.18,-0.18],[0.18,0.18],[0.18,-0.18]].forEach(([lx,lz])=>{
        cyl(0.025,0.03,0.46,8, WD, lx,0.23,lz);
      });
      // Stretchers
      box(0.36,0.025,0.025, WD, 0,0.18,0);
      box(0.025,0.025,0.36, WD, 0,0.18,0);
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'chair': {
      const WM = woodMat(C||0x8B6040);
      const fab = fabricMat(Clight);
      rbox(0.48,0.08,0.48,0.03, fab, 0,0.47,0);
      box(0.48,0.04,0.48, WM, 0,0.43,0);
      // Back uprights
      box(0.04,0.56,0.04, WM,-0.2,0.74,-0.22);
      box(0.04,0.56,0.04, WM, 0.2,0.74,-0.22);
      // Cross slats
      box(0.44,0.035,0.03, WM, 0,0.72,-0.21);
      box(0.44,0.035,0.03, WM, 0,0.88,-0.21);
      box(0.44,0.04,0.04, WM, 0,1.03,-0.21);
      // Legs
      [[-0.19,0.2],[-0.19,-0.2],[0.19,0.2],[0.19,-0.2]].forEach(([lx,lz])=>{
        cyl(0.024,0.03,0.44,8, WM, lx,0.22,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'wardrobe': {
      const WM = woodMat(C||0x9B7B5A);
      const WD = woodMat(Cdark);
      const WL = woodMat(Clight);
      const HM = metalMat(0xC8B860);
      // Carcass
      box(1.65,2.15,0.58, WD, 0,1.075,0);
      // Door panels (2 doors, inset)
      box(0.77,1.95,0.03, WL,-0.41,1.08,0.29);
      box(0.77,1.95,0.03, WL, 0.41,1.08,0.29);
      // Door inset recessed detail
      box(0.62,1.6,0.02, WM,-0.41,1.08,0.31);
      box(0.62,1.6,0.02, WM, 0.41,1.08,0.31);
      // Door edge shadow gap
      box(0.01,1.95,0.05, WD, 0.0,1.08,0.28);
      // Handles
      cyl(0.013,0.013,0.14,8, HM,-0.08,1.08,0.325,Math.PI/2);
      cyl(0.013,0.013,0.14,8, HM, 0.08,1.08,0.325,Math.PI/2);
      // Crown moulding
      box(1.72,0.07,0.64, WM, 0,2.19,0);
      box(1.72,0.04,0.72, WD, 0,2.15,-0.02);
      // Base plinth
      box(1.65,0.07,0.58, WD, 0,0.035,0);
      // Center divider
      box(0.03,2.0,0.54, WD, 0,1.0,0);
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'tv_unit': {
      const WM = woodMat(C||0x5A4A3A);
      const WD = woodMat(Cdark);
      const WL = woodMat(Clight);
      const HM = metalMat(0x909090);
      // Main cabinet
      box(1.85,0.48,0.42, WD, 0,0.24,0);
      // Cabinet top
      box(1.85,0.03,0.44, WM, 0,0.495,0);
      // Three doors
      box(0.54,0.38,0.025, WL,-0.62,0.24,0.22);
      box(0.54,0.38,0.025, WL,  0.0,0.24,0.22);
      box(0.54,0.38,0.025, WL, 0.62,0.24,0.22);
      // Door handles (bar style)
      box(0.24,0.018,0.018, HM,-0.62,0.24,0.235);
      box(0.24,0.018,0.018, HM,  0.0,0.24,0.235);
      box(0.24,0.018,0.018, HM, 0.62,0.24,0.235);
      // Legs (hairpin style)
      cyl(0.013,0.013,0.3,6, HM,-0.82,0.15, 0.18);
      cyl(0.013,0.013,0.3,6, HM, 0.82,0.15, 0.18);
      cyl(0.013,0.013,0.3,6, HM,-0.82,0.15,-0.18);
      cyl(0.013,0.013,0.3,6, HM, 0.82,0.15,-0.18);
      // TV Screen frame
      box(1.55,0.88,0.06, new THREE.MeshStandardMaterial({color:0x111111,roughness:0.3,metalness:0.7}), 0,1.06,0);
      // Screen (bezel + panel)
      box(1.44,0.78,0.025, new THREE.MeshStandardMaterial({color:0x0A1520,roughness:0.1,metalness:0.1,emissive:0x0A1520,emissiveIntensity:0.15}), 0,1.06,0.03);
      // TV neck
      box(0.08,0.16,0.06, HM, 0,0.58,0);
      // Thin bottom TV stand
      box(0.5,0.025,0.12, HM, 0,0.5,0);
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'bookshelf': {
      const WM = woodMat(C||0x8B6A3A);
      const WD = woodMat(Cdark);
      // Side panels
      box(0.04,1.85,0.32, WD,-0.58,0.925,0);
      box(0.04,1.85,0.32, WD, 0.58,0.925,0);
      // Back panel
      box(1.16,1.85,0.02, WD, 0,0.925,-0.15);
      // Shelves (5)
      const shelves=[0.04,0.46,0.9,1.32,1.76];
      shelves.forEach(y=> box(1.16,0.03,0.32, WM, 0,y,0));
      // Top panel
      box(1.2,0.04,0.34, WD, 0,1.87,0);
      // Books on shelves — colorful realistic
      const BCOLS=[
        [0xB5451B,0xD4603A],[0x2C5F8A,0x4A88BB],[0xC8A02A,0xE8C44A],
        [0x3D7A4A,0x5AA060],[0x7A3A8A,0xA55AB5],[0xC03050,0xE05070],
        [0x8A6020,0xBB8A30],[0x2A6080,0x3A90BB]
      ];
      [0.46,0.9,1.32].forEach((sy,si)=>{
        let bx=-0.52;
        for(let i=0;i<7;i++){
          const bw=0.06+Math.random()*0.05;
          const bh=0.28+Math.random()*0.1;
          const [c1]=BCOLS[(si*7+i)%BCOLS.length];
          box(bw,bh,0.26, new THREE.MeshStandardMaterial({color:c1,roughness:0.7}), bx+bw/2,sy+bh/2+0.035,0);
          bx+=bw+0.005;
          if(bx>0.5) break;
        }
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'coffee_table': {
      const WM = woodMat(C||0xA08060);
      const WD = woodMat(Cdark);
      const GM = glassMat();
      const HM = metalMat(0xB0A070);
      // Lower shelf
      box(0.9,0.03,0.52, WM, 0,0.2,0);
      // Glass top
      rbox(1.1,0.04,0.58,0.02, GM, 0,0.47,0);
      // Frame rails under glass
      box(1.06,0.025,0.025, HM, 0,0.44, 0.27);
      box(1.06,0.025,0.025, HM, 0,0.44,-0.27);
      box(0.025,0.025,0.53, HM, 0.52,0.44,0);
      box(0.025,0.025,0.53, HM,-0.52,0.44,0);
      // Legs (angled hairpin)
      [[-0.46,0.24],[-0.46,-0.24],[0.46,0.24],[0.46,-0.24]].forEach(([lx,lz])=>{
        cyl(0.018,0.018,0.46,6, HM, lx,0.23,lz);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'lamp': {
      const BM = metalMat(0x909090);
      const SM = new THREE.MeshStandardMaterial({color:0xF0E8D0,roughness:0.9,side:THREE.DoubleSide});
      const EM = new THREE.MeshStandardMaterial({color:0xFFFF99,emissive:0xFFFF44,emissiveIntensity:0.8,roughness:1});
      // Weighted base (cast iron look)
      cyl(0.21,0.24,0.04,20, metalMat(0x333333), 0,0.02,0);
      cyl(0.08,0.21,0.06,16, metalMat(0x333333), 0,0.06,0);
      // Pole (straight)
      cyl(0.018,0.018,1.15,10, BM, 0,0.63,0);
      // Shade support arm
      cyl(0.012,0.012,0.26,8, BM, 0,1.26,0);
      // Shade (cone)
      cyl(0.3,0.1,0.32,20, SM, 0,1.32,0);
      // Bulb
      sph(0.065, EM, 0,1.22,0);
      // Point light for glow effect  
      const pl = new THREE.PointLight(0xFFEE88, 0.8, 4);
      pl.position.set(0,1.22,0); g.add(pl);
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'plant': {
      const PM = new THREE.MeshStandardMaterial({color:0xA0522D,roughness:0.8});
      const SM = new THREE.MeshStandardMaterial({color:0x5A3820,roughness:0.85});
      const GM = new THREE.MeshStandardMaterial({color:0x2D6A35,roughness:0.8});
      const LM = new THREE.MeshStandardMaterial({color:0x3D8A45,roughness:0.75});
      // Pot
      cyl(0.195,0.155,0.34,20, PM, 0,0.17,0);
      cyl(0.21,0.21,0.03,20, PM, 0,0.34,0); // rim
      // Soil
      cyl(0.175,0.175,0.03,16, SM, 0,0.365,0);
      // Main stems
      cyl(0.025,0.025,0.62,8, new THREE.MeshStandardMaterial({color:0x4A6A30,roughness:0.8}), 0,0.68,0);
      cyl(0.018,0.018,0.48,8, new THREE.MeshStandardMaterial({color:0x4A6A30,roughness:0.8}), 0.14,0.62,0.1,0,0,0.18);
      cyl(0.018,0.018,0.44,8, new THREE.MeshStandardMaterial({color:0x4A6A30,roughness:0.8}),-0.14,0.6,-0.08,0,0,-0.15);
      // Leaves (flattened spheres)
      [[0,1.04,0,1],[0.26,0.9,0.18,0.82],[-0.26,0.88,-0.16,0.82],
       [0.18,1.18,0.1,0.7],[-0.18,1.15,-0.1,0.7],
       [0,0.82,0.22,0.65],[0.3,0.76,0,0.55],[-0.22,0.78,0.1,0.6]
      ].forEach(([lx,ly,lz,sc])=>{
        const geo = new THREE.SphereGeometry(0.22,12,8);
        geo.scale(1,0.4,0.75);
        const leaf = new THREE.Mesh(geo, Math.random()>0.5?GM:LM);
        leaf.position.set(lx,ly,lz);
        leaf.scale.setScalar(sc);
        leaf.rotation.y = Math.random()*Math.PI;
        leaf.castShadow=true;
        g.add(leaf);
      });
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'mirror': {
      const WM = woodMat(C||0xC8A060);
      const WD = woodMat(Cdark);
      const MirM = new THREE.MeshStandardMaterial({color:0xD0E8E8,roughness:0.02,metalness:0.9});
      // Frame
      box(0.72,1.05,0.06, WD, 0,0.9,0);
      // Frame inner border detail
      box(0.62,0.92,0.03, WM, 0,0.9,0.02);
      // Mirror glass
      box(0.56,0.84,0.02, MirM, 0,0.9,0.04);
      // Base stand
      box(0.72,0.04,0.38, WD, 0,0.38,0.17);
      cyl(0.025,0.025,0.52,8, WD, 0,0.64,0.2,0.22);
      break;
    }

    // ══════════════════════════════════════════════════════════
    case 'desk': {
      const WM = woodMat(C||0x9B7A4A);
      const WD = woodMat(Cdark);
      const HM = metalMat(0x888888);
      // Tabletop
      rbox(1.4,0.05,0.68,0.02, WM, 0,0.77,0);
      // Modesty panel / left side unit
      box(0.04,0.72,0.68, WD,-0.66,0.41,0);
      // Back panel
      box(1.32,0.48,0.03, WD, 0,0.53,-0.31);
      // Drawer unit (right)
      box(0.38,0.64,0.62, WD, 0.5,0.37,0);
      box(0.34,0.16,0.3, new THREE.MeshStandardMaterial({color:Clight,roughness:0.7}), 0.5,0.44,0.17);
      box(0.34,0.16,0.3, new THREE.MeshStandardMaterial({color:Clight,roughness:0.7}), 0.5,0.27,0.17);
      // Drawer handles
      box(0.12,0.014,0.014, HM, 0.5,0.44,0.34);
      box(0.12,0.014,0.014, HM, 0.5,0.27,0.34);
      // Left leg (metal)
      cyl(0.03,0.03,0.72,8, HM,-0.62,0.36, 0.28);
      cyl(0.03,0.03,0.72,8, HM,-0.62,0.36,-0.28);
      break;
    }

    default:{
      // Fallback: simple box
      rbox(0.8,0.8,0.8,0.04, woodMat(C), 0,0.4,0);
    }
  }

  // Enable shadows on every mesh in the group
  g.traverse(m => {
    if (m.isMesh) {
      m.castShadow    = true;
      m.receiveShadow = true;
    }
  });

  return g;
}

// ═══════════════════════════════════════════════════════════════
//  initFurniturePlacement  —  Interactive drag-and-drop room planner
//  Renders a 3D room where furniture items can be placed, rotated,
//  and repositioned by dragging. Layout is saved/restored as JSON.
//
//  @param {string}   canvasId    - ID of the target <canvas> element
//  @param {Object}   savedLayout - previously saved layout to restore
//  @param {Function} onSave      - callback when layout is exported
// ═══════════════════════════════════════════════════════════════
function initFurniturePlacement(canvasId, savedLayout, onSave) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Dispose any existing scene on this canvas before re-initialising
  if (_fScenes[canvasId]) {
    try { _fScenes[canvasId].renderer.dispose(); } catch {}
    delete _fScenes[canvasId];
  }

  savedLayout = savedLayout || {};

  // ── Canvas dimensions ────────────────────────────────────────
  const W = canvas.clientWidth  || 800;
  const H = canvas.clientHeight || 550;

  // ── Renderer — ACESFilmic tonemapping for realistic look ──────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled   = true;
  renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x1C1C28, 1);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ── Scene & depth fog ────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1C1C28, 0.035);

  // ── Camera — perspective, positioned above and in front ───────
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 80);
  camera.position.set(0, 9, 10);
  camera.lookAt(0, 0, 0);

  // ── Lighting ─────────────────────────────────────────────────
  // Warm ambient fill
  const ambL = new THREE.AmbientLight(0xFFEEDD, 0.5);
  scene.add(ambL);

  // Main directional sun light with shadows
  const sunL = new THREE.DirectionalLight(0xFFF8F0, 1.2);
  sunL.position.set(5, 10, 6);
  sunL.castShadow                = true;
  sunL.shadow.mapSize.width      = 2048;
  sunL.shadow.mapSize.height     = 2048;
  sunL.shadow.camera.near        = 0.5;
  sunL.shadow.camera.far         = 30;
  sunL.shadow.camera.left        = -8;
  sunL.shadow.camera.bottom      = -8;
  sunL.shadow.camera.right       =  8;
  sunL.shadow.camera.top         =  8;
  sunL.shadow.bias               = -0.001;
  scene.add(sunL);

  // Cool blue fill from opposite side for depth
  const fillL = new THREE.DirectionalLight(0xCCDDFF, 0.35);
  fillL.position.set(-4, 4, -3);
  scene.add(fillL);

  // ── Room geometry ────────────────────────────────────────────
  // The room is an 8×8 unit square. Walls are thin planes rather than
  // box meshes to keep the polygon count low.
  const ROOM_W = 8;  // width  (X axis)
  const ROOM_D = 8;  // depth  (Z axis)

  // Floor — warm wood tone with slight metalness for a varnished look
  const floorGeo = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 16, 16);
  const floorMat = new THREE.MeshStandardMaterial({
    color:     0xC4A882,
    roughness: 0.78,
    metalness: 0.02,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x    = -Math.PI / 2;  // rotate to lie flat on Y=0
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle grid overlay to simulate wood plank lines on the floor
  const gridH = new THREE.GridHelper(ROOM_W, 16, 0xAA9060, 0xAA9060);
  gridH.material.opacity     = 0.18;  // very faint — purely decorative
  gridH.material.transparent = true;
  gridH.position.y           = 0.002; // slightly above floor to avoid z-fighting
  scene.add(gridH);

  // ── Walls ────────────────────────────────────────────────────
  // Back wall is slightly lighter than side walls for depth perception
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xEDE8E0, roughness: 0.92 });
  const wallMatL = new THREE.MeshStandardMaterial({ color: 0xE5E0D8, roughness: 0.92 });

  // Back wall — centre of negative Z edge
  const bwGeo = new THREE.PlaneGeometry(ROOM_W, 3.6);
  const bw    = new THREE.Mesh(bwGeo, wallMat);
  bw.position.set(0, 1.8, -ROOM_D / 2);
  scene.add(bw);

  // Left wall — rotated 90° to face inward (positive X direction)
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, 3.6), wallMatL);
  lw.rotation.y = Math.PI / 2;
  lw.position.set(-ROOM_W / 2, 1.8, 0);
  scene.add(lw);

  // Right wall — rotated -90° to face inward (negative X direction)
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, 3.6), wallMatL);
  rw.rotation.y = -Math.PI / 2;
  rw.position.set(ROOM_W / 2, 1.8, 0);
  scene.add(rw);

  // Ceiling — slightly larger than floor to avoid visible gaps at edges
  const ceilGeo = new THREE.PlaneGeometry(ROOM_W + 0.1, ROOM_D + 0.1);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xF8F5EE, roughness: 0.95 });
  const ceil    = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;   // rotate to face downward
  ceil.position.set(0, 3.6, 0);
  scene.add(ceil);

  // ── Ceiling light fixture ────────────────────────────────────
  // Local cyl helper — scoped to room setup only, not exported
  function cyl(rt, rb, h, seg, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    m.position.set(x, y, z);
    scene.add(m);
  }

  // Visible pendant light shade with warm emissive glow
  cyl(0.32, 0.24, 0.12, 24,
    new THREE.MeshStandardMaterial({
      color:            0xF8F0D8,
      emissive:         0x442200,
      emissiveIntensity: 0.3,
      roughness:        0.5,
    }),
    0, 3.5, 0
  );

  // Warm point light below the fixture — radius 12 covers the whole room
  const cLight = new THREE.PointLight(0xFFEECC, 1.5, 12);
  cLight.position.set(0, 3.4, 0);
  scene.add(cLight);

  // ── Furniture catalog ────────────────────────────────────────
  // All 15 available furniture types with default colors and UI icons.
  // The id field maps to buildFurniture() type keys.
  const CATALOG = [
    { id: 'sofa',         label: 'Sofa',          color: 0x5D5A7E, icon: '🛋️' },
    { id: 'armchair',     label: 'Armchair',      color: 0x7B4F3A, icon: '🪑' },
    { id: 'bed_double',   label: 'Double Bed',    color: 0x7B4F2A, icon: '🛏️' },
    { id: 'bed_single',   label: 'Single Bed',    color: 0x7A8B6E, icon: '🛏️' },
    { id: 'dining_table', label: 'Dining Table',  color: 0xA0734A, icon: '🍽️' },
    { id: 'dining_chair', label: 'Dining Chair',  color: 0xA0734A, icon: '🪑' },
    { id: 'chair',        label: 'Chair',         color: 0x8B6040, icon: '🪑' },
    { id: 'wardrobe',     label: 'Wardrobe',      color: 0x9B7B5A, icon: '🚪' },
    { id: 'tv_unit',      label: 'TV Unit',       color: 0x4A3A2A, icon: '📺' },
    { id: 'bookshelf',    label: 'Bookshelf',     color: 0x8B6A3A, icon: '📚' },
    { id: 'coffee_table', label: 'Coffee Table',  color: 0xA08060, icon: '☕' },
    { id: 'lamp',         label: 'Floor Lamp',    color: 0xC0A060, icon: '💡' },
    { id: 'plant',        label: 'Indoor Plant',  color: 0x3A6A40, icon: '🪴' },
    { id: 'mirror',       label: 'Mirror',        color: 0xC8A060, icon: '🪞' },
    { id: 'desk',         label: 'Desk',          color: 0x9B7A4A, icon: '🖥️' },
  ];

  // ── Restore saved layout ─────────────────────────────────────
  // Placed items array — tracks all furniture currently in the scene
  const placed = [];

  // Rebuild scene from the savedLayout object passed at init time.
  // Each key maps to a CATALOG id; value can be a single item or an array.
  Object.entries(savedLayout).forEach(([key, data]) => {
    if (!data) return;

    const cat = CATALOG.find(c => c.id === key);
    if (!cat) return;

    // Normalise single-item layouts to arrays for consistent processing
    const items = Array.isArray(data) ? data : [data];

    items.forEach(item => {
      if (item.visible === false) return;  // skip hidden items

      const mesh = buildFurniture(scene, cat.id, cat.color);
      mesh.position.set(item.x || 0, 0, item.z || 0);
      mesh.rotation.y = item.rotY || 0;
      scene.add(mesh);
      placed.push({ mesh, type: cat.id, id: key + '_' + Date.now(), rotY: item.rotY || 0 });
    });
  });

  // ── Interaction state ─────────────────────────────────────────
  const raycaster  = new THREE.Raycaster();
  const mouse      = new THREE.Vector2();
  let dragging     = null;
  let dragOffset   = new THREE.Vector3();
  let selected=null;
  let orbitDragging=false, orbitPrev={x:0,y:0};
  let camTheta=0.48, camPhi=0.72, camDist=16;

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
        if(m.isMesh) m.material.emissive?.setHex(0);
      });
    }
    selected=obj;
    if(selected){
      selected.mesh.traverse(m=>{
        if(m.isMesh) m.material.emissive?.setHex(0x1A1400);
      });
    }
    const rp=document.getElementById(canvasId==='c3d-tfurn' ? 'tfurn-action-panel' : 'furn-action-panel');
    if(rp) rp.style.display=selected?'flex':'none';
  }

  canvas.addEventListener('mousedown',e=>{
    if(e.button===2){orbitDragging=true;orbitPrev={x:e.clientX,y:e.clientY};return;}
    const rect=canvas.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const allM=[];
    placed.forEach(p=>p.mesh.traverse(m=>{if(m.isMesh)allM.push(m);}));
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
  });

  window.addEventListener('mousemove',e=>{
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
      Math.max(-3.5,Math.min(3.5,wp.x+dragOffset.x)),0,
      Math.max(-3.5,Math.min(3.5,wp.z+dragOffset.z))
    );
  });

  window.addEventListener('mouseup',e=>{
    if(e.button===2){orbitDragging=false;return;}
    dragging=null;
  });

  canvas.addEventListener('wheel',e=>{
    camDist=Math.max(4,Math.min(22,camDist+e.deltaY*0.018));
    updateCamera(); e.preventDefault();
  },{passive:false});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  // ── Public API ──────────────────────────────────────────────

  /**
   * Add a furniture item to the center of the room.
   * The item is immediately selected so the user can drag it.
   * @param {string} type     - furniture type key
   * @param {number} colorHex - optional color override
   */
  function addFurniture(type, colorHex) {
    const cat   = CATALOG.find(c => c.id === type);
    const color = colorHex || cat?.color || 0x888888;
    const mesh  = buildFurniture(scene, type, color);

    // Place near center with slight random offset to avoid stacking
    mesh.position.set(
      (Math.random() - 0.5) * 3,
      0,
      (Math.random() - 0.5) * 3
    );
    scene.add(mesh);

    const item = { mesh, type, id: type + '_' + Date.now(), rotY: 0 };
    placed.push(item);
    selectObj(item);
  }

  /**
   * Rotate the currently selected furniture item by the given degrees.
   * @param {number} deg - degrees to rotate (positive = clockwise)
   */
  function rotateSelected(deg) {
    if (!selected) return;
    selected.rotY             += deg * Math.PI / 180;
    selected.mesh.rotation.y  = selected.rotY;
  }

  /**
   * Remove the currently selected item from the scene and placed list.
   */
  function deleteSelected() {
    if (!selected) return;
    scene.remove(selected.mesh);
    placed.splice(placed.indexOf(selected), 1);
    selectObj(null);
  }

  /**
   * Export the current layout as a plain JSON-serialisable object.
   * Coordinates are rounded to 2 decimal places.
   * @returns {Object} layout keyed by furniture type
   */
  function getLayout() {
    const layout = {};
    placed.forEach(p => {
      if (!layout[p.type]) layout[p.type] = [];
      layout[p.type].push({
        x:       Math.round(p.mesh.position.x * 100) / 100,
        z:       Math.round(p.mesh.position.z * 100) / 100,
        rotY:    Math.round(p.rotY             * 100) / 100,
        visible: true,
      });
    });
    return layout;
  }

  // ── Render loop ───────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // ── Responsive resize ─────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  ro.observe(canvas);

  // Store and return the scene reference
  _fScenes[canvasId] = {
    renderer, scene, camera, placed, CATALOG,
    addFurniture, rotateSelected, deleteSelected, getLayout, updateCamera,
  };
  return _fScenes[canvasId];
}

/** Get a previously initialised furniture scene by canvas ID */
function getFurnitureScene(canvasId) { return _fScenes[canvasId]; }

// ═══════════════════════════════════════════════════════════════
//  Export helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Download a PNG screenshot of the furniture layout.
 * Triggers one extra render to ensure the frame is up-to-date
 * before converting the canvas to a data URL.
 *
 * @param {string} canvasId - ID of the canvas to capture
 * @param {string} filename - base filename (without extension)
 */
function downloadFurnitureScreenshot(canvasId, filename) {
  const sc = _fScenes[canvasId];
  if (!sc) return;

  // Render one extra frame so the screenshot is current
  sc.renderer.render(sc.scene, sc.camera);

  const dataURL = sc.renderer.domElement.toDataURL('image/png');
  const a       = document.createElement('a');
  a.href         = dataURL;
  a.download     = (filename || 'furniture-layout') + '.png';
  a.click();
}

/**
 * Download the current furniture layout as a JSON file.
 * The JSON includes property name, role, timestamp, and item positions.
 *
 * @param {string} canvasId  - ID of the canvas whose layout to export
 * @param {string} propTitle - property name to embed in the JSON
 * @param {string} role      - 'landlord' | 'tenant' label for the file
 */
function downloadFurnitureJSON(canvasId, propTitle, role) {
  const sc = _fScenes[canvasId];
  if (!sc) return;

  const layout = sc.getLayout();

  const payload = {
    property:  propTitle || 'Property',
    role:      role      || 'layout',
    savedAt:   new Date().toISOString(),
    furniture: layout,
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: 'application/json' }
  );

  const safeTitle = (propTitle || 'furniture').replace(/\s+/g, '-').toLowerCase();
  const safeRole  = role || 'layout';

  const a   = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${safeTitle}-${safeRole}.json`;
  a.click();

  URL.revokeObjectURL(a.href);
}
