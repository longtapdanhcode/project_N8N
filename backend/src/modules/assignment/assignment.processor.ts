import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  /**
   * BullMQ processor worker handling AI-heavy assignment analysis jobs.
   *
   * @param job BullMQ Job containing the assignment submission payload
   */
  async process(job: Job<AssignmentJobPayload, any, string>): Promise<any> {
    this.logger.log(`[Job ${job.id}] Started processing AI assignment submission for student: ${job.data?.studentId ?? 'N/A'}`);

    // Simulate heavy AI model analysis execution (e.g., LLM code/essay evaluation, semantic similarity checks)
    const simulatedAiResult = {
      jobId: job.id,
      submissionId: job.data?.submissionId ?? `sub-${job.id}`,
      studentId: job.data?.studentId ?? 'student-unknown',
      assignmentTitle: job.data?.assignmentTitle ?? 'AI Systems Capstone',
      evaluation: {
        score: 95,
        confidence: 0.98,
        rubricAssessment: [
          { criterion: 'Architecture & Design', grade: 'A', remarks: 'Excellent decoupling and queue topology.' },
          { criterion: 'Security & HMAC', grade: 'A+', remarks: 'Tamper-proof HMAC-SHA256 signature implemented.' },
        ],
        aiFeedback: 'Your architecture demonstrates senior-level modularity and robust stream buffering.',
      },
      analyzedAt: new Date().toISOString(),
    };

    this.logger.log(`[Job ${job.id}] AI analysis complete. Forwarding event to WebhookService (n8n)...`);

    // Simulate sending data to the WebhookService for n8n workflow triggering
    try {
      const webhookResponse = await this.webhookService.sendToN8n(
        simulatedAiResult,
        'ASSIGNMENT_ANALYZED',
      );
      this.logger.log(`[Job ${job.id}] Webhook dispatch completed with status: ${webhookResponse.statusCode}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[Job ${job.id}] Webhook dispatch failed but AI task succeeded: ${message}`);
      // Gracefully handle or throw depending on queue retry policies
    }

    return simulatedAiResult;
  }
}
