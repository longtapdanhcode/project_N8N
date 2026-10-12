import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService, IngestTextDto } from './document.service';

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Endpoint 1: Ingest raw text or markdown content into the Knowledge Base.
   * Cắt nhỏ văn bản, sinh vector embeddings và lưu vào Supabase.
   */
  @Post('ingest-text')
  async ingestText(@Body() body: IngestTextDto) {
    return await this.documentService.ingestText(body);
  }

  /**
   * Endpoint 2: Upload a text/markdown file to ingest into the Knowledge Base.
   */
  @Post('ingest-file')
  @UseInterceptors(FileInterceptor('file'))
  async ingestFile(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body?: {
      title?: string;
      category?: string;
      metadata?: string | Record<string, any>;
    },
  ) {
    let parsedMetadata: Record<string, any> | undefined;
    if (typeof body?.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(body.metadata);
      } catch {
        parsedMetadata = { raw_metadata: body.metadata };
      }
    } else if (typeof body?.metadata === 'object') {
      parsedMetadata = body.metadata;
    }

    return await this.documentService.ingestFile(file, {
      title: body?.title,
      category: body?.category,
      metadata: parsedMetadata,
    });
  }

  /**
   * Endpoint 3: Retrieve paginated list of existing documents in the Knowledge Base.
   */
  @Get()
  async getDocuments(
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr ? Math.max(1, parseInt(limitStr, 10) || 20) : 20;
    const offset = offsetStr ? Math.max(0, parseInt(offsetStr, 10) || 0) : 0;
    return await this.documentService.getDocuments(limit, offset);
  }
}
