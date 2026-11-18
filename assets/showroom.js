// LCO Pagecraft hero showroom: one sample book on a lit pedestal in a dark gallery.
// The lights come up, the book opens, and its pages turn on their own; on chart pages the bars and lines draw themselves.
// Visitors can switch samples, turn pages (click the book, ‹ ›, arrow keys), switch day/night light and go full screen.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const root = document.getElementById('showroom');
const view = root.querySelector('.sr-view');
const bar = root.querySelector('.sr-bar');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 760;

const SAMPLES = [
  { key: 'proposal', name: '제안서', title: 'NORTHLINE 물류센터 자동화 제안서', url: 'samples/proposal/', n: 8, portrait: false, cover: 0x1d2229 },
  { key: 'company', name: '회사소개서', title: '온도건축 회사소개서', url: 'samples/company/', n: 8, portrait: false, cover: 0x3a3631 },
  { key: 'report', name: '사업 보고서', title: '모노그램 커피 3분기 사업 보고서', url: 'samples/report/', n: 8, portrait: false, cover: 0x3b2a20 },
  { key: 'insurance', name: '보장분석 리포트', title: '온결 보장분석 리포트', url: 'samples/insurance/', n: 8, portrait: true, cover: 0x1f2b45 },
];
const START = 2; // the report has the most chart pages, so it opens first

// ---------- renderer / scene ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch (e) { root.classList.add('sr-fallback'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.fog = new THREE.Fog(0x0a0f1c, 9, 22);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);

const loader = new THREE.TextureLoader();
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const PAPER = 0xe9e6df, TINT = 0xe8e8e8;
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); return t;
}

// ---------- room ----------
const M = {
  floor: new THREE.MeshStandardMaterial({ color: 0x1d2027, roughness: 0.4, transparent: true, opacity: small ? 1 : 0.86 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x1a1e27, roughness: 0.9 }),
  stand: new THREE.MeshStandardMaterial({ color: 0x262b35, roughness: 0.45 }),
  standTop: new THREE.MeshStandardMaterial({ color: 0x8a6a4f, roughness: 0.45 }),
  edge: new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.95 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, roughness: 0.35, metalness: 0.9 }),
};
// glossy floor: a mirror under a slightly see-through floor gives soft reflections of the book and lights
if (!small) {
  const mirror = new Reflector(new THREE.PlaneGeometry(40, 30), { textureWidth: innerWidth * 0.5, textureHeight: innerHeight * 0.5, color: 0x8a8f99 });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; scene.add(mirror);
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), M.floor);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 9), M.wall); back.position.set(0, 4.5, -6.2); scene.add(back);
for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(30, 9), M.wall); w.position.set(s * 9, 4.5, 2); w.rotation.y = -s * Math.PI / 2; scene.add(w); }
const slatGeo = new THREE.BoxGeometry(0.06, 5.2, 0.08);
for (let i = -24; i <= 24; i++) { const s = new THREE.Mesh(slatGeo, M.wall); s.position.set(i * 0.42, 2.6, -6.12); scene.add(s); }

