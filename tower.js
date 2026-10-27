// 3D 타워 — app.js 가 데이터를 읽으면 'office:data' 이벤트로 받아 그린다.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

const STATUS_COLOR = { 가동: 0x3ccf7f, 대기: 0xf0b429, 점검: 0x6ea2ff, 정지: 0xff5a5a };
const FLOOR_H = 6;
const WALL_H = 3.4;
const W = 18, D = 11;
const FLOORS = [
  { key: "1F", name: "1F 가공 A동", color: 0x3b82f6, kind: "shop", building: "A동" },
  { key: "2F", name: "2F 가공 B동", color: 0x22d3ee, kind: "shop", building: "B동" },
  { key: "3F", name: "3F 관리 사무실", color: 0xa855f7, kind: "office", dept: "관리" },
  { key: "4F", name: "4F CAM 사무실", color: 0xf472b6, kind: "office", dept: "CAM" },
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

function buildMachines(g, machines, data, building) {
  const crew = new Set((data.staff ?? []).filter((p) => p.dept === building).map((p) => p.name));
  const roleOf = (n) => (data.staff ?? []).find((p) => p.name === n)?.role ?? "";
  const placed = new Set();
  // 구역마다 세로 3대까지 한 열, 넘치면 열을 늘린다
  const COL_W = 2.5, ROW_D = 2.8;
  const zones = [...new Set(machines.map((m) => m.zone))].map((z) => {
    const list = machines.filter((m) => m.zone === z);
    const cols = Math.ceil(list.length / 3);
    return { z, list, cols, w: cols * COL_W + 0.6 };
  });
  let x0 = -zones.reduce((a, b) => a + b.w, 0) / 2;
  zones.forEach(({ z, list, cols, w: zoneW }) => {
    const zl = label(z, "zone");
    zl.position.set(x0 + zoneW / 2, 0.05, -D / 2 + 0.7);
    g.add(zl);
    // 구역 바닥
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(zoneW - 0.3, D - 2), new THREE.MeshStandardMaterial({ color: 0xc4ccda, roughness: 0.8 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x0 + zoneW / 2, 0.01, 0.4);
    pad.receiveShadow = true;
    g.add(pad);
    list.forEach((m, k) => {
      const col = Math.floor(k / 3), row = k % 3;
      const x = x0 + 0.3 + COL_W * (col + 0.45);
      const zz = -D / 2 + 2.4 + row * ROW_D;
      const color = STATUS_COLOR[m.status] ?? 0x888888;
      const mg = new THREE.Group();
      mg.position.set(x, 0, zz);
      // 대형(L)·중형(M) 설비는 크게
      const scale = { L: 1.35, M: 1.18 }[m.size] ?? 1;
      const big = scale > 1;
      mg.scale.setScalar(scale);
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
      // 담당 작업자를 첫 담당 설비 옆에 세운다
      if (m.owner && !placed.has(m.owner) && (!crew.size || crew.has(m.owner))) {
        placed.add(m.owner);
        const p = person(`${m.owner}<small> ${roleOf(m.owner)}</small>`, building === "B동" ? 0x22d3ee : 0x3b82f6);
        const task = taskOf(data, m.owner);
        if (task) {
          const bubble = label(`📌 ${task}`, "bubble");
          bubble.position.y = 2.15;
          p.add(bubble);
        }
        p.position.set(x + (big ? 1.5 : 1.15), 0, zz + 0.6);
        p.rotation.y = -Math.PI / 2;
        g.add(p);
      }
    });
    x0 += zoneW;
  });
  g.add(plant(W / 2 - 0.7, D / 2 - 0.7), plant(-W / 2 + 0.7, D / 2 - 0.7));
}

// ── 사무실 인테리어 소품 (밝은 화이트 + 블루 글로우 톤) ──
const deco = {
  white: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 }),
  gloss: new THREE.MeshStandardMaterial({ color: 0xeef2f8, roughness: 0.12, metalness: 0.1 }),
  frost: new THREE.MeshPhysicalMaterial({ color: 0xe8eefc, transparent: true, opacity: 0.5, roughness: 0.3 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb6bfcc, roughness: 0.25, metalness: 0.8 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x7cc4ff }),
  led: new THREE.MeshBasicMaterial({ color: 0xf2f8ff }),
};

