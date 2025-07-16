// @ts-expect-error language-detect 타입 정의 없음
import { detect } from 'language-detect';
// import Prism from 'prismjs';
import { FileParser, ParsedFile } from './index';

export class CodeParser implements FileParser {
  private extensions: Record<string, string> = {
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

  canParse(file: File | Buffer, mimeType: string): boolean {
    if (file instanceof File) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return Object.keys(this.extensions).includes(ext);
    }
    return mimeType.startsWith('text/');
  }

  async parse(file: File | Buffer): Promise<ParsedFile> {
    const text = file instanceof File 
      ? await file.text()
      : file.toString('utf-8');

    const fileName = file instanceof File ? file.name : 'unknown';
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    const language = this.extensions[ext] || detect(text);

    // Extract structure information
    const structure = this.extractStructure(text);

    // Note: Prism tokenization available but not used in current implementation
    // const tokens = Prism.tokenize(text, Prism.languages[language] || Prism.languages.plain);

    return {
      text,
      metadata: {
        language,
        lines: text.split('\n').length,
        characters: text.length,
        structure,
        hasComments: /\/\/|\/\*|\#|--/.test(text),
        imports: this.extractImports(text, language),
        functions: this.extractFunctions(text, language),
        classes: this.extractClasses(text, language)
      },
      language
    };
  }

  private extractStructure(text: string): Record<string, Array<{ line: number; text: string }>> {
    // Language-agnostic structure extraction
    const structure = {
      imports: [] as Array<{ line: number; text: string }>,
      classes: [] as Array<{ line: number; text: string }>,
      functions: [] as Array<{ line: number; text: string }>,
      variables: [] as Array<{ line: number; text: string }>
    };

    // Simple regex-based extraction (can be improved with AST parsing)
    const lines = text.split('\n');
    
    lines.forEach((line, index) => {
      // Imports
      if (line.match(/^import |^from .* import|^const .* = require/)) {
        structure.imports.push({ line: index + 1, text: line.trim() });
      }
      
      // Functions
      if (line.match(/function |const .* = .*=>|def |func /)) {
        structure.functions.push({ line: index + 1, text: line.trim() });
      }
      
      // Classes
      if (line.match(/class |interface |struct /)) {
        structure.classes.push({ line: index + 1, text: line.trim() });
      }
    });

    return structure;
  }

  private extractImports(text: string, language: string): string[] {
    const imports: string[] = [];
    const patterns: Record<string, RegExp> = {
      javascript: /import .* from ['"](.*)['"];?/g,
      python: /^(?:import|from) ([\w.]+)/gm,
      java: /import ([\w.]+);/g
    };

    const pattern = patterns[language];
    if (pattern) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        imports.push(match[1]);
      }
    }

    return imports;
  }

  private extractFunctions(text: string, language: string): string[] {
    const functions: string[] = [];
    const patterns: Record<string, RegExp> = {
      javascript: /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|async)/g,
      python: /def\s+(\w+)\s*\(/g,
      java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g
    };

    const pattern = patterns[language];
    if (pattern) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        functions.push(match[1]);
      }
    }

    return functions;
  }

  private extractClasses(text: string, language: string): string[] {
    const classes: string[] = [];
    const patterns: Record<string, RegExp> = {
      javascript: /class\s+(\w+)/g,
      python: /class\s+(\w+)/g,
      java: /class\s+(\w+)/g
    };

    const pattern = patterns[language];
    if (pattern) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        classes.push(match[1]);
      }
    }

    return classes;
  }
}