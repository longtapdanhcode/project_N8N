import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { AssignmentProcessor } from './assignment.processor';
import { WebhookService } from '../webhook/webhook.service';

describe('AssignmentProcessor', () => {
  let processor: AssignmentProcessor;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentProcessor,
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest.fn().mockResolvedValue({ success: true, statusCode: 200 }),
          },
        },
      ],
    }).compile();

    processor = module.get<AssignmentProcessor>(AssignmentProcessor);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('should process job and forward simulated AI result to WebhookService', async () => {
    const mockJob = {
      id: 'job-101',
      name: 'evaluate-submission',
      data: {
        submissionId: 'sub-456',
        studentId: 'std-789',
        assignmentTitle: 'Distributed Systems',
      },
    } as unknown as Job;

    const sendToN8nSpy = jest.spyOn(webhookService, 'sendToN8n');
    const result = await processor.process(mockJob);

    expect(result).toBeDefined();
    expect(result.jobId).toBe('job-101');
    expect(result.studentId).toBe('std-789');
    expect(result.evaluation.score).toBe(95);

    expect(sendToN8nSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-101',
        studentId: 'std-789',
      }),
      'ASSIGNMENT_ANALYZED',
    );
  });
});