// 광택 있는 흰 바닥
function floorFinish(g, tint = 0xf1f5fb) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, D - 0.2), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.15, metalness: 0.05 }));
  f.rotation.x = -Math.PI / 2;
  f.position.y = 0.005;
  f.receiveShadow = true;
  g.add(f);
}

// 벽 아래·바닥 테두리 간접조명
function ledStrip(g, color) {
  const m = new THREE.MeshBasicMaterial({ color });
  const back = box(W - 0.2, 0.05, 0.05, m);
  back.position.set(0, 0.04, -D / 2 + 0.06);
  const left = box(0.05, 0.05, D - 0.2, m);
  left.position.set(-W / 2 + 0.06, 0.04, 0);
  const top = box(W - 0.2, 0.05, 0.05, m);
  top.position.set(0, WALL_H - 0.05, -D / 2 + 0.06);
  [back, left, top].forEach((o) => (o.castShadow = false));
  g.add(back, left, top);
}

// 천장에 매단 LED 바
function pendant(g, x, z, len) {
  const bar = box(len, 0.05, 0.16, deco.led);
  bar.castShadow = false;
  bar.position.set(x, 3.0, z);
  g.add(bar);
}

function officeChair(g, x, z, color = 0xf1f5f9) {
  const seatMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
  const seat = box(0.55, 0.1, 0.55, seatMat);
  seat.position.set(x, 0.48, z);
  const back = box(0.55, 0.65, 0.08, seatMat);
  back.position.set(x, 0.88, z + 0.27);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), deco.metal);
  post.position.set(x, 0.24, z);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 5), deco.metal);
  base.position.set(x, 0.04, z);
  g.add(seat, back, post, base);
}

// 흰 책상 + 노트북(관리) 또는 듀얼 모니터(CAM)
function desk(g, x, z, dual, accent = 0x7cc4ff) {
  const top = box(1.9, 0.07, 1.0, deco.white);
  top.position.set(x, 0.75, z);
  const side = box(1.9, 0.68, 0.05, deco.white);
  side.position.set(x, 0.37, z - 0.47);
  [-0.92, 0.92].forEach((dx) => {
    const leg = box(0.06, 0.72, 0.95, deco.white);
    leg.position.set(x + dx, 0.37, z);
    g.add(leg);
  });
  const edge = box(1.9, 0.02, 0.02, new THREE.MeshBasicMaterial({ color: accent }));
  edge.position.set(x, 0.79, z + 0.5);
  g.add(top, side, edge);
  officeChair(g, x, z + 0.8);
  const screen = new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: dual ? 0x3b82f6 : 0x60a5fa, emissiveIntensity: 0.9 });
  if (dual) {
    [-0.42, 0.42].forEach((dx) => {
      const mon = box(0.75, 0.46, 0.04, screen);
      mon.position.set(x + dx, 1.12, z - 0.25);
      mon.rotation.y = dx * -0.4;
      const arm = box(0.04, 0.3, 0.04, deco.metal);
      arm.position.set(x + dx, 0.9, z - 0.3);
      g.add(mon, arm);
    });
  } else {
    const base = box(0.6, 0.03, 0.42, deco.metal);
    base.position.set(x, 0.8, z);
    const lid = box(0.6, 0.4, 0.03, screen);
    lid.position.set(x, 1.0, z - 0.22);
    lid.rotation.x = -0.25;
    g.add(base, lid);
  }
}

