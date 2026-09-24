-- Migration: Add index on message_id (wamid) in broadcast_recipient_logs to speed up webhook status updates
CREATE INDEX IF NOT EXISTS idx_broadcast_logs_message_id
ON public.broadcast_recipient_logs (message_id);
