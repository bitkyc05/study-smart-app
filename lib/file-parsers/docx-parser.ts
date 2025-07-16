import mammoth from 'mammoth';
import { FileParser, ParsedFile } from './index';

export class DOCXParser implements FileParser {
  canParse(file: File | Buffer, mimeType: string): boolean {
    return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  async parse(file: File | Buffer): Promise<ParsedFile> {
    const buffer = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file as Buffer;

    const result = await mammoth.extractRawText({ buffer });
    
    // Also extract with formatting for better structure understanding
    const htmlResult = await mammoth.convertToHtml({ buffer });
    
    // Extract headings and structure
    const headings = this.extractHeadings(htmlResult.value);

    return {
      text: result.value,
      metadata: {
        warnings: result.messages,
        headings,
        hasImages: htmlResult.value.includes('<img'),
        hasTables: htmlResult.value.includes('<table')
      }
    };
  }

  private extractHeadings(html: string): string[] {
    const headingRegex = /<h[1-6]>(.*?)<\/h[1-6]>/gi;
    const headings: string[] = [];
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push(match[1].replace(/<[^>]*>/g, ''));
    }
    
    return headings;
  }
}