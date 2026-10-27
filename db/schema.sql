-- 금형가공팀 AI 오피스 스키마 (Neon Postgres)

CREATE TABLE IF NOT EXISTS meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS notices (
  id         serial PRIMARY KEY,
  body       text NOT NULL,
  sort       int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machines (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  zone       text NOT NULL,
  status     text NOT NULL CHECK (status IN ('가동', '대기', '점검', '정지')),
  job        text NOT NULL DEFAULT '',
  owner      text NOT NULL DEFAULT '',
  progress   int  NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort       int  NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schedule (
  id    serial PRIMARY KEY,
  day   date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  time  text NOT NULL,
  title text NOT NULL,
  place text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS schedule_day_idx ON schedule (day);

CREATE TABLE IF NOT EXISTS tasks (
  id         serial PRIMARY KEY,
  title      text NOT NULL,
  mold       text NOT NULL DEFAULT '',
  owner      text NOT NULL DEFAULT '',
  due        date NOT NULL,
  state      text NOT NULL CHECK (state IN ('대기', '진행', '완료')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
