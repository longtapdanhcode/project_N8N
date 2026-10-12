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
});
