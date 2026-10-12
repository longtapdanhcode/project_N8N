import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AttendanceService } from './attendance.service';
import { WebhookService } from '../webhook/webhook.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest.fn().mockResolvedValue({
              success: true,
              statusCode: 200,
              data: {
                ack_token: 'ack-test-123',
                accepted_count: 2,
                discarded_conflicts: 0,
              },
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:5678/webhook/attendance-offline-sync'),
          },
        },
        {
          provide: require('../ai/supabase.service').SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnThis(),
                  order: jest.fn().mockReturnThis(),
                  range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
                }),
              }),
            }),
          },
        },
        {
          provide: require('@nestjs/mongoose').getModelToken(require('../student/schemas/student.schema').Student.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([]),
            countDocuments: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward offline attendance batch to WebhookService and return ack', async () => {
    const dto = {
      device_id: 'DEV_PWA_01',
      records: [
        {
          student_id: '22GIT001',
          class_section_id: 'SEC_CS101_01',
          session_date: '2026-10-10',
          status: 'PRESENT',
          timestamp: '2026-10-10T08:00:00Z',
        },
      ],
    };

    const result = await service.syncOfflineAttendance(dto);
    const sendToN8nMock = jest.spyOn(webhookService, 'sendToN8n');

    expect(sendToN8nMock).toHaveBeenCalledWith(
      expect.objectContaining({
        device_id: 'DEV_PWA_01',
        records: dto.records,
      }),
      'OFFLINE_ATTENDANCE_SYNC',
      'http://localhost:5678/webhook/attendance-offline-sync',
    );
    expect(result.ack_token).toBe('ack-test-123');
    expect(result.accepted_count).toBe(2);
  });
});
