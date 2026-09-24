-- Migration: Add message_id and status tracking to broadcast_recipient_logs
ALTER TABLE public.broadcast_recipient_logs ADD COLUMN IF NOT EXISTS message_id TEXT UNIQUE;
ALTER TABLE public.broadcast_recipient_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
