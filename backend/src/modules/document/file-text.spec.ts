import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import {
  decodeFilename,
  detectKind,
  extractText,
  MAX_TEXT_CHARS,
  normalizeText,
} from './file-text';

/** PDF một trang tối giản với lớp chữ (ASCII, font Helvetica có sẵn). */
function makePdf(lines: string[]) {
  const stream = lines.length
    ? `BT /F1 12 Tf 72 720 Td 14 TL ${lines.map((l) => `(${l}) '`).join(' ')} ET`
    : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

async function makeDocx(paragraphs: string[]) {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs
      .map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`)
      .join('')}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('extractText', () => {
  it('reads every page of a PDF with a text layer', async () => {
    const result = await extractText(
      'quy-che.PDF',
      makePdf(['Dieu 1. Pham vi', 'Sinh vien vang qua 20% bi cam thi']),
    );
    expect(result.kind).toBe('pdf');
    expect(result.pages).toBe(1);
    expect(result.text).toContain('Dieu 1. Pham vi');
    expect(result.text).toContain('Sinh vien vang qua 20% bi cam thi');
    expect(result.text).not.toMatch(/-- 1 of 1 --/);
  });

  it('explains that a scanned PDF needs OCR', async () => {
    await expect(extractText('scan.pdf', makePdf([]))).rejects.toThrow(/OCR/);
  });

  it('rejects a broken PDF', async () => {
    await expect(
      extractText('hong.pdf', Buffer.from('%PDF-1.4\nrác')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reads Vietnamese text from a .docx', async () => {
    const result = await extractText(
      'huong-dan.docx',
      await makeDocx(['Điều 1. Quy chế đào tạo', '', '', 'Sinh viên   phải đăng ký']),
    );
    expect(result).toEqual({
      kind: 'docx',
      text: 'Điều 1. Quy chế đào tạo\n\nSinh viên phải đăng ký',
    });
  });

  it('keeps markdown indentation and strips a BOM', async () => {
    const result = await extractText('a.md', Buffer.from('﻿# Tiêu đề\r\n\n    mã\n'));
    expect(result.text).toBe('# Tiêu đề\n\n    mã');
  });

  it('asks to split documents that are too long to embed in one request', async () => {
    await expect(
      extractText('dai.txt', Buffer.from('a'.repeat(MAX_TEXT_CHARS + 1))),
    ).rejects.toThrow(/chia thành/);
  });

  it('rejects empty files', async () => {
    await expect(extractText('a.txt', Buffer.from('  \n'))).rejects.toThrow(
      /không có nội dung/,
    );
  });
});

describe('detectKind', () => {
  it('checks the file signature, not only the extension', () => {
    expect(() => detectKind('fake.pdf', Buffer.from('hello'))).toThrow(/PDF/);
    expect(() => detectKind('fake.docx', Buffer.from('hello'))).toThrow(/Word/);
  });

  it('explains unsupported formats', () => {
    expect(() => detectKind('cu.doc', Buffer.from('x'))).toThrow(/\.docx/);
    expect(() => detectKind('anh.png', Buffer.from('x'))).toThrow(/\.pdf/);
  });
});

describe('helpers', () => {
  it('normalizes whitespace from extracted text', () => {
    expect(normalizeText('a   b \n\n\n\n c\r\n')).toBe('a b\n\nc');
  });

  it('repairs UTF-8 file names that Multer read as latin1', () => {
    const garbled = Buffer.from('Quy chế.pdf', 'utf8').toString('latin1');
    expect(decodeFilename(garbled)).toBe('Quy chế.pdf');
    expect(decodeFilename('Quy chế.pdf')).toBe('Quy chế.pdf');
    expect(decodeFilename('café.pdf')).toBe('café.pdf');
  });
});
