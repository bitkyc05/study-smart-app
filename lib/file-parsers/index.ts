export interface ParsedFile {
  text: string;
  metadata: Record<string, unknown>;
  pages?: number;
  language?: string;
  structure?: unknown;
}

export interface FileParser {
  canParse(file: File | Buffer, mimeType: string): boolean;
  parse(file: File | Buffer, options?: unknown): Promise<ParsedFile>;
}