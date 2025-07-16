import { FileParser, ParsedFile } from './index';

export class ImageParser implements FileParser {
  canParse(file: File | Buffer, mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async parse(file: File | Buffer): Promise<ParsedFile> {
    const blob = file instanceof File ? file : new Blob([file]);
    const base64 = await this.blobToBase64(blob);
    
    // For images, we return base64 for multimodal AI
    return {
      text: `[Image: ${file instanceof File ? file.name : 'image'}]`,
      metadata: {
        mimeType: blob.type,
        size: blob.size,
        base64,
        isImage: true
      }
    };
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}