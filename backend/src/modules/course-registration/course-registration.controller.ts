import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CourseRegistrationService } from './course-registration.service';
import { CourseRegistrationDto } from './dto/course-registration.dto';
import { TimetableService } from './timetable.service';

@Controller('students')
export class StudentTimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  /** GET /students/:id/timetable?from=YYYY-MM-DD&to=YYYY-MM-DD&semester=... */
  @Get(':id/timetable')
  async getTimetable(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('semester') semester?: string,
  ) {
    return await this.timetableService.getStudentTimetable(id, {
      from,
      to,
      semester,
    });
  }
}

@Controller('course-registration')
export class CourseRegistrationController {
  constructor(private readonly registrationService: CourseRegistrationService) {}

  @Post('register')
  async registerCourse(
    @Body() body: CourseRegistrationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return await this.registrationService.registerCourse(body, idempotencyKey);
  }
}

@Controller('courses')
export class CoursesController {
  constructor(private readonly registrationService: CourseRegistrationService) {}

  @Get()
  async getCourses() {
    return await this.registrationService.getCourses();
  }
}

@Controller('class-sections')
export class ClassSectionsController {
  constructor(private readonly registrationService: CourseRegistrationService) {}

  @Get()
  async getClassSections() {
    return await this.registrationService.getClassSections();
  }
}
