-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments', 
  false, -- Private bucket
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'text/markdown',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for chat attachments
CREATE POLICY "Users can upload their own chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete files from storage that don't have corresponding file_contexts records
  DELETE FROM storage.objects
  WHERE bucket_id = 'chat-attachments'
  AND name NOT IN (
    SELECT storage_path 
    FROM public.file_contexts 
    WHERE storage_path IS NOT NULL
  )
  AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Create a scheduled job to clean up orphaned files (requires pg_cron extension)
-- This is optional and depends on your Supabase plan
-- SELECT cron.schedule('cleanup-orphaned-files', '0 3 * * *', 'SELECT cleanup_orphaned_files();');