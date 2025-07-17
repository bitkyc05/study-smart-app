import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  messages: Message[]
  provider: string
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  fileContexts?: string[]  // 파일 컨텍스트 ID 배열
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('User authenticated:', user.id)

    // Parse request body
    const body: ChatRequest = await req.json()
    const { messages, provider, model, temperature, maxTokens, stream, fileContexts } = body

    console.log('Request details:', { provider, model, userId: user.id, fileContexts })

    // Handle model name mappings
    let actualModel = model
    if (provider === 'openai') {
      if (model === 'o4-mini') {
        actualModel = 'gpt-4o-mini'
        console.log('Mapping o4-mini to gpt-4o-mini')
      } else if (model === 'o3-mini') {
        actualModel = 'gpt-4o-mini' // o3-mini doesn't exist yet, use gpt-4o-mini
        console.log('Mapping o3-mini to gpt-4o-mini')
      }
    }

    // Get API key from vault
    const { data: apiKey, error: keyError } = await supabase.rpc('get_api_key_simple', {
      p_user_id: user.id,
      p_provider: provider
    })

    if (keyError) {
      console.error('RPC error:', keyError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to retrieve API key',
          details: keyError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not found or inactive' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Process messages with file contexts
    let processedMessages = [...messages]
    
    // If there are file contexts, fetch them and append to the last user message
    if (fileContexts && fileContexts.length > 0) {
      console.log('Fetching file contexts:', fileContexts)
      
      const { data: files, error: filesError } = await supabase
        .from('file_contexts')
        .select('id, file_name, file_type, file_size, content_text, storage_path')
        .in('id', fileContexts)
        .eq('user_id', user.id)
      
      if (filesError) {
        console.error('Error fetching file contexts:', filesError)
      } else if (files && files.length > 0) {
        // Find the last user message
        const lastUserMessageIndex = processedMessages.findLastIndex(m => m.role === 'user')
        if (lastUserMessageIndex !== -1) {
          let fileContextText = '\n\n--- 첨부된 파일 ---\n'
          
          for (const file of files) {
            fileContextText += `\n📎 ${file.file_name} (${(file.file_size / 1024).toFixed(1)} KB)\n`
            
            // If it's an image, get the public URL
            if (file.file_type.startsWith('image/')) {
              const { data: publicUrl } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(file.storage_path)
              
              if (publicUrl) {
                fileContextText += `[이미지 파일: ${publicUrl.publicUrl}]\n`
              }
            }
            
            // If we have text content, include it
            if (file.content_text) {
              fileContextText += `내용:\n${file.content_text}\n`
            }
          }
          
          // Append file context to the last user message
          processedMessages[lastUserMessageIndex].content += fileContextText
        }
      }
    }

    // Get custom URL if provider is custom
    let customUrl: string | undefined
    if (provider === 'custom') {
      const { data: metadata } = await supabase
        .from('api_key_metadata')
        .select('custom_url')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .single()
      
      customUrl = metadata?.custom_url
    }

    // Call the appropriate AI provider
    let response: Response
    console.log('About to call AI provider:', provider, 'with model:', model)
    
    try {
      switch (provider) {
        case 'openai':
          response = await callOpenAI(apiKey, processedMessages, model, temperature, maxTokens, stream)
          break
        case 'anthropic':
          response = await callAnthropic(apiKey, processedMessages, model, temperature, maxTokens, stream)
          break
        case 'google':
          response = await callGoogle(apiKey, processedMessages, model, temperature, maxTokens, stream)
          break
        case 'grok':
          response = await callGrok(apiKey, processedMessages, model, temperature, maxTokens, stream)
          break
        case 'custom':
          response = await callCustom(apiKey, processedMessages, model, temperature, maxTokens, stream, customUrl)
          break
        default:
          return new Response(
            JSON.stringify({ error: 'Unknown provider' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
      }
    } catch (providerError) {
      console.error('Provider call error:', providerError)
      throw providerError
    }

    // Return the AI response with CORS headers
    const responseHeaders = new Headers(response.headers)
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value)
    })

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    })

  } catch (error) {
    console.error('Error in chat function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Provider-specific functions
async function callOpenAI(
  apiKey: string,
  messages: Message[],
  model = 'gpt-3.5-turbo',
  temperature = 0.7,
  maxTokens = 4096,
  stream = false
): Promise<Response> {
  console.log('Calling OpenAI with model:', model)
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API error:', response.status, errorText)
  }

  return response
}

async function callAnthropic(
  apiKey: string,
  messages: Message[],
  model = 'claude-3-haiku-20240307',
  temperature = 0.7,
  maxTokens = 4096,
  stream = false
): Promise<Response> {
  // Convert messages to Anthropic format
  const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }))

  const systemMessage = messages.find(m => m.role === 'system')?.content

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      system: systemMessage,
      temperature,
      max_tokens: maxTokens,
      stream
    })
  })

  return response
}

