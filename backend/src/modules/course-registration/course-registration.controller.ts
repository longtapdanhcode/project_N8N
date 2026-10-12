import { Body, Controller, Get, Post } from '@nestjs/common';
import { CourseRegistrationService } from './course-registration.service';
import { CourseRegistrationDto } from './dto/course-registration.dto';

@Controller('course-registration')
export class CourseRegistrationController {
  constructor(private readonly registrationService: CourseRegistrationService) {}

  @Post('register')
  async registerCourse(@Body() body: CourseRegistrationDto) {
    return await this.registrationService.registerCourse(body);
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
