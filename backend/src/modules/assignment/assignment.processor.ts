import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission } from './submission.schema';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { WebhookService } from '../webhook/webhook.service';

export interface AssignmentJobPayload {
  submissionId: string;
  studentId: string;
  assignmentTitle: string;
  submissionUrl?: string;
  content?: string;
  criteria?: string[];
}

@Processor('submission-queue')
export class AssignmentProcessor extends WorkerHost {
  constructor(
    private readonly webhook: WebhookService,
    private readonly config: ConfigService,
    @InjectModel('Submission') private readonly model: Model<Submission>,
  ) {
    super();
  }

  async process(job: Job<AssignmentJobPayload>) {
    const url = this.config.get<string>('N8N_ASSIGNMENT_URL');
    if (!url) throw new Error('Thiếu N8N_ASSIGNMENT_URL');
    const result = await this.webhook.sendToN8n(
      { ...job.data, event: 'ASSIGNMENT_ANALYZED' },
      'ASSIGNMENT_ANALYZED',
      url,
      0,
      120000,
    );
    if (!result.success)
      throw new Error(`Workflow bài nộp thất bại: HTTP ${result.statusCode}`);
    return result.data;
  }

  @OnWorkerEvent('failed')
  async onFailed(job?: Job<AssignmentJobPayload>) {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await this.model.updateOne(
        { _id: job.data.submissionId, status: { $ne: 'COMPLETED' } },
        { $set: { status: 'FAILED' } },
      );
    }
  }
}
