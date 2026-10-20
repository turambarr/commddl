PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipients (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','enabled','disabled','failed')),
  verification_hash TEXT,
  verification_expires_at TEXT,
  last_sent_at TEXT,
  last_error TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id,email_hash)
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  last_attempt_at TEXT,
  last_successful_fetch_at TEXT,
  next_check_at TEXT,
  last_fetched_hash TEXT,
  last_published_hash TEXT,
  last_fetched_json TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_message TEXT,
  pending_batch_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(project_id,entity_id)
);

CREATE TABLE IF NOT EXISTS update_batches (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('awaiting-notice','awaiting-review','building-pr','awaiting-publish','publishing','published','rejected','failed','notice-incomplete')),
  base_sha TEXT,
  content_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  decisions_json TEXT NOT NULL DEFAULT '{}',
  final_sha TEXT,
  pr_number INTEGER,
  pr_url TEXT,
  notification_version INTEGER,
  notification_status TEXT NOT NULL DEFAULT 'pending',
  notification_sha TEXT,
  reviewer_login TEXT,
  approved_sha TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(id,version)
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL,
  batch_version INTEGER NOT NULL,
  recipient_id TEXT REFERENCES recipients(id) ON DELETE SET NULL,
  email_hash TEXT NOT NULL,
  mail_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','sending','sent','delivered','failed','bounced')),
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(batch_id,batch_version,email_hash,mail_type)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_nonces (
  request_id TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS batches_status_idx ON update_batches(project_id,status,created_at);
CREATE INDEX IF NOT EXISTS outbox_status_idx ON notification_outbox(project_id,status,created_at);
CREATE INDEX IF NOT EXISTS sources_due_idx ON source_snapshots(project_id,next_check_at);
