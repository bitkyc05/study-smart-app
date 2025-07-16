-- Enable pgsodium extension for encryption
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Create encryption key for API keys (only once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pgsodium.key WHERE name = 'api_key_master'
  ) THEN
    PERFORM pgsodium.create_key(
      name := 'api_key_master',
      key_type := 'aead-det'
    );
  END IF;
END $$;

-- API key metadata table
CREATE TABLE IF NOT EXISTS api_key_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'grok', 'custom')),
  key_id UUID NOT NULL, -- Vault internal key ID
  encrypted_hint TEXT, -- Last 4 characters encrypted
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  custom_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, provider)
);

-- API key access log
CREATE TABLE IF NOT EXISTS api_key_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID REFERENCES api_key_metadata(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('create', 'read', 'update', 'delete', 'validate')),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_key_metadata_user_provider ON api_key_metadata(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_api_key_metadata_active ON api_key_metadata(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_key_access_log_key_id ON api_key_access_log(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_access_log_accessed_at ON api_key_access_log(accessed_at);

-- Enable RLS
ALTER TABLE api_key_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_access_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_key_metadata
CREATE POLICY "Users can manage own keys" ON api_key_metadata
  FOR ALL USING (auth.uid() = user_id);

-- RLS policies for api_key_access_log
CREATE POLICY "Users can view own access logs" ON api_key_access_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_key_metadata
      WHERE api_key_metadata.id = api_key_access_log.key_id
      AND api_key_metadata.user_id = auth.uid()
    )
  );

-- Function to store API key securely
CREATE OR REPLACE FUNCTION store_api_key(
  p_user_id UUID,
  p_provider TEXT,
  p_api_key TEXT,
  p_custom_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_key_id UUID;
  v_vault_key_id UUID;
  v_encrypted_hint TEXT;
  v_key_name TEXT;
BEGIN
  -- Generate unique key name
  v_key_name := format('api_key_%s_%s_%s', p_user_id, p_provider, gen_random_uuid());
  
  -- Encrypt hint (last 4 characters)
  v_encrypted_hint := encode(
    pgsodium.crypto_aead_det_encrypt(
      message := substr(p_api_key, -4)::bytea,
      additional := p_user_id::text::bytea,
      key_uuid := (SELECT id FROM pgsodium.key WHERE name = 'api_key_master')
    ),
    'base64'
  );

  -- Store in vault
  INSERT INTO vault.secrets (name, secret, key_id)
  VALUES (
    v_key_name,
    p_api_key,
    (SELECT id FROM pgsodium.key WHERE name = 'api_key_master')
  )
  RETURNING id INTO v_vault_key_id;

  -- Store metadata
  INSERT INTO api_key_metadata (
    user_id, provider, key_id, encrypted_hint, custom_url
  )
  VALUES (
    p_user_id, p_provider, v_vault_key_id, v_encrypted_hint, p_custom_url
  )
  ON CONFLICT (user_id, provider) DO UPDATE SET
    key_id = EXCLUDED.key_id,
    encrypted_hint = EXCLUDED.encrypted_hint,
    custom_url = EXCLUDED.custom_url,
    is_active = TRUE,
    created_at = NOW()
  RETURNING id INTO v_key_id;

  -- Log access
  INSERT INTO api_key_access_log (
    key_id, access_type, success
  )
  VALUES (v_key_id, 'create', TRUE);

  RETURN v_key_id;
END;
$$;

-- Function to get decrypted API key
CREATE OR REPLACE FUNCTION get_decrypted_api_key(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metadata RECORD;
  v_secret TEXT;
BEGIN
  -- Get metadata
  SELECT * INTO v_metadata
  FROM api_key_metadata
  WHERE user_id = p_user_id 
    AND provider = p_provider
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Check expiration
  IF v_metadata.expires_at IS NOT NULL AND v_metadata.expires_at < NOW() THEN
    UPDATE api_key_metadata 
    SET is_active = FALSE 
    WHERE id = v_metadata.id;
    RETURN NULL;
  END IF;

  -- Get secret from vault
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE id = v_metadata.key_id;

  -- Update usage
  UPDATE api_key_metadata
  SET last_used_at = NOW(),
      usage_count = usage_count + 1
  WHERE id = v_metadata.id;

  -- Log access
  INSERT INTO api_key_access_log (
    key_id, access_type, success
  )
  VALUES (v_metadata.id, 'read', TRUE);

  RETURN v_secret;
END;
$$;

-- Function to decrypt hint
CREATE OR REPLACE FUNCTION decrypt_key_hint(
  p_user_id UUID,
  p_encrypted_hint TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      message := decode(p_encrypted_hint, 'base64'),
      additional := p_user_id::text::bytea,
      key_uuid := (SELECT id FROM pgsodium.key WHERE name = 'api_key_master')
    ),
    'utf8'
  );
END;
$$;

-- Function to delete API key
CREATE OR REPLACE FUNCTION delete_api_key(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metadata RECORD;
BEGIN
  -- Get metadata
  SELECT * INTO v_metadata
  FROM api_key_metadata
  WHERE user_id = p_user_id AND provider = p_provider;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Delete from vault
  DELETE FROM vault.secrets WHERE id = v_metadata.key_id;

  -- Delete metadata
  DELETE FROM api_key_metadata WHERE id = v_metadata.id;

  -- Log is automatically deleted by CASCADE

  RETURN TRUE;
END;
$$;

-- Function to increment key usage
CREATE OR REPLACE FUNCTION increment_key_usage(
  p_key_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE api_key_metadata
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE id = p_key_id;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON api_key_metadata TO authenticated;
GRANT SELECT, INSERT ON api_key_access_log TO authenticated;
GRANT EXECUTE ON FUNCTION store_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION get_decrypted_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_key_hint TO authenticated;
GRANT EXECUTE ON FUNCTION delete_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION increment_key_usage TO authenticated;