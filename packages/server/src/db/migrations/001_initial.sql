CREATE TABLE IF NOT EXISTS routing_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  parcel_id       TEXT NOT NULL UNIQUE,
  weight          REAL NOT NULL,
  value           REAL NOT NULL,
  destination     TEXT NOT NULL,
  description     TEXT,
  department      TEXT,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  matched_rules   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'completed',
  batch_id        TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routing_history_status ON routing_history(status);
CREATE INDEX IF NOT EXISTS idx_routing_history_department ON routing_history(department);
CREATE INDEX IF NOT EXISTS idx_routing_history_batch_id ON routing_history(batch_id);
CREATE INDEX IF NOT EXISTS idx_routing_history_created_at ON routing_history(created_at);

CREATE TABLE IF NOT EXISTS batch_jobs (
  id              TEXT PRIMARY KEY,
  filename        TEXT NOT NULL,
  content_hash    TEXT,
  total_count     INTEGER NOT NULL DEFAULT 0,
  processed       INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'processing',
  errors          TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    DATETIME
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_content_hash ON batch_jobs(content_hash);
