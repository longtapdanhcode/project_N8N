import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AcademicWarningService } from './academic-warning.service';
import { WebhookService } from '../webhook/webhook.service';
import { StudentRecord } from './schemas/student-warning.schema';

describe('AcademicWarningService', () => {
  let service: AcademicWarningService;
  let webhookService: WebhookService;

  const mockViolations = [
    {
      _id: '22GIT001',
      full_name: 'Nguyen Van A',
      student_email: 'a@vku.udn.vn',
      advisor_email: 'advisor@vku.udn.vn',
      gpa: 1.8,
      absent_rate: 25.0,
      failed_credits: 6,
    },
    {
      _id: '22GIT002',
      full_name: 'Tran Van B',
      student_email: 'b@vku.udn.vn',
      advisor_email: 'advisor@vku.udn.vn',
      gpa: 1.2,
      absent_rate: 35.0,
      failed_credits: 12,
    },
  ];

  const mockStudentModel = {
    aggregate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockViolations),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicWarningService,
        {
          provide: getModelToken(StudentRecord.name),
          useValue: mockStudentModel,
        },
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest.fn().mockResolvedValue({
              success: true,
              statusCode: 200,
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:5678/webhook/academic-warning-alert'),
          },
        },
      ],
    }).compile();

    service = module.get<AcademicWarningService>(AcademicWarningService);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute aggregation and dispatch default 1 warning to n8n when limit is omitted in dev/test', async () => {
    const sendToN8nMock = jest.spyOn(webhookService, 'sendToN8n');
    const result = await service.scanAndDispatchWarnings();

    expect(mockStudentModel.aggregate).toHaveBeenCalled();
    expect(sendToN8nMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.total_violations).toBe(2);
    expect(result.dispatched_count).toBe(1);
    expect(result.violations[0].warning_tier).toBe('TIER_1');
    expect(result.violations[1].warning_tier).toBe('TIER_2');
  });

  it('should honor custom limit when specified', async () => {
    const sendToN8nMock = jest.spyOn(webhookService, 'sendToN8n');
    const result = await service.scanAndDispatchWarnings(2);

    expect(sendToN8nMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.total_violations).toBe(2);
    expect(result.dispatched_count).toBe(2);
  });

  it('dispatches at most 5 alerts at once, each with a per-day delivery id', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...mockViolations[0],
      _id: `22GIT${String(i).padStart(3, '0')}`,
    }));
    mockStudentModel.aggregate.mockReturnValueOnce({
      exec: jest.fn().mockResolvedValue(many),
    });
    let running = 0;
    let peak = 0;
    const sendToN8nMock = jest
      .spyOn(webhookService, 'sendToN8n')
      .mockImplementation(async (payload: any) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running--;
        // Một em lỗi không làm hỏng cả lượt quét.
        return { success: payload.student_id !== '22GIT003', statusCode: 200 };
      });

    const result = await service.scanAndDispatchWarnings(12);

    expect(sendToN8nMock).toHaveBeenCalledTimes(12);
    expect(peak).toBe(5);
    expect(result.dispatched_count).toBe(11);
    const [payload, , , , , options] = sendToN8nMock.mock.calls[0] as any[];
    expect(options).toEqual({
      deliveryId: `academic-warning:${payload.student_id}:${payload.scanned_at.slice(0, 10)}`,
      deadlineMs: 15000,
    });
  });
});
