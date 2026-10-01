// ============================================
// @aegis/core - Export Helpers
// JSON / CSV / PDF formatlarında veri dışa aktarımı
// ============================================

import PDFDocument from 'pdfkit';
import { AppError } from '../errors/app-error';

/**
 * Desteklenen export formatları
 */
export type ExportFormat = 'json' | 'csv' | 'pdf';

/**
 * Export konfigürasyonu
 */
export type ExportOptions = {
  filename?: string;    // Dosya adı (PDF metadata için)
  columns?: string[];   // Sadece bu kolonları dahil et
  title?: string;       // PDF için başlık
};

/**
 * Veriyi belirtilen formatta Buffer olarak döner
 * 
 * - json: pretty-printed JSON string (UTF-8)
 * - csv: RFC 4180 uyumlu CSV (UTF-8, header satırı ile)
 * - pdf: PDFKit ile üretilmiş PDF (basit tablo formatı)
 * 
 * @param rows - Export edilecek veri dizisi
 * @param format - Çıktı formatı
 * @param options - Export konfigürasyonu
 * @returns Buffer (dosyaya yazılabilir veya HTTP response'a verilebilir)
 * @throws AppError — format desteklenmiyorsa veya veri boşsa
 * 
 * @example
 * const buffer = await exportData(users, 'csv');
 * fs.writeFileSync('users.csv', buffer);
 */
export async function exportData(
  rows: any[],
  format: ExportFormat,
  options?: ExportOptions,
): Promise<Buffer> {
  if (!Array.isArray(rows)) {
    throw new AppError({
      code: 'VALIDATION_ERROR',
      message: 'exportData: rows must be an array',
      statusCode: 422,
    });
  }

  switch (format) {
    case 'json':
      return exportJSON(rows, options);
    case 'csv':
      return exportCSV(rows, options);
    case 'pdf':
      return exportPDF(rows, options);
    default:
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: `exportData: unsupported format "${format}"`,
        statusCode: 422,
      });
  }
}

// --- JSON ---

function exportJSON(rows: any[], options?: ExportOptions): Buffer {
  const filtered = applyColumnFilter(rows, options?.columns);
  const json = JSON.stringify(filtered, null, 2);
  return Buffer.from(json, 'utf-8');
}

// --- CSV ---

function exportCSV(rows: any[], options?: ExportOptions): Buffer {
  const filtered = applyColumnFilter(rows, options?.columns);
  if (filtered.length === 0) {
    return Buffer.from('', 'utf-8');
  }

  // Header: ya options.columns ya da ilk satırın key'leri
  const headers = options?.columns ?? Object.keys(filtered[0]);
  const lines: string[] = [];

  // Header satırı
  lines.push(headers.map(escapeCSV).join(','));

  // Veri satırları
  for (const row of filtered) {
    const values = headers.map(h => escapeCSV(row[h]));
    lines.push(values.join(','));
  }

  return Buffer.from(lines.join('\n'), 'utf-8');
}

/**
 * CSV hücresini RFC 4180'e göre escape eder
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Tırnak, virgül, yeni satır içeriyorsa çift tırnak içine al
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// --- PDF ---

function exportPDF(rows: any[], options?: ExportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Başlık
      if (options?.title) {
        doc.fontSize(16).text(options.title, { align: 'center' });
        doc.moveDown();
      }

      const filtered = applyColumnFilter(rows, options?.columns);

      if (filtered.length === 0) {
        doc.fontSize(10).text('(no data)', { align: 'center' });
      } else {
        const headers = options?.columns ?? Object.keys(filtered[0]);
        doc.fontSize(9);

        // Her satırı basit "key: value" formatında yaz
        for (let i = 0; i < filtered.length; i++) {
          const row = filtered[i];
          doc.fontSize(8).fillColor('#888').text(`#${i + 1}`);
          doc.fillColor('#000').fontSize(9);

          for (const h of headers) {
            const val = row[h];
            const str = val === null || val === undefined
              ? '-'
              : typeof val === 'object'
                ? JSON.stringify(val)
                : String(val);
            doc.text(`${h}: ${str}`);
          }
          doc.moveDown(0.5);

          // Sayfa sonu kontrolü
          if (doc.y > 750) {
            doc.addPage();
          }
        }
      }

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// --- YARDIMCI ---

/**
 * Sadece belirtilen kolonları içeren yeni obje dizisi döner
 * (orijinal rows'u mutasyona uğratmaz)
 */
function applyColumnFilter(rows: any[], columns?: string[]): any[] {
  if (!columns || columns.length === 0) return rows;
  return rows.map(row => {
    const filtered: Record<string, any> = {};
    for (const col of columns) {
      filtered[col] = row?.[col];
    }
    return filtered;
  });
}