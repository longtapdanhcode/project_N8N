import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { portalKeyProblem } from './modules/auth/portal-key.guard';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Configure NestJS application to preserve the raw body for incoming webhook signature verification
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Configure body parsers with raw body preservation and a 10mb payload limit
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '10mb' });

  // Enable Cross-Origin Resource Sharing for Frontend
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3002',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const configService = app.get(ConfigService);

  // Production phải có khóa cổng: thiếu thì ai gọi thẳng cổng 3001 cũng giả danh
  // được người dùng. Đọc qua ConfigService để thấy cả biến trong backend/.env.
  if (configService.get<string>('NODE_ENV') === 'production') {
    const key = configService.get<string>('PORTAL_API_KEY')?.trim();
    const problem = key ? portalKeyProblem(key) : 'Chưa đặt PORTAL_API_KEY.';
    if (problem) {
      logger.error(
        `${problem} Đặt cùng một khóa ngẫu nhiên (openssl rand -hex 48) cho backend và cổng 3000 rồi chạy lại.`,
      );
      await app.close();
      process.exit(1);
    }
  }
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  logger.log(`VKU AI Student Support Backend is running on port: ${port}`);
}

void bootstrap();
