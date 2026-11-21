import { Test, TestingModule } from '@nestjs/testing';
import { DocumentService } from './document.service';
import { TextSplitterService } from './text-splitter.service';
import { GeminiService } from '../ai/gemini.service';
import { SupabaseService } from '../ai/supabase.service';

describe('DocumentService', () => {
  let service: DocumentService;

  const mockSplitText = jest.fn().mockReturnValue(['Chunk 1', 'Chunk 2']);
  const mockGenerateBatchEmbeddings = jest.fn().mockResolvedValue([
    Array.from({ length: 768 }, () => 0.1),
    Array.from({ length: 768 }, () => 0.2),
  ]);
  const mockInsertDocumentsBatch = jest.fn().mockResolvedValue([
    { id: 'doc-1', title: 'Quy chế (Phần 1/2)' },
    { id: 'doc-2', title: 'Quy chế (Phần 2/2)' },
  ]);
  const mockGetDocuments = jest.fn().mockResolvedValue([
    { id: 'doc-1', title: 'Quy chế (Phần 1/2)' },
  ]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        {
          provide: TextSplitterService,
          useValue: {
            splitText: mockSplitText,
          },
        },
        {
          provide: GeminiService,
          useValue: {
            generateBatchEmbeddings: mockGenerateBatchEmbeddings,
          },
        },
        {
          provide: SupabaseService,
          useValue: {
            insertDocumentsBatch: mockInsertDocumentsBatch,
            getDocuments: mockGetDocuments,
          },
        },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should ingest text by splitting, generating embeddings, and bulk inserting', async () => {
    const result = await service.ingestText({
      title: 'Quy chế học vụ VKU',
      content: 'Nội dung rất dài về quy chế học vụ...',
      category: 'academic',
    });

    expect(mockSplitText).toHaveBeenCalled();
    expect(mockGenerateBatchEmbeddings).toHaveBeenCalledWith(['Chunk 1', 'Chunk 2'], 5);
    expect(mockInsertDocumentsBatch).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.chunks_created).toBe(2);
    expect(result.document_ids).toEqual(['doc-1', 'doc-2']);
  });

  it('ingests an uploaded file with its extracted text and file details', async () => {
    const name = Buffer.from('Quy chế.md', 'utf8').toString('latin1');
    await service.ingestFile({
      originalname: name,
      buffer: Buffer.from('# Điều 1\nNội dung'),
      size: 22,
      mimetype: 'application/octet-stream',
    } as Express.Multer.File);
    const records = mockInsertDocumentsBatch.mock.calls[0][0];
    expect(records[0].title).toBe('Quy chế (Phần 1/2)');
    expect(records[0].metadata).toMatchObject({
      original_filename: 'Quy chế.md',
      file_type: 'text',
      parent_title: 'Quy chế',
      category: 'uploaded_file',
    });
    expect(mockSplitText.mock.calls[0][0]).toBe('# Điều 1\nNội dung');
  });

  it('rejects unsupported uploads before calling Gemini', async () => {
    await expect(
      service.ingestFile({
        originalname: 'anh.png',
        buffer: Buffer.from('x'),
        size: 1,
      } as Express.Multer.File),
    ).rejects.toThrow(/Chỉ nhận tệp/);
    expect(mockGenerateBatchEmbeddings).not.toHaveBeenCalled();
  });

  it('should retrieve documents list with pagination', async () => {
    const res = await service.getDocuments(10, 0);

    expect(mockGetDocuments).toHaveBeenCalledWith(10, 0);
    expect(res.success).toBe(true);
    expect(res.data.length).toBe(1);
  });
});
