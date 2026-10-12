import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { SupabaseService } from '../ai/supabase.service';
import { TextSplitterService } from './text-splitter.service';

export class IngestTextDto {
  title: string;
  content: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface IngestResult {
  success: boolean;
  message: string;
  chunks_created: number;
  parent_title: string;
  document_ids: string[];
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly textSplitterService: TextSplitterService,
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Ingests raw text into the AI Knowledge Base:
   * 1. Splits text recursively into overlapping chunks.
   * 2. Generates vector embeddings (768-dim) in concurrent batches via Gemini.
   * 3. Performs bulk insert of all chunks into Supabase documents table.
   *
   * @param dto Information about the document to ingest
   * @returns IngestResult containing status and generated document IDs
   */
  async ingestText(dto: IngestTextDto): Promise<IngestResult> {
    const { title, content, category, metadata } = dto;

    if (!title || title.trim() === '') {
      throw new BadRequestException('Tiêu đề tài liệu ("title") không được để trống.');
    }

    if (!content || content.trim() === '') {
      throw new BadRequestException('Nội dung tài liệu ("content") không được để trống.');
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanCategory = category?.trim() || 'general';

    this.logger.log(`Starting ingestion for document: "${cleanTitle}" (category: ${cleanCategory})`);

    // 1. Recursive chunking with overlap
    const chunks = this.textSplitterService.splitText(cleanContent, {
      chunkSize: 800,
      chunkOverlap: 150,
    });

    if (chunks.length === 0) {
      throw new BadRequestException('Không thể phân tách nội dung tài liệu thành các chunks.');
    }

    this.logger.log(`Generated ${chunks.length} chunks for "${cleanTitle}". Generating embeddings...`);

    // 2. Generate batch embeddings via Gemini
    const embeddings = await this.geminiService.generateBatchEmbeddings(chunks, 5);

    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Số lượng embeddings (${embeddings.length}) không khớp với số lượng chunks (${chunks.length}).`,
      );
    }

    // 3. Prepare records for Supabase bulk insert
    const recordsToInsert = chunks.map((chunk, index) => {
      const chunkTitle =
        chunks.length > 1
          ? `${cleanTitle} (Phần ${index + 1}/${chunks.length})`
          : cleanTitle;

      return {
        title: chunkTitle,
        content: chunk,
        embedding: embeddings[index],
        metadata: {
          ...metadata,
          parent_title: cleanTitle,
          category: cleanCategory,
          chunk_index: index + 1,
          total_chunks: chunks.length,
          ingested_at: new Date().toISOString(),
        },
      };
    });

    // 4. Batch insert into Supabase
    const insertedDocs = await this.supabaseService.insertDocumentsBatch(recordsToInsert);

    const docIds = insertedDocs.map((d: any) => d.id);
    this.logger.log(
      `Successfully ingested "${cleanTitle}": ${docIds.length} chunks inserted into Supabase.`,
    );

    return {
      success: true,
      message: 'Ingested successfully',
      chunks_created: chunks.length,
      parent_title: cleanTitle,
      document_ids: docIds,
    };
  }

  /**
   * Ingests an uploaded file (txt, md, etc.) into the AI Knowledge Base.
   *
   * @param file Uploaded file from Multer
   * @param options Optional title, category, and metadata overrides
   * @returns IngestResult
   */
  async ingestFile(
    file: Express.Multer.File,
    options?: { title?: string; category?: string; metadata?: Record<string, any> },
  ): Promise<IngestResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng tải lên một file hợp lệ.');
    }

    const content = file.buffer.toString('utf-8');
    if (!content || content.trim() === '') {
      throw new BadRequestException('File tải lên không có nội dung văn bản.');
    }

    const title = options?.title?.trim() || file.originalname || 'Tài liệu không tên';
    const category = options?.category?.trim() || 'uploaded_file';

    const fileMetadata = {
      ...options?.metadata,
      original_filename: file.originalname,
      mimetype: file.mimetype,
      size_bytes: file.size,
    };

    return await this.ingestText({
      title,
      content,
      category,
      metadata: fileMetadata,
    });
  }

  /**
   * Retrieves paginated list of existing documents from Supabase.
   *
   * @param limit Number of records to return
   * @param offset Starting index
   * @returns Object with documents list and count
   */
  async getDocuments(limit = 20, offset = 0) {
    const docs = await this.supabaseService.getDocuments(limit, offset);
    return {
      success: true,
      total: docs.length,
      limit,
      offset,
      data: docs,
    };
  }
}
