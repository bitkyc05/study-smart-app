import { FileParser, ParsedFile } from './index';
import { PDFParser } from './pdf-parser';
import { DOCXParser } from './docx-parser';
import { CodeParser } from './code-parser';
import { CSVParser } from './csv-parser';
import { ImageParser } from './image-parser';

export class FileParserFactory {
  private static parsers: FileParser[] = [
    new PDFParser(),
    new DOCXParser(),
    new CodeParser(),
    new CSVParser(),
    new ImageParser()
  ];

  static async parse(file: File | Buffer, mimeType: string): Promise<ParsedFile> {
    const parser = this.parsers.find(p => p.canParse(file, mimeType));
    
    if (!parser) {
      // Default text parser
      const text = file instanceof File 
        ? await file.text()
        : file.toString('utf-8');
      
      return {
        text,
        metadata: {
          type: 'plain_text',
          size: file instanceof File ? file.size : file.length
        }
      };
    }
    
    return parser.parse(file);
  }
}