// brand wall
const logoImg = new Image(); logoImg.src = 'assets/logo.png';
const logoCanvas = document.createElement('canvas'); logoCanvas.width = 2172; logoCanvas.height = 724;
const logoTex = new THREE.CanvasTexture(logoCanvas); logoTex.colorSpace = THREE.SRGBColorSpace;
function paintLogo(col) {
  if (!logoImg.complete) return;
  const g = logoCanvas.getContext('2d'); g.clearRect(0, 0, 2172, 724); g.globalCompositeOperation = 'source-over';
  g.drawImage(logoImg, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 2172, 724); logoTex.needsUpdate = true;
}
logoImg.onload = () => paintLogo(night ? '#ffffff' : '#10141c');
const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0, fog: false });
const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2 * 724 / 2172), logoMat); logo.position.set(0, 2.75, -6.05); scene.add(logo);
const tagMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, fog: false, map: canvasTex(1024, 96, (g, w, h) => {
  g.fillStyle = 'rgba(255,255,255,.62)'; g.font = `500 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PPT·PDF를 책처럼 넘겨보는 3D 웹 책자', w / 2, h / 2);
}) });
const tag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.32), tagMat); tag.position.set(0, 2.27, -6.05); scene.add(tag);

// lights: everything starts dark and comes up in the opening
const hemi = new THREE.HemisphereLight(0xdfe6f2, 0x24201c, 0); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1dc, 0);
key.position.set(-3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2 }); key.shadow.bias = -0.0004; scene.add(key);
const wash = new THREE.SpotLight(0xffe7c4, 0, 14, 0.75, 0.9, 1.6); wash.position.set(0, 5.4, -2.6); wash.target.position.set(0, 3.2, -6.2); scene.add(wash, wash.target);
const spot = new THREE.SpotLight(0xfff0d8, 0, 8, 0.42, 0.5, 1.4);
spot.position.set(0.6, 4.6, 0.2); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; scene.add(spot);
// a faint visible cone under the spotlight
const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff1d6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, 3.6, 48, 1, true), coneMat); scene.add(cone);

// ---------- pedestal ----------
const STAND = new THREE.Vector3(0, 0, -1.4);
const ped = new THREE.Group(); ped.position.copy(STAND); scene.add(ped);
const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.8), M.stand); plinth.position.y = 0.4; plinth.castShadow = plinth.receiveShadow = true; ped.add(plinth);
const ptop = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.04, 0.84), M.standTop); ptop.position.y = 0.82; ptop.receiveShadow = true; ped.add(ptop);
const plaqueMat = new THREE.MeshStandardMaterial({ roughness: 0.6 });
const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), plaqueMat); plaque.position.set(0, 0.52, 0.401); ped.add(plaque);
function plaqueFor(s) {
  plaqueMat.map = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#14171d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4DA6FF'; g.font = `600 46px ${FONT}`; g.fillText(s.name, 56, 104);
    g.fillStyle = 'rgba(255,255,255,.82)'; g.font = `500 40px ${FONT}`;
    let t = s.title; while (g.measureText(t).width > w - 112) t = t.slice(0, -2) + '…'; g.fillText(t, 56, 180);
  }); plaqueMat.needsUpdate = true;
}
const spotTarget = new THREE.Object3D(); spotTarget.position.set(0, 1.25, 0); ped.add(spotTarget); spot.target = spotTarget;
{ const top = spot.position, bot = new THREE.Vector3(0, 0.9, STAND.z); const mid = top.clone().add(bot).multiplyScalar(0.5);
  cone.position.copy(mid); cone.lookAt(bot); cone.rotateX(Math.PI / 2); cone.scale.set(1, top.distanceTo(bot) / 3.6, 1); }

// ---------- pages: plain images, or a chart page that draws itself ----------
let ANIM = {};
const animReady = fetch('assets/showroom/anim.json').then(r => r.json()).then(j => { ANIM = j; }).catch(() => {});
function Page(sample, n) { // n = 1-based page number
  const p = { tex: null, ready: false, prog: 1, rects: null, base: null, chart: null, img: null, waiting: [] };
  const dir = `assets/showroom/${sample.key}/`, nn = String(n).padStart(2, '0');
  const c = document.createElement('canvas'); const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, maxAniso); p.tex = tex;
  const mirror = tex.clone(); mirror.wrapS = THREE.RepeatWrapping; mirror.repeat.x = -1; mirror.offset.x = 1; p.mirror = mirror;
  p.draw = () => {
    const g = c.getContext('2d');
    if (!p.rects) { g.drawImage(p.img, 0, 0, c.width, c.height); }
    else {
      g.drawImage(p.base, 0, 0, c.width, c.height);
      const k = c.width / 1600;
      for (const r of p.rects) {
        const q = Math.max(0, Math.min(1, (p.prog * 1.6 - (r.d || 0)) / 1)), e = 1 - Math.pow(1 - q, 3);
        if (e <= 0) continue;
        let x = r.x * k, y = r.y * k, w = r.w * k, h = r.h * k;
        if (r.dir === 'up') { y += h * (1 - e); h *= e; } else if (r.dir === 'down') { h *= e; } else if (r.dir === 'left') { x += w * (1 - e); w *= e; } else { w *= e; }
        if (w > 0.5 && h > 0.5) g.drawImage(p.chart, x, y, w, h, x, y, w, h); // chart layer has the same size as the canvas
      }
    }
    tex.needsUpdate = true; mirror.needsUpdate = true;
  };
  p.load = () => {
    if (p.loading) return p.loading;
    p.loading = animReady.then(async () => {
      const rects = ANIM[sample.key] && ANIM[sample.key][n];
      if (rects) { [p.base, p.chart] = await Promise.all([img(dir + 'b' + nn + '.jpg'), img(dir + 'c' + nn + '.png')]); p.rects = rects; c.width = p.base.width; c.height = p.base.height; }
      else { p.img = await img(dir + 'p' + nn + '.jpg'); c.width = p.img.width; c.height = p.img.height; }
      p.ready = true; p.draw(); p.waiting.forEach(f => f()); p.waiting = [];
    }).catch(() => {});
    return p.loading;
  };
  p.play = () => { if (!p.rects) return; p.prog = 0; p.draw(); playing.add(p); };
  return p;
}
const playing = new Set();
function tickCharts(dt) { for (const p of playing) { p.prog = Math.min(1, p.prog + dt / 1.6); p.draw(); if (p.prog >= 1) playing.delete(p); } }

// ---------- book ----------
const LAND = { pw: 1.15, ph: 1.15 * 9 / 16 }, PORT = { pw: 0.68, ph: 0.68 * 1.4 };
function makePageGeo(pw, ph, segs) {
  const geo = new THREE.PlaneGeometry(pw, ph, segs, 1); geo.translate(pw / 2, 0, 0);
  geo.userData.x0 = Float32Array.from({ length: geo.attributes.position.count }, (_, i) => geo.attributes.position.getX(i)); return geo;
}
// t = 0 flat on the right, t = 1 flat on the left; the free edge trails so the sheet curls
function bendPage(geo, pw, t) {
  const pos = geo.attributes.position, x0 = geo.userData.x0, lift = Math.sin(Math.PI * t), segs = 28;
  for (let i = 0; i < pos.count; i++) {
    const steps = Math.round(x0[i] / pw * segs); let x = 0, z = 0;
    for (let k = 0; k < steps; k++) { const uu = (k + 0.5) / segs, a = Math.PI * t - 0.6 * lift * uu * uu; x += Math.cos(a) * pw / segs; z += Math.sin(a) * pw / segs; }
    pos.setX(i, x); pos.setZ(i, z + 0.004 * lift);
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
}
function Book(s, idx) {
  const { pw, ph } = s.portrait ? PORT : LAND;
  const pages = Array.from({ length: s.n }, (_, k) => Page(s, k + 1));
  const g = new THREE.Group(); g.visible = false; ped.add(g);
  const tilt = 0.36;
  const rest = new THREE.Group(); rest.position.set(0, 0.84 + ph * 0.5 * Math.cos(tilt) + 0.03, -0.05); rest.rotation.x = -tilt; g.add(rest);
  const easel = new THREE.Mesh(new THREE.BoxGeometry(0.05, ph * 0.9, 0.03), M.brass); easel.position.set(0, -0.02, -0.06); rest.add(easel);
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(pw * 2 + 0.1, 0.03, 0.06), M.brass); ledge.position.set(0, -ph / 2 - 0.03, 0.01); rest.add(ledge);
  const board = new THREE.Mesh(new THREE.BoxGeometry(pw * 2 + 0.05, ph + 0.05, 0.02), new THREE.MeshStandardMaterial({ color: s.cover, roughness: 0.6 }));
  board.position.z = -0.017; board.castShadow = true; rest.add(board);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.006, ph - 0.004, 0.012), M.edge); b.position.set(sx * pw / 2, 0, -0.002); rest.add(b); }
  const mat = () => new THREE.MeshBasicMaterial({ color: PAPER });
  const left = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat()); left.position.set(-pw / 2, 0, 0.0055); rest.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat()); right.position.set(pw / 2, 0, 0.0055); rest.add(right);
  left.material.userData.side = -1; right.material.userData.side = 1;
  const fgeo = makePageGeo(pw, ph, 22);
  const frontM = new THREE.MeshBasicMaterial({ color: PAPER, side: THREE.FrontSide }), backM = new THREE.MeshBasicMaterial({ color: PAPER, side: THREE.BackSide });
  const turner = new THREE.Group(); turner.position.z = 0.0068; turner.add(new THREE.Mesh(fgeo, frontM), new THREE.Mesh(fgeo, backM)); turner.visible = false; rest.add(turner);
  [board, left, right, ...turner.children].forEach(m => { m.userData.book = true; });

  // page k (0-based) on a material; waits on plain paper until the image is in
  function put(m, k, mirrored, play) {
    const p = pages[k]; m.userData.want = p || null;
    if (!p) { m.map = null; m.color.set(PAPER); m.needsUpdate = true; return; }
    const apply = () => { if (m.userData.want !== p) return; m.map = mirrored ? p.mirror : p.tex; m.color.set(TINT); m.needsUpdate = true; if (play) { p.play(); if (p.rects && m.userData.side) chartFocus(m.userData.side, pw); } };
    if (p.ready) apply(); else { m.map = null; m.color.set(PAPER); m.needsUpdate = true; p.waiting.push(apply); p.load(); }
  }
  // spread k: left = page 2k-1, right = page 2k (spread 0 = cover alone on the right)
  const spreads = Math.floor(s.n / 2) + 1;
  let spread = 0, anim = null;
  function show(k, play) { put(left.material, 2 * k - 1, false, play); put(right.material, 2 * k, false, play); }
  function flip(dir) {
    if (anim) return false;
    const to = spread + dir; if (to < 0 || to >= spreads) return false;
    if (dir > 0) { put(frontM, 2 * spread); put(backM, 2 * to - 1, true); put(right.material, 2 * to, false, true);
      anim = { t: 0, from: 0, to: 1, done: () => put(left.material, 2 * to - 1, false, true) }; }
    else { put(frontM, 2 * to); put(backM, 2 * spread - 1, true); put(left.material, 2 * to - 1, false, true);
      anim = { t: 0, from: 1, to: 0, done: () => put(right.material, 2 * to, false, true) }; }
    spread = to; bendPage(fgeo, pw, anim.from); turner.visible = true; sfx(); return true;
  }
  function tick(dt) {
    if (!anim) return;
    anim.t = Math.min(1, anim.t + dt / 0.95);
    const e = anim.t < .5 ? 2 * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 2) / 2;
    bendPage(fgeo, pw, anim.from + (anim.to - anim.from) * e);
    if (anim.t >= 1) { const d = anim.done; anim = null; turner.visible = false; d(); }
  }
  function warm() { pages.forEach(p => p.load()); }
  function reset(k) { anim = null; turner.visible = false; spread = k; show(k, true); }
  show(0); pages[0].load(); pages[1].load(); pages[2].load();
  return { s, g, rest, flip, tick, warm, reset, get spread() { return spread; }, spreads, center: () => rest.getWorldPosition(new THREE.Vector3()) };
}
const books = SAMPLES.map(Book);

// page-turn sound: a short soft noise burst, only after the visitor has interacted (browsers block sound before that)
let actx = null, heard = false;
addEventListener('pointerdown', () => { heard = true; }, { once: true, capture: true });
function sfx() {
  if (!heard || !inView) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    const n = actx.sampleRate * 0.35, b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * Math.min(1, t * 30) * 0.5; }
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), v = actx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.7; v.gain.value = 0.18;
    src.buffer = b; src.connect(f).connect(v).connect(actx.destination); src.start();
  } catch (e) { /* no sound is fine */ }
}

// ---------- which book is on the stand ----------
let cur = -1, swap = null;
function pick(i) {
  if (i === cur || swap) return;
  const old = cur; cur = i; books[i].warm(); plaqueFor(SAMPLES[i]); ui.update();
  pushT = 0; pushHold = 0; // step back to the wide view while the books change
  swap = { t: 0, old, neu: i };
  books[i].reset(0); books[i].g.visible = true; books[i].g.position.y = -1.1;
  auto = 0.6; // the new book opens shortly after it arrives
}
function tickSwap(dt) {
  if (!swap) return;
  swap.t = Math.min(1, swap.t + dt / 0.9);
  const e = 1 - Math.pow(1 - swap.t, 3);
  if (swap.old >= 0) { const o = books[swap.old].g; o.position.y = -1.1 * Math.min(1, swap.t * 1.6); if (swap.t > 0.62) o.visible = false; }
  books[swap.neu].g.position.y = -1.1 * (1 - e);
  if (swap.t >= 1) swap = null;
}

// ---------- camera: slow orbit + follows the pointer a little ----------
// when a chart page opens, the camera leans in toward that page while the chart draws, then eases back
let push = 0, pushT = 0, pushX = 0, pushHold = 0;
function chartFocus(side, pw) { pushT = 1; pushX = side * pw * 0.5; pushHold = 2.6; }
const look = new THREE.Vector3(0, 1.12, STAND.z);
let orbitR = 3.6, height = 1.95, mx = 0, my = 0, smx = 0, smy = 0, dolly = 1;
addEventListener('pointermove', (e) => { if (!inView) return; mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

// ---------- day / night ----------
let night = true, lightK = 0; // lightK runs 0 → 1 in the opening
const LV = { night: { hemi: 0.14, key: 0.4, spot: 70, wash: 30, cone: 0.018, env: 0.3 }, day: { hemi: 1.2, key: 1.7, spot: 14, wash: 8, cone: 0, env: 0.9 } };
function setLight(n) {
  night = n;
  root.classList.toggle('sr-day', !n); document.documentElement.classList.toggle('sr-day', !n);
  M.wall.color.set(n ? 0x1a1e27 : 0xe7e3dc); M.stand.color.set(n ? 0x262b35 : 0xf1eee8); M.floor.color.set(n ? 0x1d2027 : 0xc9c4bb);
  scene.fog.color.set(n ? 0x0a0f1c : 0xe7e3dc);
  paintLogo(n ? '#ffffff' : '#10141c'); tagMat.color.set(n ? 0xffffff : 0x10141c);
  renderer.toneMappingExposure = n ? 1.0 : 0.95; ui.update();
}
function applyLights() {
  const L = night ? LV.night : LV.day, k = lightK;
  hemi.intensity = L.hemi * k; key.intensity = L.key * k; spot.intensity = L.spot * Math.min(1, k * 1.6);
  wash.intensity = L.wash * Math.max(0, k * 1.4 - 0.4); coneMat.opacity = L.cone * Math.min(1, k * 1.6);
  scene.environmentIntensity = L.env * k; logoMat.opacity = 0.92 * Math.max(0, k * 1.5 - 0.5); tagMat.opacity = Math.max(0, k * 1.5 - 0.5);
}

// ---------- UI ----------
const ui = {
  update() {
    bar.querySelectorAll('[data-go]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.go === cur)));
    const open = bar.querySelector('.sr-open'); if (cur >= 0) { open.href = SAMPLES[cur].url; open.querySelector('span').textContent = SAMPLES[cur].name + ' 열기'; }
    bar.querySelector('[data-light]').textContent = night ? '조명: 밤' : '조명: 낮';
  }
};
let auto = 2.2, held = 0; // auto: seconds until the next automatic turn; held: pause after the visitor turns a page
function turn(d) { const b = books[cur]; if (!b) return; if (!b.flip(d) && d > 0) b.flip(-1); held = 7; }
bar.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.go !== undefined) pick(+b.dataset.go);
  else if (b.dataset.flip) turn(+b.dataset.flip);
  else if (b.dataset.light !== undefined) setLight(!night);
  else if (b.dataset.full !== undefined) { if (document.fullscreenElement) document.exitFullscreen(); else (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root); }
});
addEventListener('keydown', (e) => {
  if (!inView || /input|textarea/i.test(document.activeElement?.tagName || '')) return;
  if (e.key === 'ArrowRight') turn(1); if (e.key === 'ArrowLeft') turn(-1);
});
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function hitBook(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
  return ray.intersectObjects(books[cur]?.g.children || [], true).some(h => h.object.userData.book);
}
renderer.domElement.addEventListener('click', (e) => { if (hitBook(e)) turn(books[cur].spread < books[cur].spreads - 1 ? 1 : -1); });
renderer.domElement.addEventListener('pointermove', (e) => { renderer.domElement.style.cursor = hitBook(e) ? 'pointer' : 'default'; });

// ---------- layout ----------
let vw = 1, vh = 1, shift = 0, shiftWant = 0, tallView = false;
const copy = root.querySelector('.hero-copy');
// the pedestal is centred in the free area: right of the text on wide screens, the whole width otherwise,
// and the camera distance is chosen so the pedestal fills most of that area
function frameScene() {
  const vr = view.getBoundingClientRect(), side = vw > 980 && !document.fullscreenElement && copy;
  let x0 = 24, x1 = vw - 24;
  if (side) { const cr = copy.getBoundingClientRect(); x0 = Math.max(x0, cr.right - vr.left + 48); }
  const free = Math.max(240, x1 - x0);
  shiftWant = (x0 + x1) / 2 - vw / 2;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const byWidth = 2.75 * vh / (2 * tanV * 0.88 * free), byHeight = 2.1 / (2 * tanV * 0.78);
  orbitR = Math.min(8.5, Math.max(3.2, byWidth, byHeight));
}
function applyShift(k) {
  const want = shiftWant;
  shift += (want - shift) * k;
  if (Math.abs(shift) > 0.5) camera.setViewOffset(vw + shift * 2, vh, 0, 0, vw, vh); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function resize() {
  vw = view.clientWidth; vh = view.clientHeight; renderer.setSize(vw, vh, false); camera.aspect = vw / vh;
  const tall = tallView = vw / vh < 1; camera.fov = tall ? 40 : 30; height = tall ? 2.25 : 2.15;
  camera.updateProjectionMatrix(); frameScene();
}
new ResizeObserver(() => { resize(); applyShift(1); }).observe(view); resize(); applyShift(1);
document.fonts?.ready.then(() => { frameScene(); applyShift(1); }); // the text width changes once the web font is in
document.addEventListener('fullscreenchange', () => setTimeout(() => { resize(); applyShift(1); }, 60));

// ---------- loop ----------
let inView = true, last = performance.now(), t0 = last, running = false, simT = 0, opening = 0;
function kick() { if (running || !inView || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(loop); }
new IntersectionObserver(es => { inView = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(root);
document.addEventListener('visibilitychange', kick);
function loop(now) {
  if (!inView || document.hidden) { running = false; return; }
  const dt = Math.min(0.05, (now - last) / 1000); last = now; frame(dt, (now - t0) / 1000); requestAnimationFrame(loop);
}
function frame(dt, time) {
  // opening: lights come up over ~2 s while the camera eases in from further back
  opening = Math.min(1, opening + dt / 2.4);
  lightK = Math.min(1, opening * 1.15); applyLights();
  dolly = 1 + (1 - (1 - Math.pow(1 - opening, 3))) * 0.6;
  // pages turn on their own; after the last spread the book goes back to the first one
  if (!swap) {
    held = Math.max(0, held - dt);
    if (held <= 0) { auto -= dt; if (auto <= 0) { const b = books[cur]; if (b.spread >= b.spreads - 1) b.reset(1); else b.flip(1); auto = b.spread === 1 ? 3.6 : 3.4; } }
  }
  books.forEach(b => b.tick(dt)); tickSwap(dt); tickCharts(dt);
  // camera: slow orbit, plus a small move toward the pointer
  pushHold -= dt; if (pushHold <= 0) pushT = 0;
  push += (pushT - push) * Math.min(1, dt * 1.6);
  smx += (mx - smx) * Math.min(1, dt * 2.5); smy += (my - smy) * Math.min(1, dt * 2.5);
  const a = (reduce ? 0 : Math.sin(time * 0.16) * 0.16) + smx * 0.08;
  const r = orbitR * dolly * (1 - 0.15 * push), lx = pushX * push * 0.3;
  camera.position.set(lx + Math.sin(a) * r, height * (0.9 + 0.1 * dolly) - smy * 0.18 - 0.2 * push, STAND.z + Math.cos(a) * r);
  camera.lookAt(look.x + lx, look.y + 0.05 * push, look.z);
  applyShift(Math.min(1, dt * 3));
  renderer.render(scene, camera);
}
// test hook: advance the scene by n frames without waiting for the browser (for checks while the tab is in the background)
window.__showroom = { pick, turn, info: () => ({ vw, vh, shift, shiftWant, orbitR, push, copyR: copy.getBoundingClientRect().right }), step(n) { for (let i = 0; i < n; i++) { simT += 1 / 30; frame(1 / 30, simT); } } };
document.fonts?.ready.then(() => { if (cur >= 0) plaqueFor(SAMPLES[cur]); });
setLight(true);
pick(START); swap = null; books[START].g.position.y = 0;
root.classList.add('sr-ready');
kick();
