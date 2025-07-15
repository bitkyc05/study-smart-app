-- Add timezone column to user_settings table
-- This will store the user's selected timezone (IANA timezone identifier)
-- Default to UTC if not set

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add a comment to document the column
COMMENT ON COLUMN public.user_settings.timezone IS 'User selected timezone (IANA timezone identifier, e.g., Asia/Seoul, America/New_York)';