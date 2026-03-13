-- Add data_entrega to entregas table for per-deliverable priority tracking
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS data_entrega date;
