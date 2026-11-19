import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AssignmentProcessor } from './assignment.processor';
import { WebhookModule } from '../webhook/webhook.module';
import { MongooseModule } from '@nestjs/mongoose';
import { SubmissionSchema } from './submission.schema';
import { SubmissionService } from './submission.service';
import { SubmissionListService } from './submission-list.service';
import {
  Student,
  StudentSchema,
} from '../student/schemas/student.schema';
import {
  SubmissionController,
  SubmissionCallbackController,
} from './submission.controller';
import { InternalApiGuard } from '../webhook/internal-api.guard';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'submission-queue',
    }),
    WebhookModule,
    PushModule,
    MongooseModule.forFeature([
      { name: 'Submission', schema: SubmissionSchema },
      { name: Student.name, schema: StudentSchema },
    ]),
  ],
  controllers: [SubmissionController, SubmissionCallbackController],
  providers: [
    AssignmentProcessor,
    SubmissionService,
    SubmissionListService,
    InternalApiGuard,
  ],
  exports: [BullModule],
})
export class AssignmentModule {}
