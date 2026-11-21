import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});

describe('Portal key (e2e)', () => {
  const key = 'e2e-portal-key-0123456789abcdefghijklmnop';
  let app: INestApplication<App>;
  let previous: string | undefined;

  beforeAll(async () => {
    previous = process.env.PORTAL_API_KEY;
    process.env.PORTAL_API_KEY = key;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.PORTAL_API_KEY;
    else process.env.PORTAL_API_KEY = previous;
  });

  it('rejects calls that bypass the portal', async () => {
    await request(app.getHttpServer()).post('/faq/ask').send({}).expect(401);
    await request(app.getHttpServer())
      .post('/faq/ask')
      .set('x-portal-key', 'wrong')
      .send({})
      .expect(401);
    await request(app.getHttpServer()).get('/students').expect(401);
  });

  it('accepts the portal key', async () => {
    // Đi qua guard thì gặp kiểm tra dữ liệu (400), không còn 401.
    await request(app.getHttpServer())
      .post('/faq/ask')
      .set('x-portal-key', key)
      .send({})
      .expect(400);
  });

  it('keeps health and self-authenticated webhooks reachable', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
    const sync = await request(app.getHttpServer())
      .post('/api/v1/internal/sync/supabase-student')
      .send({});
    // Có thể 401/503 từ kiểm tra secret của chính webhook, nhưng không phải từ khóa cổng.
    expect(sync.body.message).not.toBe('Thiếu hoặc sai khóa cổng.');
  });
});
