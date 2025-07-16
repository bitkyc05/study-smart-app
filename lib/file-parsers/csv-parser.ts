import Papa from 'papaparse';
import { FileParser, ParsedFile } from './index';

type ColumnValueType = 'string' | 'number' | 'boolean' | 'object' | 'undefined';

interface ColumnSummary {
  totalValues: number;
  uniqueValues: number;
  nullCount: number;
  type: ColumnValueType;
  sample: unknown[];
  min?: number;
  max?: number;
  avg?: number;
}

export class CSVParser implements FileParser {
  canParse(file: File | Buffer, mimeType: string): boolean {
    return mimeType === 'text/csv' || 
           (file instanceof File && file.name.endsWith('.csv'));
  }

  async parse(file: File | Buffer): Promise<ParsedFile> {
    const text = file instanceof File 
      ? await file.text()
      : file.toString('utf-8');

    const result = Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    // Convert to markdown table
    const headers = result.meta.fields || [];
    const rows = result.data as Record<string, unknown>[];
    
    let markdownTable = '| ' + headers.join(' | ') + ' |\n';
    markdownTable += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    // Limit rows for context
    const maxRows = 50;
    const displayRows = rows.slice(0, maxRows);
    
    displayRows.forEach(row => {
      const values = headers.map(h => row[h] ?? '');
      markdownTable += '| ' + values.join(' | ') + ' |\n';
    });
    
    if (rows.length > maxRows) {
      markdownTable += `\n... and ${rows.length - maxRows} more rows\n`;
    }

    // Generate summary statistics
    const summary = this.generateSummary(headers, rows);

    return {
      text: markdownTable,
      metadata: {
        headers,
        rowCount: rows.length,
        columnCount: headers.length,
        summary,
        errors: result.errors,
        truncated: rows.length > maxRows
      }
    };
  }

  private generateSummary(headers: string[], rows: Record<string, unknown>[]): Record<string, ColumnSummary> {
    const summary: Record<string, ColumnSummary> = {};
    
    headers.forEach(header => {
      const values = rows.map(row => row[header]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(values);
      const detectedType = this.detectType(values);
      
      const columnSummary: ColumnSummary = {
        totalValues: values.length,
        uniqueValues: uniqueValues.size,
        nullCount: rows.length - values.length,
        type: detectedType as ColumnValueType,
        sample: Array.from(uniqueValues).slice(0, 5)
      };
      
      // Numeric statistics
      if (detectedType === 'number') {
        const numbers = values.filter(v => typeof v === 'number');
        columnSummary.min = Math.min(...numbers);
        columnSummary.max = Math.max(...numbers);
        columnSummary.avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      }
      
      summary[header] = columnSummary;
    });
    
    return summary;
  }

  private detectType(values: unknown[]): ColumnValueType {
    const types = values.map(v => typeof v);
    const typeCount = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonType = Object.entries(typeCount)
      .sort(([, a], [, b]) => b - a)[0][0];
    
    return mostCommonType as ColumnValueType;
  }
}