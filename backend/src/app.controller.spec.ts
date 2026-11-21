import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebhookService } from './modules/webhook/webhook.service';
import { AiService } from './modules/ai/ai.service';
import { FaqMemoryService } from './modules/faq-memory/faq-memory.service';

import { ConfigService } from '@nestjs/config';

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
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
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
        {
          provide: FaqMemoryService,
          useValue: { open: jest.fn(async () => null), record: jest.fn() },
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

      expect(mockAskAssistant).toHaveBeenCalledWith(question, {
        history: [],
        searchQuery: question,
      });
      expect(result.answer).toBe('Mock answer');
      expect(result.requires_human_escalation).toBe(false);
    });

    it('does not invent a demo identity when none is provided', async () => {
      const result = await appController.askAi('Học phí?', { question: 'Học phí?' });
      expect(result.studentId).toBeUndefined();
      expect(result.role).toBeUndefined();
    });

    it('rejects an unknown role', async () => {
      await expect(
        appController.askAi('Học phí?', { question: 'Học phí?', role: 'admin' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('AppController /ai/ask with n8n configured', () => {
  async function setup(history: { question: string; answer: string }[] = []) {
    const sendToN8n = jest.fn().mockResolvedValue({
      success: true,
      data: { answer: 'Trả lời' },
    });
    const memory = {
      open: jest.fn(async () => ({
        conversationId: '11111111-1111-4111-8111-111111111111',
        history,
      })),
      record: jest.fn(),
    };
    const app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: ConfigService, useValue: { get: () => 'http://n8n/faq' } },
        { provide: WebhookService, useValue: { sendToN8n } },
        { provide: AiService, useValue: { askAssistant: jest.fn() } },
        { provide: FaqMemoryService, useValue: memory },
      ],
    }).compile();
    return { controller: app.get(AppController), sendToN8n, memory };
  }

  it('forwards only the identity supplied by the portal', async () => {
    const { controller, sendToN8n } = await setup();
    const result = await controller.askAi('Học phí?', {
      role: 'teacher',
      userId: 'gv01',
      name: 'Nguyễn A',
    });

    expect(sendToN8n.mock.calls[0][0]).toEqual({
      question: 'Học phí?',
      role: 'teacher',
      userId: 'gv01',
      studentId: 'gv01',
      name: 'Nguyễn A',
      conversationId: '11111111-1111-4111-8111-111111111111',
      history: [],
      searchQuery: 'Học phí?',
    });
    expect(result.dispatched_to_n8n).toBe(true);
    expect(result.conversationId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('sends earlier turns with a follow-up and records the new turn', async () => {
    const history = [{ question: 'Học phí học kỳ 1?', answer: '10 triệu.' }];
    const { controller, sendToN8n, memory } = await setup(history);
    const body = {
      role: 'student',
      userId: '22IT001',
      conversationId: '11111111-1111-4111-8111-111111111111',
    };
    await controller.askAi('Còn học kỳ hè?', body);

    expect(memory.open).toHaveBeenCalledWith(
      { role: 'student', userId: '22IT001' },
      body.conversationId,
    );
    expect(sendToN8n.mock.calls[0][0]).toMatchObject({
      history,
      searchQuery: 'Học phí học kỳ 1?\nCòn học kỳ hè?',
    });
    expect(memory.record).toHaveBeenCalledWith(
      expect.objectContaining({ history }),
      { role: 'student', userId: '22IT001' },
      'Còn học kỳ hè?',
      'Trả lời',
    );
  });
});