// 벽에 거는 빛나는 대시보드 스크린
function dashTexture(title, sub) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 288;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 512, 288);
  grd.addColorStop(0, "#0b2a5b"); grd.addColorStop(1, "#0a1a3a");
  g.fillStyle = grd; g.fillRect(0, 0, 512, 288);
  g.strokeStyle = "#5fb4ff"; g.lineWidth = 4; g.strokeRect(6, 6, 500, 276);
  g.fillStyle = "#e6f2ff";
  g.font = '700 40px "Noto Sans KR", sans-serif';
  g.fillText(title, 28, 64);
  g.fillStyle = "#8cc8ff";
  g.font = '400 22px "Noto Sans KR", sans-serif';
  g.fillText(sub, 28, 98);
  // 막대 그래프 장식
  for (let i = 0; i < 8; i++) {
    const h = 40 + ((i * 53) % 90);
    g.fillStyle = i % 3 ? "#3b82f6" : "#7dd3fc";
    g.fillRect(28 + i * 34, 250 - h, 22, h);
  }
  // 원형 게이지
  g.strokeStyle = "#1e3a8a"; g.lineWidth = 14;
  g.beginPath(); g.arc(410, 190, 56, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "#7dd3fc";
  g.beginPath(); g.arc(410, 190, 56, -Math.PI / 2, Math.PI * 1.1); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function wallScreen(g, title, sub, x, z, w = 3.2, rotY = 0) {
  const frame = box(w + 0.12, w * 0.5625 + 0.12, 0.06, mat.dark);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5625), new THREE.MeshBasicMaterial({ map: dashTexture(title, sub) }));
  scr.position.z = 0.035;
  const grp = new THREE.Group();
  grp.add(frame, scr);
  grp.position.set(x, 2.0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

// 백라이트가 들어간 KOREA MOLD 벽
function brandWall(g, x, z, rotY) {
  const grp = new THREE.Group();
  const panel = box(4.4, 2.6, 0.12, deco.gloss);
  panel.position.y = 1.3;
  const glow = box(4.6, 2.8, 0.04, deco.glow);
  glow.position.set(0, 1.3, -0.07);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: textTexture([], { w: 512, h: 128, bg: "#f8fafc", fg: "#1e3a8a", size: 64, title: "KOREA MOLD" }) }));
  sign.position.set(0, 1.8, 0.07);
  const line = box(3.6, 0.03, 0.02, deco.glow);
  line.position.set(0, 1.2, 0.07);
  grp.add(glow, panel, sign, line);
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  g.add(grp);
}

// 곡선형 관제/안내 데스크
function curvedDesk(g, x, z) {
  // 앞(+z)으로 둥근 데스크, 뒤에서 앞을 보고 앉는다
  const geo = new THREE.CylinderGeometry(1.6, 1.6, 0.9, 40, 1, true, -Math.PI * 0.35, Math.PI * 0.7);
  const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, side: THREE.DoubleSide }));
  front.position.set(x, 0.45, z);
  front.castShadow = true;
  const top = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.65, 40, 1, -Math.PI * 0.85, Math.PI * 0.7), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, side: THREE.DoubleSide }));
  top.rotation.x = -Math.PI / 2;
  top.position.set(x, 0.91, z);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.025, 6, 40, Math.PI * 0.7), deco.glow);
  strip.rotation.x = -Math.PI / 2;
  strip.rotation.z = -Math.PI * 0.85;
  strip.position.set(x, 0.25, z);
  g.add(front, top, strip);
  [-0.55, 0, 0.55].forEach((dx) => {
    const mon = box(0.5, 0.36, 0.04, new THREE.MeshStandardMaterial({ color: 0x0b1220, emissive: 0x60a5fa, emissiveIntensity: 0.9 }));
    mon.position.set(x + dx, 1.12, z + 1.3);
    mon.rotation.y = -dx * 0.5;
    g.add(mon);
  });
  const ch = new THREE.Group();
  officeChair(ch, 0, 0, 0x1f2937);
  ch.position.set(x, 0, z + 0.5);
  ch.rotation.y = Math.PI;
  g.add(ch);
}

