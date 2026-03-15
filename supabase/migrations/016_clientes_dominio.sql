-- Add dominio field for Clearbit logo integration
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dominio text;
