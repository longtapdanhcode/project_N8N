import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AssignmentProcessor } from './assignment.processor';
import { WebhookModule } from '../webhook/webhook.module';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionSchema } from './submission.schema';
import { SubmissionService } from './submission.service';
import {
  SubmissionController,
  SubmissionCallbackController,
} from './submission.controller';
import { InternalApiGuard } from '../webhook/internal-api.guard';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submission-queue',
    }),
    WebhookModule,
    MongooseModule.forFeature([
      { name: 'Submission', schema: SubmissionSchema },
    ]),
  ],
  controllers: [SubmissionController, SubmissionCallbackController],
  providers: [AssignmentProcessor, SubmissionService, InternalApiGuard],
  exports: [BullModule],
})
export class AssignmentModule {}
