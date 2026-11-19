import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { AiModule } from '../ai/ai.module';
import {
  CourseRegistrationController,
  CoursesController,
  ClassSectionsController,
  StudentTimetableController,
} from './course-registration.controller';
import { CourseRegistrationService } from './course-registration.service';
import { TimetableService } from './timetable.service';

@Module({
  imports: [WebhookModule, AiModule],
  controllers: [
    CourseRegistrationController,
    CoursesController,
    ClassSectionsController,
    StudentTimetableController,
  ],
  providers: [CourseRegistrationService, TimetableService],
  exports: [CourseRegistrationService],
})
export class CourseRegistrationModule {}
