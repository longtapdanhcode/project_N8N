import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import { PasswordException, PDFParse } from 'pdf-parse';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/**
 * Nạp tài liệu chạy đồng bộ trong một request (cổng web chờ tối đa 130 giây).
 * Khoảng 300 nghìn ký tự là vài trăm đoạn embedding, vẫn xong kịp thời gian đó.
 */
export const MAX_TEXT_CHARS = 300_000;
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.docx'] as const;
export type FileKind = 'text' | 'pdf' | 'docx';

export interface ExtractedText {
  kind: FileKind;
  text: string;
  pages?: number;
}

/**
 * Nhận dạng theo đuôi tệp, rồi kiểm tra chữ ký đầu tệp với PDF/DOCX
 * để không tin mimetype do trình duyệt gửi lên.
 */
export function detectKind(filename: string, buffer: Buffer): FileKind {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  if (ext === '.txt' || ext === '.md') return 'text';
  if (ext === '.pdf') {
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-')
      throw new BadRequestException('Tệp .pdf không đúng định dạng PDF.');
    return 'pdf';
  }
  if (ext === '.docx') {
    if (buffer.readUInt32LE(0) !== 0x04034b50)
      throw new BadRequestException('Tệp .docx không đúng định dạng Word.');
    return 'docx';
  }
  if (ext === '.doc')
    throw new BadRequestException(
      'Chưa hỗ trợ tệp .doc (Word 97-2003). Hãy lưu lại dưới dạng .docx.',
    );
  throw new BadRequestException(
    `Chỉ nhận tệp ${SUPPORTED_EXTENSIONS.join(', ')}.`,
  );
}

/**
 * Multer giải mã tên tệp theo latin1, làm hỏng tên tiếng Việt.
 * Chỉ giải mã lại khi tên đúng là byte UTF-8 bị đọc nhầm.
 */
export function decodeFilename(name: string) {
  if (/[^\u0000-\u00ff]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}

/** Bỏ khoảng trắng thừa và dòng trống liên tiếp mà PDF/DOCX hay sinh ra. */
export function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return {
      text: result.pages.map((page) => page.text).join('\n\n'),
      pages: result.total,
    };
  } catch (error) {
    if (error instanceof PasswordException)
      throw new BadRequestException('PDF đang đặt mật khẩu. Hãy gỡ mật khẩu rồi tải lại.');
    throw new BadRequestException('Không đọc được tệp PDF.');
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function readDocx(buffer: Buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch {
    throw new BadRequestException('Không đọc được tệp Word.');
  }
}

function ensureLength(text: string) {
  if (text.length > MAX_TEXT_CHARS)
    throw new BadRequestException(
      `Tài liệu quá dài (${text.length.toLocaleString('vi-VN')} ký tự). Hãy chia thành các tệp dưới ${MAX_TEXT_CHARS.toLocaleString('vi-VN')} ký tự.`,
    );
  return text;
}

export async function extractText(
  filename: string,
  buffer: Buffer,
): Promise<ExtractedText> {
  const kind = detectKind(filename, buffer);
  if (kind === 'pdf') {
    const { text, pages } = await readPdf(buffer);
    const clean = normalizeText(text);
    if (!clean)
      throw new BadRequestException(
        'PDF không có lớp chữ (có thể là bản scan). Cần nhận dạng chữ (OCR) trước khi nạp.',
      );
    return { kind, text: ensureLength(clean), pages };
  }
  // Giữ nguyên thụt lề của .md/.txt; chỉ dọn văn bản trích từ Word.
  const clean =
    kind === 'docx'
      ? normalizeText(await readDocx(buffer))
      : buffer.toString('utf-8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!clean)
    throw new BadRequestException('Tệp tải lên không có nội dung văn bản.');
  return { kind, text: ensureLength(clean) };
}
