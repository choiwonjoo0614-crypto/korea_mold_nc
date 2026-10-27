const STATES = ["가동", "대기", "점검", "정지"];
const COLUMNS = ["대기", "진행", "완료"];
let data = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// 마감일까지 남은 일수 (음수면 지남)
function daysLeft(due) {
  const d = new Date(due + "T00:00:00");
  return Math.round((d - today()) / 86400000);
}

function dueLabel(task) {
  if (task.state === "완료") return { text: task.due.slice(5), cls: "" };
  const n = daysLeft(task.due);
  if (n < 0) return { text: `${-n}일 지연`, cls: "late" };
  if (n === 0) return { text: "오늘 마감", cls: "late" };
  if (n <= 1) return { text: `D-${n}`, cls: "soon" };
  return { text: `D-${n}`, cls: "" };
}

function tickClock() {
  const now = new Date();
  $("now-date").textContent = now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  $("now-time").textContent = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (data) renderSchedule();
}

function renderSummary() {
  const m = data.machines;
  const open = data.tasks.filter((t) => t.state !== "완료");
  const late = open.filter((t) => daysLeft(t.due) < 0);
  const dueToday = open.filter((t) => daysLeft(t.due) === 0);
  const soon = open.filter((t) => daysLeft(t.due) === 1);
  const stopped = m.filter((x) => x.status === "정지");
  const checking = m.filter((x) => x.status === "점검");
  const running = m.filter((x) => x.status === "가동").length;

  const lines = [`설비 ${m.length}대 중 ${running}대 가동 중 (가동률 ${Math.round((running / m.length) * 100)}%)`];
  if (stopped.length) lines.push(`정지 설비: ${stopped.map((x) => `${x.name}(${x.job})`).join(", ")} — 조치 필요`);
  if (checking.length) lines.push(`점검 중: ${checking.map((x) => x.name).join(", ")}`);
  if (late.length) lines.push(`마감 지연 ${late.length}건: ${late.map((t) => t.title).join(", ")}`);
  if (dueToday.length) lines.push(`오늘 마감 ${dueToday.length}건: ${dueToday.map((t) => t.title).join(", ")}`);
  if (soon.length) lines.push(`내일 마감 ${soon.length}건: ${soon.map((t) => t.title).join(", ")}`);
  $("summary").innerHTML = lines.map((l) => `<li>${esc(l)}</li>`).join("");
}

function renderKpis() {
  $("kpis").innerHTML = STATES.map((s) => {
    const n = data.machines.filter((x) => x.status === s).length;
    return `<div class="kpi"><div class="label"><span class="dot s-${s}"></span>${s}</div><div class="num">${n}</div></div>`;
  }).join("");
}

function renderZones() {
  const zones = [...new Set(data.machines.map((x) => x.zone))];
  $("zones").innerHTML = zones.map((z) => `
    <div class="zone">
      <div class="zone-name">${esc(z)}</div>
      <div class="machines">
        ${data.machines.filter((x) => x.zone === z).map((x) => `
          <div class="machine st-${esc(x.status)}" title="${esc(x.id)}">
            <div class="row"><span class="name">${esc(x.name)}</span><span class="badge">${esc(x.status)}</span></div>
            <div class="job">${esc(x.job)}</div>
            <div class="owner">${esc(x.owner)}</div>
            <div class="bar"><span style="width:${Number(x.progress) || 0}%"></span></div>
          </div>`).join("")}
      </div>
    </div>`).join("");
}

function renderSchedule() {
  const now = new Date();
  const hm = now.getHours() * 60 + now.getMinutes();
  const mins = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const nextIdx = data.schedule.findIndex((s) => mins(s.time) >= hm);
  $("schedule").innerHTML = data.schedule.map((s, i) => {
    const cls = i === nextIdx ? "next" : mins(s.time) < hm ? "past" : "";
    return `<li class="${cls}"><span class="t">${esc(s.time)}</span><span>${esc(s.title)}<br><span class="muted small">${esc(s.place)}</span></span></li>`;
  }).join("");
}

function renderNotice() {
  $("notice").innerHTML = data.notice.map((n) => `<li>${esc(n)}</li>`).join("");
}

function renderBoard() {
  const q = $("search").value.trim().toLowerCase();
  const hit = (t) => !q || [t.title, t.mold, t.owner].some((v) => String(v).toLowerCase().includes(q));
  for (const col of COLUMNS) {
    const items = data.tasks.filter((t) => t.state === col && hit(t)).sort((a, b) => a.due.localeCompare(b.due));
    $("c-" + col).textContent = items.length;
    $("col-" + col).innerHTML = items.length
      ? items.map((t) => {
          const d = dueLabel(t);
          return `<div class="task"><div class="title">${esc(t.title)}</div><div class="meta"><span>${esc(t.owner)}</span><span class="due ${d.cls}">${esc(d.text)}</span></div></div>`;
        }).join("")
      : `<div class="empty">없음</div>`;
  }
}

async function load() {
  try {
    const res = await fetch("data.json", { cache: "no-store" });
    data = await res.json();
  } catch (e) {
    $("summary").innerHTML = `<li>data.json을 불러오지 못했습니다.</li>`;
    return;
  }
  $("team").textContent = data.team;
  $("updated").textContent = data.updated;
  renderSummary();
  renderKpis();
  renderZones();
  renderSchedule();
  renderNotice();
  renderBoard();
}

$("search").addEventListener("input", () => data && renderBoard());
tickClock();
setInterval(tickClock, 30000);
load();
