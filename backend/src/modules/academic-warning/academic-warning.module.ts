import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookModule } from '../webhook/webhook.module';
import { AcademicWarningController } from './academic-warning.controller';
import { AcademicWarningService } from './academic-warning.service';
import {
  StudentRecord,
  StudentRecordSchema,
  GradeRecord,
  GradeRecordSchema,
  AttendanceRecord,
  AttendanceRecordSchema,
} from './schemas/student-warning.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentRecord.name, schema: StudentRecordSchema },
      { name: GradeRecord.name, schema: GradeRecordSchema },
      { name: AttendanceRecord.name, schema: AttendanceRecordSchema },
    ]),
    WebhookModule,
  ],
  controllers: [AcademicWarningController],
  providers: [AcademicWarningService],
  exports: [AcademicWarningService],
})
export class AcademicWarningModule {}
