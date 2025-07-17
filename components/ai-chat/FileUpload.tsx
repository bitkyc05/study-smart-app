'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image, Code, Database } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ProcessedFile } from '@/types/ai-chat.types';

interface FileUploadProps {
  onFilesProcessed: (files: ProcessedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // bytes
}

const FILE_ICONS = {
  'application/pdf': FileText,
  'text/': FileText,
  'image/': Image,
  'application/json': Database,
  'text/csv': Database,
  'default': Code
};

export default function FileUpload({ 
  onFilesProcessed, 
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClient();

  const processFile = useCallback(async (file: File): Promise<ProcessedFile> => {
    const fileId = crypto.randomUUID();
    const processedFile: ProcessedFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
      progress: 0
    };

    // Update state with uploading file
    setFiles(prev => [...prev, processedFile]);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Upload to Storage with user folder structure
      const fileName = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Create database record
      const { data: dbData, error: dbError } = await supabase
        .from('file_contexts')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: uploadData.path,
          status: 'processing'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Update status to processing  
      updateFileStatus(fileId, 'processing');
      updateFileProgress(fileId, 100);

      // 4. Process file content
      if (file.size > 100 * 1024 || !file.type.startsWith('text/')) {
        // Large files or non-text files - mark as ready without text extraction
        await supabase
          .from('file_contexts')
          .update({
            status: 'ready',
            processed_at: new Date().toISOString()
          })
          .eq('id', dbData.id);

        updateFileStatus(fileId, 'ready');
      } else {
        // Small text files - process immediately
        const text = await file.text();
        await supabase
          .from('file_contexts')
          .update({
            content_text: text,
            status: 'ready',
            processed_at: new Date().toISOString()
          })
          .eq('id', dbData.id);

        updateFileStatus(fileId, 'ready', text);
      }

      return {
        ...processedFile,
        id: dbData.id, // Use the actual file_context ID from database
        status: 'ready',
        url: uploadData.path
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFileStatus(fileId, 'error', undefined, errorMessage);
      throw error;
    }
  }, [supabase]);

  const updateFileProgress = (fileId: string, progress: number) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, progress } : f
    ));
  };

  const updateFileStatus = (
    fileId: string, 
    status: ProcessedFile['status'],
    extractedText?: string,
    error?: string
  ) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status, extractedText, error, progress: 100 } 
        : f
    ));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`최대 ${maxFiles}개 파일만 업로드 가능합니다`);
      return;
    }

    setIsProcessing(true);

    try {
      const processedFiles = await Promise.all(
        acceptedFiles.map(file => processFile(file))
      );

      // Filter out any failed files and pass only ready ones
      const readyFiles = processedFiles.filter(f => f.status === 'ready');
      if (readyFiles.length > 0) {
        onFilesProcessed(readyFiles);
      }
    } catch {
      toast.error('파일 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  }, [files.length, maxFiles, onFilesProcessed, processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/*': ['.txt', '.md', '.csv', '.log'],
      'application/json': ['.json'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'text/plain': ['.js', '.ts', '.py', '.java', '.cpp', '.go', '.rs', '.rb', '.php']
    }
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (type: string) => {
    for (const [key, Icon] of Object.entries(FILE_ICONS)) {
      if (type.startsWith(key)) return Icon;
    }
    return FILE_ICONS.default;
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200 
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 bg-muted/30'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${isDragActive ? 'bg-blue-100 dark:bg-blue-800' : 'bg-muted'}`}>
            <Upload className={`w-8 h-8 ${isDragActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
          </div>
          {isDragActive ? (
            <div>
              <p className="text-blue-600 dark:text-blue-400 font-medium">파일을 여기에 놓으세요</p>
              <p className="text-sm text-blue-500 dark:text-blue-300 mt-1">파일이 업로드됩니다</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-foreground">
                클릭하거나 파일을 드래그하세요
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, Word, 텍스트, 이미지, 코드 파일 지원
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                최대 {maxFiles}개 파일, 각 {maxSize / 1024 / 1024}MB까지
              </p>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">업로드 중인 파일</p>
            <p className="text-xs text-muted-foreground">{files.length}개 파일</p>
          </div>
          {files.map(file => {
            const Icon = getFileIcon(file.type);
            
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 transition-all hover:bg-muted/70"
              >
                <div className={`p-2 rounded-lg ${
                  file.status === 'error' ? 'bg-red-100 dark:bg-red-900/20' : 
                  file.status === 'ready' ? 'bg-green-100 dark:bg-green-900/20' : 
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    file.status === 'error' ? 'text-red-600 dark:text-red-400' :
                    file.status === 'ready' ? 'text-green-600 dark:text-green-400' :
                    'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {file.status === 'uploading' && (
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{file.progress}%</span>
                      </div>
                    </div>
                  )}

                  {file.status === 'processing' && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-muted-foreground">처리 중</span>
                    </div>
                  )}

                  {file.status === 'ready' && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs text-green-600 dark:text-green-400">준비됨</span>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-red-600 dark:text-red-400" title={file.error}>
                        오류
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                    title="파일 제거"
                  >
                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}