import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TextSplitterService } from './text-splitter.service';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';

@Module({
  imports: [AiModule],
  controllers: [DocumentController],
  providers: [TextSplitterService, DocumentService],
  exports: [TextSplitterService, DocumentService],
})
export class DocumentModule {}
