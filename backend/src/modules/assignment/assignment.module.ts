import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AssignmentProcessor } from './assignment.processor';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submission-queue',
    }),
    WebhookModule,
  ],
  providers: [AssignmentProcessor],
  exports: [BullModule],
})
export class AssignmentModule {}
