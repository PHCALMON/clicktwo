-- Add assignee_id to track who is responsible for the job
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_jobs_assignee ON jobs(assignee_id);
