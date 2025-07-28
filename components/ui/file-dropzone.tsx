'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  isProcessing?: boolean;
  selectedFile?: File | null;
  error?: string;
  success?: string;
  className?: string;
}

export function FileDropzone({
  onFileSelect,
  onFileRemove,
  accept = '.docx',
  maxSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  isProcessing = false,
  selectedFile,
  error,
  success,
  className,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragOver(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || isProcessing) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file) {
      validateAndSelectFile(file);
    }
  }, [disabled, isProcessing]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, []);

  const validateAndSelectFile = (file: File) => {
    // Check file size
    if (file.size > maxSize) {
      return;
    }

    // Check file type
    if (accept && !file.name.toLowerCase().endsWith(accept.replace('.', ''))) {
      return;
    }

    onFileSelect(file);
  };

  const handleRemoveFile = () => {
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-colors',
            isDragOver && !disabled && !isProcessing
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25',
            disabled || isProcessing
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-muted-foreground/50 cursor-pointer',
            error && 'border-destructive bg-destructive/5'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isProcessing) {
              document.getElementById('file-input')?.click();
            }
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isProcessing) {
              e.preventDefault();
              document.getElementById('file-input')?.click();
            }
          }}
        >
          <input
            id="file-input"
            type="file"
            accept={accept}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={disabled || isProcessing}
          />

          <div className="flex flex-col items-center justify-center text-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-2">
              {isProcessing ? 'Processing file...' : 'Drop your .docx file here'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
                {isProcessing && (
                  <p className="text-xs text-primary mt-1">
                    Processing file...
                  </p>
                )}
              </div>
            </div>
            {!isProcessing && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="flex items-center space-x-2 mt-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 mt-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}