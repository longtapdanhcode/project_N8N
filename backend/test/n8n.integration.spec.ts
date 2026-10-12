import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import request from 'supertest';
import { FaqController } from '../src/faq.controller';
import {
  SubmissionController,
  SubmissionCallbackController,
} from '../src/modules/assignment/submission.controller';
import { SubmissionService } from '../src/modules/assignment/submission.service';
import { InternalApiGuard } from '../src/modules/webhook/internal-api.guard';
import { WebhookService } from '../src/modules/webhook/webhook.service';
import { ThesisFeedbackController } from '../src/modules/thesis/thesis.controller';
import { ThesisService } from '../src/modules/thesis/thesis.service';

describe('n8n API contracts', () => {
  let app: any;
  const docs = new Map<string, any>();
  const query = (doc: any) => ({
    lean: () => ({ exec: async () => doc }),
    exec: async () => doc,
  });
  const queue = { add: jest.fn() };
  const webhook = { sendToN8n: jest.fn() };
  const thesisModel = { findOneAndUpdate: jest.fn(), findById: jest.fn() };
  const auth = { 'x-internal-api-key': 'internal-test-key' };
  let id: string;
  let token: string;
  const feedback = {
    summary: 'Trình bày rõ',
    score: 8,
    strengths: ['Có ví dụ'],
    weaknesses: [],
    suggestions: ['Thêm kiểm thử'],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        SubmissionController,
        SubmissionCallbackController,
        ThesisFeedbackController,
        FaqController,
      ],
      providers: [
        SubmissionService,
        InternalApiGuard,
        ThesisService,
        {
          provide: ConfigService,
          useValue: {
            get: (name: string) =>
              name === 'N8N_INTERNAL_API_KEY'
                ? 'internal-test-key'
                : 'http://n8n/webhook/test',
          },
        },
        { provide: WebhookService, useValue: webhook },
        { provide: getQueueToken('submission-queue'), useValue: queue },
        { provide: getModelToken('Thesis'), useValue: thesisModel },
        {
          provide: getModelToken('Submission'),
          useValue: {
            create: async (doc: any) => {
              docs.set(doc._id, { ...doc, status: 'QUEUED' });
            },
            findById: (id: string) => query(docs.get(id)),
            findOne: ({ _id, readTokenHash }: any) =>
              query(
                docs.get(_id)?.readTokenHash === readTokenHash
                  ? docs.get(_id)
                  : null,
              ),
            updateOne: async ({ _id }: any, { $set }: any) =>
              Object.assign(docs.get(_id), $set),
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects invalid submissions before saving or queueing', async () => {
    await request(app.getHttpServer())
      .post('/submissions')
      .send({ studentId: '23IT123' })
      .expect(400);
    expect(docs.size).toBe(0);
    expect(queue.add).not.toHaveBeenCalled();
  });
  it('saves content before queueing and returns a scoped result token', async () => {
    const response = await request(app.getHttpServer())
      .post('/submissions')
      .send({
        studentId: '23IT123',
        assignmentTitle: 'Bài 1',
        content: 'Danh sách liên kết',
      })
      .expect(201);
    id = response.body.submissionId;
    token = response.body.readToken;
    expect(docs.get(id).content).toBe('Danh sách liên kết');
    expect(queue.add).toHaveBeenCalledWith(
      'evaluate-submission',
      expect.objectContaining({ submissionId: id }),
      expect.objectContaining({ jobId: id, attempts: 3 }),
    );
  });
  it('protects internal endpoints and returns 404 for missing records', async () => {
    await request(app.getHttpServer())
      .get(`/api/internal/submissions/${id}`)
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/internal/submissions/${id}`)
      .set({ 'x-internal-api-key': 'wrong' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/internal/submissions/missing')
      .set(auth)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/internal/submissions/${id}`)
      .set(auth)
      .expect(200);
  });
  it('rejects invalid scores, mismatched student IDs, and premature notifications', async () => {
    const body = {
      submissionId: id,
      studentId: '23IT123',
      model: 'gemini',
      feedback,
    };
    await request(app.getHttpServer())
      .post(`/api/internal/submissions/${id}/ai-feedback`)
      .set(auth)
      .send({ ...body, feedback: { ...feedback, score: 11 } })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/internal/submissions/${id}/ai-feedback`)
      .set(auth)
      .send({ ...body, studentId: 'other' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/internal/notifications/assignment-analyzed')
      .set(auth)
      .send(body)
      .expect(409);
  });
  it('persists feedback and repeated notifications without duplicating records', async () => {
    await request(app.getHttpServer())
      .post(`/api/internal/submissions/${id}/ai-feedback`)
      .set(auth)
      .send({
        submissionId: id,
        studentId: '23IT123',
        model: 'gemini',
        feedback,
      })
      .expect(201);
    for (let i = 0; i < 2; i++)
      await request(app.getHttpServer())
        .post('/api/internal/notifications/assignment-analyzed')
        .set(auth)
        .send({ submissionId: id, studentId: '23IT123' })
        .expect(201);
    expect(docs.size).toBe(1);
    expect(docs.get(id).notification.score).toBe(8);
    const response = await request(app.getHttpServer())
      .get(`/submissions/${id}`)
      .set('x-submission-token', token)
      .expect(200);
    expect(response.body.feedback.score).toBe(8);
    expect(response.body.readTokenHash).toBeUndefined();
    await request(app.getHttpServer())
      .get(`/submissions/${id}`)
      .set('x-submission-token', '0'.repeat(64))
      .expect(401);
  });
  it('saves thesis feedback without triggering another webhook', async () => {
    thesisModel.findOneAndUpdate.mockReturnValue(query({}));
    await request(app.getHttpServer())
      .post(
        '/internal/theses/507f1f77bcf86cd799439011/milestones/507f1f77bcf86cd799439012/feedback',
      )
      .set(auth)
      .send({ aiFeedback: 'Hoàn thành mốc.' })
      .expect(201);
    expect(thesisModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        milestones: {
          $elemMatch: { _id: '507f1f77bcf86cd799439012', status: 'COMPLETED' },
        },
      }),
      expect.anything(),
      { new: true },
    );
    expect(webhook.sendToN8n).not.toHaveBeenCalled();
  });
  it('rejects stale thesis callbacks', async () => {
    thesisModel.findOneAndUpdate.mockReturnValue(query(null));
    thesisModel.findById.mockReturnValue(
      query({
        milestones: [{ _id: '507f1f77bcf86cd799439012', status: 'PENDING' }],
      }),
    );
    await request(app.getHttpServer())
      .post(
        '/internal/theses/507f1f77bcf86cd799439011/milestones/507f1f77bcf86cd799439012/feedback',
      )
      .set(auth)
      .send({ aiFeedback: 'Hoàn thành mốc.' })
      .expect(409);
  });
  it('proxies FAQ and surfaces workflow failures', async () => {
    webhook.sendToN8n.mockResolvedValue({
      success: true,
      data: { answer: 'Liên hệ cố vấn.' },
    });
    await request(app.getHttpServer())
      .post('/faq/ask')
      .send({ question: '  Học phí?  ' })
      .expect(200);
    expect(webhook.sendToN8n).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Học phí?' }),
      'FAQ_QUESTION',
      'http://n8n/webhook/test',
      0,
      120000,
    );
    webhook.sendToN8n.mockResolvedValue({ success: false, statusCode: 504 });
    await request(app.getHttpServer())
      .post('/faq/ask')
      .send({ question: 'Học phí?' })
      .expect(502);
  });
});
