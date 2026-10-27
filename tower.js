// 3D 타워 — app.js 가 데이터를 읽으면 'office:data' 이벤트로 받아 그린다.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const STATUS_COLOR = { 가동: 0x3ccf7f, 대기: 0xf0b429, 점검: 0x6ea2ff, 정지: 0xff5a5a };
const FLOOR_H = 7;
const WALL_H = 3.4;
const W = 18, D = 11;
const FLOORS = [
  { key: "1F", name: "1F 가공동", color: 0x3b82f6 },
  { key: "2F", name: "2F 팀 사무실", color: 0xa855f7 },
];

const host = document.getElementById("tower");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b17);
scene.fog = new THREE.Fog(0x070b17, 45, 90);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
camera.position.set(21, 25, 21);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
host.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = "labels";
host.appendChild(labels.domElement);

const controls = new OrbitControls(camera, labels.domElement);
controls.target.set(0, FLOOR_H * 0.45, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 12;
controls.maxDistance = 70;
controls.autoRotateSpeed = 0.6;

scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x101830, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(12, 30, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
scene.add(sun);

// 바닥 원판과 빛나는 테두리
const ground = new THREE.Mesh(new THREE.CircleGeometry(26, 64), new THREE.MeshStandardMaterial({ color: 0x0c1428, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.3;
ground.receiveShadow = true;
scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(25.6, 26, 96), new THREE.MeshBasicMaterial({ color: 0x2f6bff, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.28;
scene.add(ring);

const mat = {
  slab: new THREE.MeshStandardMaterial({ color: 0xd9dee8, roughness: 0.6 }),
  slabSide: new THREE.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.8 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x8fb4ff, transparent: true, opacity: 0.12, roughness: 0.1, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: 0xf3f5f9, roughness: 0.4 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x232b3d, roughness: 0.5 }),
  machine: new THREE.MeshStandardMaterial({ color: 0xc9d1de, roughness: 0.35, metalness: 0.4 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x2f9e5b, roughness: 0.9 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }),
};

const box = (w, h, d, m) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
};

function label(html, cls = "") {
  const el = document.createElement("div");
  el.className = "tag " + cls;
  el.innerHTML = html;
  return new CSS2DObject(el);
}

function textTexture(lines, { w = 512, h = 256, bg = "#0f1730", fg = "#e6ecff", size = 34, title } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.font = `700 ${size}px "Noto Sans KR", sans-serif`;
  let y = size + 16;
  if (title) { g.fillText(title, 24, y); y += size + 12; g.font = `400 ${size * 0.72}px "Noto Sans KR", sans-serif`; }
  for (const l of lines) { g.fillText(l, 24, y); y += size * 0.95; }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function plant(x, z) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 12), mat.pot);
  pot.position.y = 0.2;
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), mat.plant);
  leaf.position.y = 0.8;
  leaf.scale.y = 1.5;
  g.add(pot, leaf);
  g.position.set(x, 0, z);
  return g;
}

function person(name, color) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 10), m);
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf1d2b6 }));
  head.position.y = 1.15;
  body.castShadow = head.castShadow = true;
  g.add(body, head);
  const tag = label(name, "person");
  tag.position.y = 1.65;
  g.add(tag);
  return g;
}

function floorShell(f, i) {
  const g = new THREE.Group();
  g.position.y = i * FLOOR_H;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, D), [mat.slabSide, mat.slabSide, mat.slab, mat.slabSide, mat.slabSide, mat.slabSide]);
  slab.position.y = -0.2;
  slab.receiveShadow = true;
  g.add(slab);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 0.4, D)), new THREE.LineBasicMaterial({ color: f.color }));
  edge.position.y = -0.2;
  g.add(edge);
  // 뒤쪽·왼쪽 유리벽
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, WALL_H), mat.glass);
  back.position.set(0, (WALL_H) / 2, -D / 2);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, WALL_H), mat.glass);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, (WALL_H) / 2, 0);
  g.add(back, left);
  // 유리벽 기둥
  const post = (x, z) => {
    const p = box(0.08, WALL_H, 0.08, mat.dark);
    p.position.set(x, (WALL_H) / 2, z);
    g.add(p);
  };
  for (let x = -W / 2; x <= W / 2; x += 3) post(x, -D / 2);
  for (let z = -D / 2; z <= D / 2; z += 2.75) post(-W / 2, z);
  const name = label(f.name, "floor");
  name.position.set(W / 2 - 1.5, 0.2, D / 2 + 0.3);
  g.add(name);
  return g;
}

