import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessFileRequest {
  fileId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { fileId, fileName, fileType, storagePath } = await req.json() as ProcessFileRequest;

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('chat-attachments')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Process based on file type
    let extractedText = '';
    let metadata: Record<string, any> = {};

    try {
      if (fileType === 'application/pdf') {
        // For PDF processing, we'll use an external service or simplified extraction
        extractedText = await processPDF(fileData);
        metadata.type = 'pdf';
      } else if (fileType.startsWith('image/')) {
        // For images, we'll store base64 for multimodal AI
        const base64 = await blobToBase64(fileData);
        extractedText = `[Image: ${fileName}]`;
        metadata = {
          type: 'image',
          base64,
          mimeType: fileType
        };
      } else if (fileType === 'text/csv') {
        // Process CSV
        const text = await fileData.text();
        const processed = processCSV(text);
        extractedText = processed.text;
        metadata = processed.metadata;
      } else if (fileType.startsWith('text/') || isCodeFile(fileName)) {
        // Plain text or code files
        extractedText = await fileData.text();
        metadata.type = 'text';
        metadata.language = detectLanguage(fileName);
      } else {
        // Unsupported file type
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Update database with processed content
      const { error: updateError } = await supabaseClient
        .from('file_contexts')
        .update({
          content_text: extractedText,
          metadata,
          status: 'ready',
          processed_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (updateError) {
        throw new Error(`Failed to update file context: ${updateError.message}`);
      }

      // Generate embedding for semantic search (optional)
      // This would require OpenAI API key and additional processing

      return new Response(
        JSON.stringify({ success: true, fileId }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (processingError) {
      // Update status to failed
      await supabaseClient
        .from('file_contexts')
        .update({
          status: 'failed',
          error_message: processingError.message,
          processed_at: new Date().toISOString()
        })
        .eq('id', fileId);

      throw processingError;
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Helper functions
async function processPDF(blob: Blob): Promise<string> {
  // Simplified PDF text extraction
  // In production, use a proper PDF parsing service
  return '[PDF content extraction requires external service]';
}

function processCSV(text: string): { text: string; metadata: any } {
  const lines = text.split('\n');
  const headers = lines[0]?.split(',') || [];
  
  // Create markdown table
  let markdown = '| ' + headers.join(' | ') + ' |\n';
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
  
  const maxRows = 50;
  for (let i = 1; i < Math.min(lines.length, maxRows + 1); i++) {
    const cells = lines[i].split(',');
    markdown += '| ' + cells.join(' | ') + ' |\n';
  }
  
  if (lines.length > maxRows) {
    markdown += `\n... and ${lines.length - maxRows} more rows`;
  }

  return {
    text: markdown,
    metadata: {
      type: 'csv',
      headers,
      rowCount: lines.length - 1,
      columnCount: headers.length,
      truncated: lines.length > maxRows
    }
  };
}

function isCodeFile(fileName: string): boolean {
  const codeExtensions = [
    '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c',
    '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala'
  ];
  return codeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

function detectLanguage(fileName: string): string | undefined {
  const extensionMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.cpp': 'cpp',
    '.go': 'go',
    '.rs': 'rust',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin'
  };

  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  return extensionMap[ext];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}