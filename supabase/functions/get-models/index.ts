import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GetModelsRequest {
  provider: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { provider }: GetModelsRequest = await req.json();
    if (!provider) {
      return new Response(
        JSON.stringify({ error: 'Provider is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from database
    const { data: apiKeyData, error: keyError } = await supabase
      .rpc('get_api_key_simple', {
        p_user_id: user.id,
        p_provider: provider
      });

    if (keyError || !apiKeyData) {
      // No API key found - return empty models array
      return new Response(
        JSON.stringify({ models: [], hasApiKey: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch models based on provider
    let models: string[] = [];
    let error: string | null = null;

    try {
      switch (provider) {
        case 'openai': {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKeyData}`,
            },
          });

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          // Filter chat models and sort
          models = data.data
            .filter((model: any) => 
              model.id.includes('gpt') || 
              model.id.includes('chatgpt') ||
              model.id.startsWith('o1') ||
              model.id.startsWith('o3') ||
              model.id.startsWith('o4')
            )
            .map((model: any) => model.id)
            .sort()
            .reverse(); // Latest models first
          break;
        }

        case 'anthropic': {
          // Anthropic doesn't have a models endpoint, so return known models
          models = [
            'claude-3-opus-20240229',
            'claude-3-5-sonnet-20241022',
            'claude-3-haiku-20240307',
            'claude-2.1',
            'claude-2.0',
          ];
          break;
        }

        case 'google': {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyData}`,
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Google API error: ${response.status}`);
          }

          const data = await response.json();
          models = data.models
            .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
            .map((model: any) => model.name.replace('models/', ''))
            .sort();
          break;
        }

        case 'grok': {
          const response = await fetch('https://api.x.ai/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKeyData}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Grok API error: ${response.status}`);
          }

          const data = await response.json();
          models = data.data.map((model: any) => model.id).sort();
          break;
        }

        case 'custom': {
          // For custom providers, we can't fetch models
          models = [];
          break;
        }

        default:
          models = [];
      }
    } catch (e) {
      console.error(`Error fetching models for ${provider}:`, e);
      error = e.message;
    }

    // Track API key usage
    await supabase.rpc('increment_key_usage', {
      p_user_id: user.id,
      p_provider: provider
    });

    return new Response(
      JSON.stringify({ 
        models, 
        hasApiKey: true,
        error 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        models: [],
        hasApiKey: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});