const floors = {};
const clickables = [];
const beacons = [];
let built = false;

function buildMachines(g, machines) {
  const zones = [...new Set(machines.map((m) => m.zone))];
  const zoneW = (W - 2) / zones.length;
  zones.forEach((z, zi) => {
    const x0 = -W / 2 + 1 + zi * zoneW;
    const zl = label(z, "zone");
    zl.position.set(x0 + zoneW / 2, 0.05, -D / 2 + 0.7);
    g.add(zl);
    // 구역 바닥선
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(zoneW - 0.4, D - 2), new THREE.MeshStandardMaterial({ color: 0xc4ccda, roughness: 0.8 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x0 + zoneW / 2, 0.01, 0.4);
    pad.receiveShadow = true;
    g.add(pad);
    machines.filter((m) => m.zone === z).forEach((m, k) => {
      const col = k % 2, row = Math.floor(k / 2);
      const x = x0 + zoneW * (col === 0 ? 0.3 : 0.72);
      const zz = -D / 2 + 2.6 + row * 3;
      const color = STATUS_COLOR[m.status] ?? 0x888888;
      const mg = new THREE.Group();
      mg.position.set(x, 0, zz);
      const body = box(1.7, 1.5, 1.3, mat.machine);
      body.position.y = 0.75;
      const window_ = box(0.9, 0.6, 0.02, new THREE.MeshStandardMaterial({ color: 0x223355, emissive: m.status === "가동" ? 0x1d4ed8 : 0x000000, emissiveIntensity: 0.6 }));
      window_.position.set(-0.2, 0.9, 0.66);
      const panel = box(0.35, 0.5, 0.05, mat.dark);
      panel.position.set(0.6, 1.0, 0.66);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 }));
      beacon.position.set(0.65, 1.7, -0.4);
      const glow = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.2, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.03;
      mg.add(body, window_, panel, beacon, glow);
      const tag = label(`<b>${m.name}</b><span class="st" style="--c:#${color.toString(16).padStart(6, "0")}">${m.status}</span>`, "machine");
      tag.position.y = 2.3;
      mg.add(tag);
      body.userData.machine = m;
      clickables.push(body);
      if (m.status === "가동") beacons.push(beacon);
      g.add(mg);
      if (m.status === "가동" && m.owner) {
        const p = person(m.owner, 0x3b82f6);
        p.position.set(x + 1.15, 0, zz + 0.6);
        p.rotation.y = -Math.PI / 2;
        g.add(p);
      }
    });
  });
  g.add(plant(W / 2 - 0.7, D / 2 - 0.7), plant(-W / 2 + 0.7, D / 2 - 0.7));
}

function buildOffice(g, data) {
  const busy = new Set(data.machines.filter((m) => m.status === "가동").map((m) => m.owner));
  const people = [...new Set([...data.machines.map((m) => m.owner), ...data.tasks.map((t) => t.owner)])]
    .filter((n) => n && !busy.has(n) && !n.endsWith("팀"));
  // 책상 두 줄
  const desks = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) desks.push([-W / 2 + 2.6 + c * 2.3, -0.6 + r * 2.6]);
  desks.forEach(([x, z], i) => {
    const top = box(1.8, 0.08, 1.0, mat.white);
    top.position.set(x, 0.75, z);
    const leg = box(1.6, 0.7, 0.06, mat.dark);
    leg.position.set(x, 0.38, z - 0.4);
    const mon = box(0.8, 0.5, 0.05, new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x2563eb, emissiveIntensity: 0.7 }));
    mon.position.set(x, 1.1, z - 0.3);
    const chair = box(0.5, 0.5, 0.5, mat.dark);
    chair.position.set(x, 0.25, z + 0.85);
    g.add(top, leg, mon, chair);
    if (people[i]) {
      const p = person(people[i], 0xa855f7);
      p.position.set(x, 0.1, z + 0.85);
      p.rotation.y = Math.PI;
      g.add(p);
    }
  });
  // 회의 테이블
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 40), mat.white);
  table.scale.z = 0.6;
  table.position.set(W / 2 - 3.2, 0.75, 1.6);
  table.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 12), mat.dark);
  stem.position.set(W / 2 - 3.2, 0.38, 1.6);
  g.add(table, stem);
  for (let a = 0; a < 6; a++) {
    const ch = box(0.4, 0.45, 0.4, mat.dark);
    ch.position.set(W / 2 - 3.2 + Math.cos((a / 6) * Math.PI * 2) * 1.9, 0.22, 1.6 + Math.sin((a / 6) * Math.PI * 2) * 1.2);
    g.add(ch);
  }
  // 일정 보드
  const lines = data.schedule.slice(0, 4).map((s) => `${s.time}  ${s.title}`.slice(0, 22));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({ map: textTexture(lines, { title: "오늘 일정" }) }));
  board.position.set(W / 2 - 3.2, 2.6, -D / 2 + 0.05);
  g.add(board);
  // 회사 사인
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.4), new THREE.MeshBasicMaterial({ map: textTexture([], { w: 512, h: 224, bg: "#f5f7fb", fg: "#1c2a4a", size: 64, title: "KOREA MOLD" }) }));
  sign.rotation.y = Math.PI / 2;
  sign.position.set(-W / 2 + 0.05, 2.6, -2);
  g.add(sign);
  g.add(plant(W / 2 - 0.7, -D / 2 + 0.7), plant(-W / 2 + 0.7, D / 2 - 0.7), plant(W / 2 - 0.7, D / 2 - 0.7));
}

