import * as pdfjs from 'pdfjs-dist';
import { FileParser, ParsedFile } from './index';

// PDF.js 워커 설정
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export class PDFParser implements FileParser {
  canParse(file: File | Buffer, mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async parse(file: File | Buffer): Promise<ParsedFile> {
    const arrayBuffer = file instanceof File 
      ? await file.arrayBuffer() 
      : new Uint8Array(file as Buffer);

    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const metadata = await pdf.getMetadata();
    
    let fullText = '';
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .filter((item): item is any => 'str' in item) // eslint-disable-line @typescript-eslint/no-explicit-any
        .map((item) => item.str)
        .join(' ');
      
      pageTexts.push(pageText);
      fullText += pageText + '\n\n';
    }

    return {
      text: fullText.trim(),
      metadata: {
        title: (metadata.info as any)?.Title || 'Untitled', // eslint-disable-line @typescript-eslint/no-explicit-any
        author: (metadata.info as any)?.Author, // eslint-disable-line @typescript-eslint/no-explicit-any
        subject: (metadata.info as any)?.Subject, // eslint-disable-line @typescript-eslint/no-explicit-any
        keywords: (metadata.info as any)?.Keywords, // eslint-disable-line @typescript-eslint/no-explicit-any
        creator: (metadata.info as any)?.Creator, // eslint-disable-line @typescript-eslint/no-explicit-any
        producer: (metadata.info as any)?.Producer, // eslint-disable-line @typescript-eslint/no-explicit-any
        creationDate: (metadata.info as any)?.CreationDate, // eslint-disable-line @typescript-eslint/no-explicit-any
        modificationDate: (metadata.info as any)?.ModDate, // eslint-disable-line @typescript-eslint/no-explicit-any
        pages: pdf.numPages,
        pageTexts
      },
      pages: pdf.numPages
    };
  }
}