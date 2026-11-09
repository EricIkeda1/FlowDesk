CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(80) NOT NULL, email varchar(254) UNIQUE NOT NULL, password_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, title varchar(140) NOT NULL, description text NOT NULL DEFAULT '', project text NOT NULL CHECK(project IN ('Website','Mobile','Plataforma')), priority text NOT NULL CHECK(priority IN ('baixa','média','alta')), status text NOT NULL CHECK(status IN ('backlog','progress','review','done')), due_date date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS activities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,message text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS activities_user_idx ON activities(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS auth_limits(key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL);