function build(data) {
  if (built) return;
  built = true;
  FLOORS.forEach((f, i) => {
    const g = floorShell(f, i);
    floors[f.key] = g;
    scene.add(g);
  });
  buildMachines(floors["1F"], data.machines);
  buildOffice(floors["2F"], data);
}

// 층 선택
const views = {
  전체: { show: ["1F", "2F"], target: [0, FLOOR_H * 0.45, 0], pos: [21, 25, 21] },
  "1F": { show: ["1F"], target: [0, 0.5, 1], pos: [10, 19, 17] },
  "2F": { show: ["2F"], target: [0, FLOOR_H + 0.5, 1], pos: [10, FLOOR_H + 19, 17] },
};
let tween = null;
let current = "전체";
// 화면이 좁으면 카메라를 뒤로 물려 건물이 잘리지 않게 한다
const fit = () => Math.min(2.2, Math.max(1, 1.5 / camera.aspect));
function setView(key) {
  const v = views[key];
  current = key;
  const target = new THREE.Vector3(...v.target);
  const pos = new THREE.Vector3(...v.pos).sub(target).multiplyScalar(fit()).add(target);
  for (const [k, g] of Object.entries(floors)) {
    g.visible = v.show.includes(k);
    // CSS2D 라벨은 부모 visible 을 따르지 않아 직접 숨긴다
    g.traverse((o) => { if (o.isCSS2DObject) o.visible = g.visible; });
  }
  host.classList.toggle("overview", key === "전체");
  tween = { from: camera.position.clone(), to: pos, tFrom: controls.target.clone(), tTo: target, t: 0 };
  document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === key));
}
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
document.getElementById("auto-rotate").addEventListener("change", (e) => (controls.autoRotate = e.target.checked));

// 설비 클릭 → 상세
const info = document.getElementById("tower-info");
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let down = null;
labels.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
labels.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(clickables.filter((o) => o.parent.parent.visible))[0];
  if (!hit) { info.hidden = true; return; }
  const m = hit.object.userData.machine;
  info.innerHTML = `<b>${m.name}</b> <span class="muted">${m.zone}</span><br>상태: ${m.status} · 담당: ${m.owner}<br>작업: ${m.job}<br>진행률: ${m.progress}%`;
  info.hidden = false;
});

function resize() {
  const { clientWidth: w, clientHeight: h } = host;
  renderer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  setView(current);
}
new ResizeObserver(resize).observe(host);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  beacons.forEach((b) => (b.material.emissiveIntensity = 1.2 + Math.sin(t * 4) * 0.8));
  if (tween) {
    tween.t = Math.min(1, tween.t + 0.04);
    const k = 1 - Math.pow(1 - tween.t, 3);
    camera.position.lerpVectors(tween.from, tween.to, k);
    controls.target.lerpVectors(tween.tFrom, tween.tTo, k);
    if (tween.t === 1) tween = null;
  }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

if (window.officeData) build(window.officeData);
window.addEventListener("office:data", (e) => build(e.detail));
