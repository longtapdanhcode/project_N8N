import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThesisModule } from './modules/thesis/thesis.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { AiModule } from './modules/ai/ai.module';
import { DocumentModule } from './modules/document/document.module';
import { AcademicWarningModule } from './modules/academic-warning/academic-warning.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { CourseRegistrationModule } from './modules/course-registration/course-registration.module';
import { StudentModule } from './modules/student/student.module';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';
import { FaqController } from './faq.controller';
import { PortalKeyGuard } from './modules/auth/portal-key.guard';
import { FaqMemoryModule } from './modules/faq-memory/faq-memory.module';
import { N8nDeliveryModule } from './modules/n8n-delivery/n8n-delivery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGO_URI',
          'mongodb://localhost:27017/vku-ai-support',
        ),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    ThesisModule,
    WebhookModule,
    AssignmentModule,
    AiModule,
    DocumentModule,
    AcademicWarningModule,
    AttendanceModule,
    CourseRegistrationModule,
    StudentModule,
    AuthModule,
    SyncModule,
    FaqMemoryModule,
    N8nDeliveryModule,
  ],
  controllers: [AppController, FaqController],
  providers: [AppService, { provide: APP_GUARD, useClass: PortalKeyGuard }],
})
export class AppModule {}
