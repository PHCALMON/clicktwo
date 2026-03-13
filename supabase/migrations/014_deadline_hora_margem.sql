-- Add time + margin fields to jobs and entregas for internal deadline calculation
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hora_entrega_cliente time;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS margem_horas integer DEFAULT 4;

ALTER TABLE entregas ADD COLUMN IF NOT EXISTS hora_entrega_cliente time;
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS margem_horas integer DEFAULT 4;
