-- Add new columns to study_sessions table for pomodoro timer
ALTER TABLE study_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'pomodoro',
ADD COLUMN IF NOT EXISTS setting_duration INTEGER,
ADD COLUMN IF NOT EXISTS overtime_elapsed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Update existing records to have default values
UPDATE study_sessions 
SET 
  session_type = 'pomodoro',
  setting_duration = duration,
  overtime_elapsed = 0,
  started_at = completed_at - (duration || ' seconds')::interval
WHERE session_type IS NULL;