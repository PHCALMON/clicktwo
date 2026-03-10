-- Migration: Add drive_folder_url to clientes
-- Stores the Google Drive folder link for each client (e.g. JOBS 2026/CLIENTE/)

ALTER TABLE clientes ADD COLUMN drive_folder_url text;
