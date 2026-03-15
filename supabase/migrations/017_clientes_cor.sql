-- Add cor field for manual client brand color
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cor text;