function glassPartition(g, x, z0, z1) {
  const len = z1 - z0;
  const pane = box(0.05, 2.4, len, mat.glass);
  pane.position.set(x, 1.2, (z0 + z1) / 2);
  const rail = box(0.08, 0.04, len, deco.glow);
  rail.position.set(x, 2.42, (z0 + z1) / 2);
  g.add(pane, rail);
}

function meetingTable(g, x, z, seats = 6) {
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 48), deco.white);
  table.scale.z = 0.6;
  table.position.set(x, 0.75, z);
  table.castShadow = true;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.7, 12), deco.white);
  stem.position.set(x, 0.38, z);
  g.add(table, stem);
  for (let a = 0; a < seats; a++) {
    const ang = (a / seats) * Math.PI * 2;
    const ch = new THREE.Group();
    officeChair(ch, 0, 0);
    ch.position.set(x + Math.cos(ang) * 1.95, 0, z + Math.sin(ang) * 1.25);
    ch.rotation.y = -ang - Math.PI / 2;
    g.add(ch);
  }
}

function officeLight(g, color, x, z) {
  const l = new THREE.PointLight(color, 7, 12, 1.6);
  l.position.set(x, 3.2, z);
  g.add(l);
}

function sitter(g, p, x, z, color, task) {
  const fig = person(`${p.name}<small> ${p.role}</small>`, color);
  fig.position.set(x, 0.1, z + 0.85);
  fig.rotation.y = Math.PI;
  if (task) {
    const bubble = label(`📌 ${task}`, "bubble");
    bubble.position.y = 2.15;
    fig.add(bubble);
  }
  g.add(fig);
}

// 사람마다 지금 하는 일 (진행 → 대기 순)
function taskOf(data, name) {
  const mine = data.tasks.filter((t) => t.owner === name && t.state !== "완료");
  return (mine.find((t) => t.state === "진행") ?? mine[0])?.title;
}

// 관리 사무실: 브랜드 월, 관제 데스크, 대시보드 스크린, 책상 6석, 유리 회의실
function buildAdmin(g, data) {
  const staff = (data.staff ?? []).filter((p) => p.dept === "관리");
  floorFinish(g);
  ledStrip(g, 0x7cc4ff);
  const desks = [];
  // 인원 수만큼 책상 (한 줄 최대 3석)
  for (let i = 0; i < Math.max(2, staff.length); i++) desks.push([-0.4 + (i % 3) * 2.6, 1.4 + Math.floor(i / 3) * 2.4]);
  desks.forEach(([x, z], i) => {
    desk(g, x, z, false);
    if (staff[i]) sitter(g, staff[i], x, z, 0xa855f7, taskOf(data, staff[i].name) ?? staff[i].role);
  });
  pendant(g, 1.0, 1.4, 5.6);

  // 뒤쪽 벽: 대시보드 스크린 두 개 + 관제 데스크
  wallScreen(g, "DATA", "설비 가동 현황", -5.6, -D / 2 + 0.08);
  wallScreen(g, "MONITOR", "작업 진행률", -2.0, -D / 2 + 0.08);
  curvedDesk(g, -3.8, -1.6);

  // 오른쪽 뒤: KOREA MOLD 브랜드 월, 일정 스크린
  brandWall(g, 4.6, -D / 2 + 0.12, 0);
  const lines = data.schedule.slice(0, 4).map((s) => `${s.time}  ${s.title}`.slice(0, 22));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: textTexture(lines, { title: "오늘 일정", bg: "#0b2a5b" }) }));
  board.position.set(W / 2 - 0.08, 1.9, -2.2);
  board.rotation.y = -Math.PI / 2;
  g.add(board);

  // 왼쪽 앞: 유리 회의실
  glassPartition(g, -4.2, 0.4, D / 2);
  meetingTable(g, -6.4, 2.8);
  pendant(g, -6.4, 2.8, 2.4);

  g.add(plant(W / 2 - 0.7, -D / 2 + 0.7), plant(-W / 2 + 0.7, -D / 2 + 0.7), plant(W / 2 - 0.7, D / 2 - 0.7), plant(2.0, -D / 2 + 0.7));
  officeLight(g, 0xe6f0ff, -3, 0);
  officeLight(g, 0xe6f0ff, 3, 1.5);
}

