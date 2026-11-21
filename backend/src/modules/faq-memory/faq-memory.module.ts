import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FaqConversationSchema } from './faq-conversation.schema';
import { FaqMemoryService } from './faq-memory.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'FaqConversation', schema: FaqConversationSchema },
    ]),
  ],
  providers: [FaqMemoryService],
  exports: [FaqMemoryService],
})
export class FaqMemoryModule {}
