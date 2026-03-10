-- Add clientes table to Supabase Realtime publication
-- This enables live updates when drive_folder_url is set by n8n callback
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