// CAM 사무실: 듀얼 모니터 8석, 대형 리뷰 스크린, AI 패널, 서버 랙
function buildCam(g, data) {
  const staff = (data.staff ?? []).filter((p) => p.dept === "CAM");
  floorFinish(g, 0xeef1f8);
  ledStrip(g, 0xf0abfc);
  const desks = [];
  for (let i = 0; i < Math.max(6, staff.length); i++) desks.push([-W / 2 + 2.8 + (i % 3) * 2.6, 0.2 + Math.floor(i / 3) * 2.6]);
  desks.forEach(([x, z], i) => {
    desk(g, x, z, true, 0xf0abfc);
    if (staff[i]) sitter(g, staff[i], x, z, 0xf472b6, taskOf(data, staff[i].name) ?? staff[i].role);
  });
  pendant(g, -3.6, 0.2, 7.6);
  pendant(g, -3.6, 2.8, 7.6);

  // 뒤쪽 벽: 3D 모델 리뷰 스크린, 프로그램 대기 보드
  wallScreen(g, "CAM REVIEW", "3D 모델 / 공구경로 검토", -4.6, -D / 2 + 0.08, 4.2);
  const waiting = data.machines.filter((m) => m.status === "대기").map((m) => `${m.name}  ${m.job}`.slice(0, 22));
  const queued = data.tasks.filter((t) => t.state === "대기").map((t) => t.title.slice(0, 22));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: textTexture([...waiting, ...queued].slice(0, 4), { title: "프로그램 대기", bg: "#0b2a5b" }) }));
  board.position.set(0.4, 2.0, -D / 2 + 0.08);
  g.add(board);

  // 오른쪽: AI 패널, 서버 랙
  wallScreen(g, "AI", "가공 조건 추천", W / 2 - 0.08, 1.8, 2.6, -Math.PI / 2);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const rx = 4.2 + i * 1.0;
    const rack = box(0.9, 2.2, 0.9, rackMat);
    rack.position.set(rx, 1.1, -D / 2 + 0.7);
    g.add(rack);
    for (let k = 0; k < 6; k++) {
      const led = box(0.5, 0.04, 0.02, new THREE.MeshBasicMaterial({ color: k % 3 ? 0x22d3ee : 0x4ade80 }));
      led.position.set(rx, 0.4 + k * 0.3, -D / 2 + 1.16);
      g.add(led);
    }
  }
  meetingTable(g, 5.4, 2.6, 5);
  g.add(plant(-W / 2 + 0.7, D / 2 - 0.7), plant(W / 2 - 0.7, D / 2 - 0.7), plant(2.6, -D / 2 + 0.7));
  officeLight(g, 0xf5e8ff, -3, 1);
  officeLight(g, 0xe0f2ff, 5, 1);
}

function build(data) {
  if (built) return;
  built = true;
  FLOORS.forEach((f, i) => {
    const g = floorShell(f, i);
    floors[f.key] = g;
    scene.add(g);
  });
  for (const f of FLOORS) {
    if (f.kind === "shop") buildMachines(floors[f.key], data.machines.filter((m) => (m.building ?? "A동") === f.building), data, f.building);
    else if (f.dept === "관리") buildAdmin(floors[f.key], data);
    else buildCam(floors[f.key], data);
  }
}

// 층 선택
const views = {
  전체: { show: FLOORS.map((f) => f.key), target: [0, FLOOR_H * 1.7, 0], pos: [34, 42, 34] },
};
FLOORS.forEach((f, i) => {
  views[f.key] = { show: [f.key], target: [0, i * FLOOR_H + 0.5, 1], pos: [10, i * FLOOR_H + 19, 17] };
});
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
