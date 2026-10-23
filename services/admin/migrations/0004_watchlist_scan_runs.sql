-- Persist the owner's explicit monitoring scope and immutable inspection rounds.
-- Registry rows are refreshed from the checked-in catalog; watchlist rows are
-- user-managed and are never inferred from the full catalog.
CREATE TABLE IF NOT EXISTS source_registry (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  acronym TEXT,
  official_url TEXT,
  parent_id TEXT,
  year INTEGER,
  record_type TEXT NOT NULL,
  entity_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(project_id,entity_id)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  scope_kind TEXT NOT NULL CHECK(scope_kind IN ('venue','call')),
  scope_json TEXT NOT NULL DEFAULT '{}',
  official_url TEXT,
  applicability_json TEXT NOT NULL DEFAULT '{}',
  check_strategy_json TEXT NOT NULL DEFAULT '{}',
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_success_at TEXT,
  last_change_at TEXT,
  PRIMARY KEY(project_id,entity_id),
  FOREIGN KEY(project_id,entity_id) REFERENCES source_registry(project_id,entity_id)
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  list_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','partial','complete','failed')),
  manifest_json TEXT NOT NULL,
  cursor INTEGER NOT NULL DEFAULT 0,
  started_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS scan_run_items (
  run_id TEXT NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','checked','changed','discovered','no-change','failed','partial','paused','not-checked')),
  checked_at TEXT,
  fetched_at TEXT,
  source_hash TEXT,
  evidence_json TEXT,
  result_json TEXT,
  error TEXT,
  PRIMARY KEY(run_id,entity_id),
  UNIQUE(run_id,ordinal),
  FOREIGN KEY(project_id,entity_id) REFERENCES source_registry(project_id,entity_id)
);

CREATE INDEX IF NOT EXISTS watchlist_enabled_idx ON watchlist_items(project_id,enabled,entity_id);
CREATE INDEX IF NOT EXISTS scan_runs_project_idx ON scan_runs(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS scan_run_items_status_idx ON scan_run_items(run_id,status,ordinal);
