import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { AssignmentProcessor } from './assignment.processor';
import { WebhookService } from '../webhook/webhook.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

describe('AssignmentProcessor', () => {
  let processor: AssignmentProcessor;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentProcessor,
        {
          provide: getModelToken('Submission'),
          useValue: { updateOne: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: () => 'http://n8n/webhook/assignment-analyzed' },
        },
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest
              .fn()
              .mockResolvedValue({ success: true, statusCode: 200 }),
          },
        },
      ],
    }).compile();

    processor = module.get<AssignmentProcessor>(AssignmentProcessor);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('forwards the saved submission IDs to n8n without inventing a grade', async () => {
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

    expect(sendToN8nSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ASSIGNMENT_ANALYZED',
        submissionId: 'sub-456',
        studentId: 'std-789',
      }),
      'ASSIGNMENT_ANALYZED',
      'http://n8n/webhook/assignment-analyzed',
      0,
      120000,
    );
  });

  it('throws when n8n fails so BullMQ retries instead of marking the job successful', async () => {
    jest
      .spyOn(webhookService, 'sendToN8n')
      .mockResolvedValue({ success: false, statusCode: 504 });
    await expect(
      processor.process({
        data: { submissionId: 'sub-1', studentId: 'sv-1' },
      } as Job),
    ).rejects.toThrow('504');
  });

  it('marks exhausted jobs failed without overwriting completed feedback', async () => {
    const model = (processor as any).model;
    await processor.onFailed({
      data: { submissionId: 'sub-1' },
      attemptsMade: 1,
      opts: { attempts: 3 },
    } as Job);
    expect(model.updateOne).not.toHaveBeenCalled();
    await processor.onFailed({
      data: { submissionId: 'sub-1' },
      attemptsMade: 3,
      opts: { attempts: 3 },
    } as Job);
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: 'sub-1', status: { $ne: 'COMPLETED' } },
      { $set: { status: 'FAILED' } },
    );
  });
});
