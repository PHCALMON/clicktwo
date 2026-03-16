-- Track who is working on each entrega (deliverable)
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS produzindo_por uuid REFERENCES profiles(id);
