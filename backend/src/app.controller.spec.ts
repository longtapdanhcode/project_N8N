import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhookService } from './modules/webhook/webhook.service';
import { AiService } from './modules/ai/ai.service';

describe('AppController', () => {
  let appController: AppController;
  const mockAskAssistant = jest.fn().mockResolvedValue({
    answer: 'Mock answer',
    confidence_score: 0.9,
    citations: ['Quy chế'],
    requires_human_escalation: false,
    suggested_actions: ['Kiểm tra'],
  });

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: WebhookService,
          useValue: {
            sendToN8n: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AiService,
          useValue: {
            hybridSearch: jest.fn().mockResolvedValue([]),
            askAssistant: mockAskAssistant,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('askAi', () => {
    it('should call aiService.askAssistant and return structured response', async () => {
      const question = 'Nghỉ học quá 20% thì bị sao?';
      const result = await appController.askAi(question);

      expect(mockAskAssistant).toHaveBeenCalledWith(question);
      expect(result.answer).toBe('Mock answer');
      expect(result.requires_human_escalation).toBe(false);
    });
  });
});
