-- Feature: Free text for "Estudando" status (what the person is studying)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status_texto text;
