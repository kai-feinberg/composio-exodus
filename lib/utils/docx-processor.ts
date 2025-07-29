import mammoth from 'mammoth';

export interface DocxProcessingResult {
  text: string;
  wordCount: number;
  characterCount: number;
  warnings: string[];
}

export interface DocxProcessingError {
  message: string;
  code:
    | 'INVALID_FILE'
    | 'PROCESSING_FAILED'
    | 'EMPTY_CONTENT'
    | 'FILE_TOO_LARGE';
}

/**
 * Extract plain text from a DOCX file using mammoth.js
 * @param file - The DOCX file to process
 * @returns Promise with extracted text and metadata
 */
export async function extractTextFromDocx(
  file: File,
): Promise<DocxProcessingResult> {
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.docx')) {
    const error = new Error('Only .docx files are supported') as any;
    error.code = 'INVALID_FILE';
    throw error;
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    const error = new Error('File size exceeds 10MB limit') as any;
    error.code = 'FILE_TOO_LARGE';
    throw error;
  }

  try {
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });

    // Clean up the extracted text
    const cleanText = result.value.trim();

    // Check if content is empty
    if (!cleanText) {
      const error = new Error(
        'Document appears to be empty or contains no readable text',
      ) as any;
      error.code = 'EMPTY_CONTENT';
      throw error;
    }

    // Calculate metrics
    const wordCount = cleanText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const characterCount = cleanText.length;

    // Extract warnings from mammoth result
    const warnings = result.messages.map((msg) => msg.message);

    return {
      text: cleanText,
      wordCount,
      characterCount,
      warnings,
    };
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      throw error; // Re-throw our custom errors
    }

    const processingError = new Error(
      `Failed to process DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ) as any;
    processingError.code = 'PROCESSING_FAILED';
    throw processingError;
  }
}

/**
 * Validate if a file is a valid DOCX file
 * @param file - File to validate
 * @returns boolean indicating if file is valid
 */
export function isValidDocxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.docx') &&
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    file.size <= 10 * 1024 * 1024 // 10MB limit
  );
}

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
