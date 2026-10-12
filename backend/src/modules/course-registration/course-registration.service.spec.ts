import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CourseRegistrationService } from './course-registration.service';
import { WebhookService } from '../webhook/webhook.service';

describe('CourseRegistrationService', () => {
  let service: CourseRegistrationService;
  let webhookService: WebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseRegistrationService,
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest.fn().mockResolvedValue({
              success: true,
              statusCode: 200,
              data: {
                registration_id: 'reg-001',
                status: 'ENROLLED',
              },
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:5678/webhook/course-registration'),
          },
        },
        {
          provide: require('../ai/supabase.service').SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue({
              from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CourseRegistrationService>(CourseRegistrationService);
    webhookService = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should forward registration request to WebhookService and return response', async () => {
    const dto = {
      student_id: '22GIT123',
      course_id: 'CS102',
      class_section_id: 'SEC_CS102_01',
      semester: '2026-1',
      student_email: 'student@vku.udn.vn',
    };

    const result = await service.registerCourse(dto);
    const sendToN8nMock = jest.spyOn(webhookService, 'sendToN8n');

    expect(sendToN8nMock).toHaveBeenCalledWith(
      dto,
      'COURSE_REGISTRATION',
      'http://localhost:5678/webhook/course-registration',
    );
    expect(result.registration_id).toBe('reg-001');
    expect(result.status).toBe('ENROLLED');
  });
});