async function callGoogle(
  apiKey: string,
  messages: Message[],
  model = 'gemini-pro',
  temperature = 0.7,
  maxTokens = 4096,
  stream = false
): Promise<Response> {
  console.log('Calling Google Gemini with model:', model)
  console.log('API Key loaded:', !!apiKey)
  
  // Helper function to extract image URLs from content
  const extractImageUrls = (content: string): { text: string, imageUrls: string[] } => {
    const imageRegex = /\[이미지 파일: ([^\]]+)\]/g
    const imageUrls: string[] = []
    let match
    
    while ((match = imageRegex.exec(content)) !== null) {
      imageUrls.push(match[1])
    }
    
    // Remove image URL tags from text
    const cleanText = content.replace(imageRegex, '').trim()
    
    return { text: cleanText, imageUrls }
  }
  
  // Helper function to fetch and convert image to base64
  const fetchImageAsBase64 = async (url: string): Promise<{ imageBytes: string, mimeType: string } | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error('Failed to fetch image:', url)
        return null
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const mimeType = response.headers.get('content-type') || 'image/jpeg'
      
      return { imageBytes: base64, mimeType }
    } catch (error) {
      console.error('Error fetching image:', error)
      return null
    }
  }
  
  // Convert messages to Google format with multimodal support
  const contents = await Promise.all(
    messages
      .filter(m => m.role !== 'system')
      .map(async (m) => {
        const { text, imageUrls } = extractImageUrls(m.content)
        const parts: any[] = []
        
        // Add text part if exists
        if (text) {
          parts.push({ text })
        }
        
        // Add image parts
        for (const imageUrl of imageUrls) {
          const imageData = await fetchImageAsBase64(imageUrl)
          if (imageData) {
            parts.push({
              inline_data: {
                mime_type: imageData.mimeType,
                data: imageData.imageBytes
              }
            })
          }
        }
        
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        }
      })
  )

  const requestBody = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    }
  }

  console.log('Request to Gemini:', JSON.stringify(requestBody, null, 2))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Google Gemini API error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    
    // Create a proper error response with details
    return new Response(
      JSON.stringify({ 
        error: 'Google Gemini API error',
        details: errorText,
        status: response.status
      }),
      {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return response
}

async function callGrok(
  apiKey: string,
  messages: Message[],
  model = 'grok-1',
  temperature = 0.7,
  maxTokens = 4096,
  stream = false
): Promise<Response> {
  // Grok uses OpenAI-compatible API
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    })
  })

  return response
}

async function callCustom(
  apiKey: string,
  messages: Message[],
  model = 'custom-model',
  temperature = 0.7,
  maxTokens = 4096,
  stream = false,
  customUrl?: string
): Promise<Response> {
  if (!customUrl) {
    throw new Error('Custom URL is required for custom provider')
  }

  // Assume OpenAI-compatible API
  const response = await fetch(`${customUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    })
  })

  return response
}