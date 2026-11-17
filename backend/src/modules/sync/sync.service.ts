import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student, StudentDocument } from '../student/schemas/student.schema';
import { SupabaseStudentWebhookDto } from './dto/supabase-student-webhook.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
  ) {}

  /**
   * Syncs a student record received from a Supabase database webhook into MongoDB.
   * Supabase acts as the Single Source of Truth (SSOT).
   */
  async syncSupabaseStudent(payload: SupabaseStudentWebhookDto) {
    this.logger.log(
      `Received Supabase webhook: type=${payload.type}, table=${payload.table}`,
    );

    if (payload.table !== 'students') {
      this.logger.warn(`Ignored webhook for unhandled table: ${payload.table}`);
      return {
        success: false,
        message: `Ignored event for non-student table: ${payload.table}`,
      };
    }

    const record = payload.record;
    if (!record || !record.id) {
      throw new BadRequestException('Webhook payload missing valid student record with id');
    }

    const studentId = String(record.id).trim();
    const fullName = record.full_name || 'Chưa cập nhật họ tên';
    const normalizedStatus = record.status ? record.status.toUpperCase() : 'ACTIVE';

    if (payload.type === 'DELETE') {
      await this.studentModel.updateOne(
        { _id: studentId },
        {
          $set: {
            status: 'INACTIVE',
            updatedAt: new Date(),
          },
        },
      );
      this.logger.log(`Marked student ${studentId} as INACTIVE in MongoDB upon deletion event`);
      return {
        success: true,
        action: 'DELETED_STATUS_INACTIVE',
        studentId,
      };
    }

    // Handles INSERT or UPDATE with upsert
    const updateResult = await this.studentModel.updateOne(
      { _id: studentId },
      {
        $set: {
          full_name: fullName,
          status: normalizedStatus,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          student_email:
            record.student_email ||
            record.email ||
            `${studentId.toLowerCase()}@vku.udn.vn`,
          advisor_email: record.advisor_email || 'advisor.cntt@vku.udn.vn',
          gender: record.gender || 'MALE',
          class_name: record.class_name || record.classId || '23IT1',
          major: record.major || 'Công nghệ Thông tin',
          department: record.department || 'Khoa Công nghệ Thông tin',
          academic_year: record.academic_year || '2023-2027',
          gpa: typeof record.gpa === 'number' ? record.gpa : 3.0,
          credits_earned: typeof record.credits_earned === 'number' ? record.credits_earned : 0,
          total_credits: 135,
          total_sessions: 20,
          absent_sessions: 0,
          attendance_rate: 100,
          attendance_warning: false,
          exam_prohibited: false,
        },
      },
      { upsert: true },
    );

    const isNew = Boolean(updateResult.upsertedCount && updateResult.upsertedCount > 0);
    this.logger.log(
      `Successfully synced student ${studentId} (${fullName}) to MongoDB. Action: ${
        isNew ? 'INSERTED' : 'UPDATED'
      }`,
    );

    return {
      success: true,
      action: isNew ? 'INSERT' : 'UPDATE',
      studentId,
      full_name: fullName,
      status: normalizedStatus,
    };
  }
}
