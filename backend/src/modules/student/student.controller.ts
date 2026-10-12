import { Controller, Get, Param, Query } from '@nestjs/common';
import { StudentService, StudentFilterDto } from './student.service';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  async getStudents(@Query() query: StudentFilterDto) {
    return await this.studentService.findAll(query);
  }

  @Get('classes')
  async getClassList() {
    return await this.studentService.getClassList();
  }

  @Get('top-violators')
  async getTopAttendanceViolators(@Query('limit') limit?: number) {
    return await this.studentService.getTopAttendanceViolators(limit);
  }

  @Get('kpis')
  async getKPIs() {
    return await this.studentService.getDashboardKPIs();
  }

  @Get(':id')
  async getStudentById(@Param('id') id: string) {
    return await this.studentService.findById(id);
  }
}

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly studentService: StudentService) {}

  @Get('kpis')
  async getKPIs() {
    return await this.studentService.getDashboardKPIs();
  }
}
