import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { AiModule } from '../ai/ai.module';
import {
  CourseRegistrationController,
  CoursesController,
  ClassSectionsController,
} from './course-registration.controller';
import { CourseRegistrationService } from './course-registration.service';

@Module({
  imports: [WebhookModule, AiModule],
  controllers: [
    CourseRegistrationController,
    CoursesController,
    ClassSectionsController,
  ],
  providers: [CourseRegistrationService],
  exports: [CourseRegistrationService],
})
export class CourseRegistrationModule {}
