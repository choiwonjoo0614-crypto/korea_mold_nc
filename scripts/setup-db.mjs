// 테이블을 만들고, 비어 있으면 data.json 예시 데이터를 넣는다.
// 실행: npm run db:setup  (.env.local 의 DATABASE_URL 사용)
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 없습니다. .env.local 파일에 넣어 주세요 (.env.example 참고).");
  process.exit(1);
}
const sql = neon(url);

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema
  .split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")
  .split(";").map((s) => s.trim()).filter(Boolean);
for (const s of statements) await sql.query(s);
console.log(`스키마 적용 완료 (${statements.length}개 구문)`);

const [{ n }] = await sql`SELECT count(*)::int AS n FROM machines`;
if (n > 0) {
  console.log(`이미 데이터가 있어 예시 데이터는 넣지 않았습니다 (설비 ${n}대).`);
  process.exit(0);
}

const data = JSON.parse(await readFile(new URL("../data.json", import.meta.url), "utf8"));

await sql.transaction((tx) => [
  tx`INSERT INTO meta (key, value) VALUES ('team', ${data.team})
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
  ...data.notice.map((body, i) => tx`INSERT INTO notices (body, sort) VALUES (${body}, ${i})`),
  ...data.machines.map((m, i) => tx`
    INSERT INTO machines (id, name, zone, status, job, owner, progress, sort)
    VALUES (${m.id}, ${m.name}, ${m.zone}, ${m.status}, ${m.job}, ${m.owner}, ${m.progress}, ${i})`),
  ...data.schedule.map((s) => tx`INSERT INTO schedule (time, title, place) VALUES (${s.time}, ${s.title}, ${s.place})`),
  ...data.tasks.map((t) => tx`
    INSERT INTO tasks (title, mold, owner, due, state)
    VALUES (${t.title}, ${t.mold}, ${t.owner}, ${t.due}, ${t.state})`),
]);
console.log(`예시 데이터 입력 완료: 설비 ${data.machines.length}, 일정 ${data.schedule.length}, 작업 ${data.tasks.length}, 공지 ${data.notice.length}`);
