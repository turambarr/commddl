-- Record manual GitHub merges separately from Pages deployment. The source
-- baseline is released only after a trusted workflow verifies the closed PR.
CREATE TABLE update_batches_v3 (
  id TEXT NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('awaiting-notice','awaiting-review','building-pr','awaiting-publish','publishing','awaiting-manual-merge','merged-awaiting-deploy','deployed','closed-unmerged','published','rejected','failed','notice-incomplete')),
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
  merged_sha TEXT,
  merged_at TEXT,
  deployment_status TEXT NOT NULL DEFAULT 'pending' CHECK(deployment_status IN ('pending','deployed','failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(id,version)
);
INSERT INTO update_batches_v3(
  id,project_id,version,status,base_sha,content_hash,payload_json,decisions_json,
  final_sha,pr_number,pr_url,notification_version,notification_status,
  notification_sha,reviewer_login,approved_sha,created_at,updated_at
)
SELECT id,project_id,version,status,base_sha,content_hash,payload_json,decisions_json,
       final_sha,pr_number,pr_url,notification_version,notification_status,
       notification_sha,reviewer_login,approved_sha,created_at,updated_at
FROM update_batches;
DROP TABLE update_batches;
ALTER TABLE update_batches_v3 RENAME TO update_batches;
CREATE INDEX batches_status_idx ON update_batches(project_id,status,created_at);
CREATE INDEX batches_pr_idx ON update_batches(project_id,pr_number);
CREATE INDEX batches_merge_idx ON update_batches(project_id,merged_sha);
