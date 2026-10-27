// GET /api/dashboard — 화면에 필요한 데이터를 data.json 과 같은 모양으로 돌려준다.
import { neon } from "@neondatabase/serverless";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL not set" }, { status: 503 });
  }
  const sql = neon(process.env.DATABASE_URL);
  try {
    const [meta, notices, machines, staff, schedule, tasks, updated] = await Promise.all([
      sql`SELECT key, value FROM meta`,
      sql`SELECT body FROM notices ORDER BY sort, id`,
      sql`SELECT id, name, building, zone, size, status, job, owner, progress FROM machines ORDER BY building, sort, id`,
      sql`SELECT name, dept, role FROM staff ORDER BY sort, id`,
      sql`SELECT time, title, place FROM schedule
          WHERE day = (now() AT TIME ZONE 'Asia/Seoul')::date ORDER BY time`,
      sql`SELECT id, title, mold, owner, to_char(due, 'YYYY-MM-DD') AS due, state FROM tasks ORDER BY due, id`,
      sql`SELECT to_char(greatest(
            (SELECT max(updated_at) FROM machines),
            (SELECT max(updated_at) FROM tasks)
          ) AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') AS at`,
    ]);
    const m = Object.fromEntries(meta.map((r) => [r.key, r.value]));
    return Response.json(
      {
        team: m.team ?? "금형가공팀",
        updated: updated[0]?.at ?? "-",
        notice: notices.map((r) => r.body),
        machines,
        staff,
        schedule,
        tasks,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error(e);
    return Response.json({ error: "database error" }, { status: 500 });
  }
}
