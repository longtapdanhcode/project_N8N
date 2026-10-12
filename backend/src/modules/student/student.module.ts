import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Student, StudentSchema } from './schemas/student.schema';
import { Thesis, ThesisSchema } from '../thesis/schemas/thesis.schema';
import { GradeRecord, GradeRecordSchema, AttendanceRecord, AttendanceRecordSchema } from '../academic-warning/schemas/student-warning.schema';
import { StudentService } from './student.service';
import { StudentController, DashboardController } from './student.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Thesis.name, schema: ThesisSchema },
      { name: GradeRecord.name, schema: GradeRecordSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
    ]),
  ],
  controllers: [StudentController, DashboardController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
