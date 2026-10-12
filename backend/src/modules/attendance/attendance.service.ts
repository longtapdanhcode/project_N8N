import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookService } from '../webhook/webhook.service';
import { SupabaseService } from '../ai/supabase.service';
import { Student } from '../student/schemas/student.schema';
import { OfflineAttendanceSyncDto } from './dto/offline-attendance-sync.dto';

const SUBJECTS = [
  { code: 'IT3010', name: 'Hệ thống phân tán & Điện toán đám mây', totalSessions: 45 },
  { code: 'IT3025', name: 'Trí tuệ nhân tạo nâng cao', totalSessions: 60 },
  { code: 'IT3040', name: 'Kiến trúc phần mềm & Thiết kế hệ thống', totalSessions: 45 },
  { code: 'BA2010', name: 'Kinh tế số & Phân tích kinh doanh', totalSessions: 45 },
  { code: 'DS3030', name: 'Khai phá dữ liệu & Học máy ứng dụng', totalSessions: 60 },
  { code: 'CE2050', name: 'Hệ nhúng & Internet vạn vật (IoT)', totalSessions: 60 },
];

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
  ) {}

  /**
   * Receives offline attendance batch from PWA client, attaches synced_at timestamp,
   * forwards to n8n webhook workflow with HMAC signature, and returns ack/summary response.
   */
  async syncOfflineAttendance(dto: OfflineAttendanceSyncDto) {
    const syncedAt = new Date().toISOString();
    const payload = {
      device_id: dto.device_id,
      records: dto.records || [],
      synced_at: syncedAt,
    };

    this.logger.log(
      `Received offline attendance batch from device "${dto.device_id}" (${payload.records.length} records). Forwarding to n8n...`,
    );

    const n8nAttendanceUrl = this.configService.get<string>(
      'N8N_ATTENDANCE_SYNC_URL',
      'http://localhost:5678/webhook/attendance-offline-sync',
    );

    const deliveryResult = await this.webhookService.sendToN8n(
      payload,
      'OFFLINE_ATTENDANCE_SYNC',
      n8nAttendanceUrl,
    );

    if (deliveryResult.success && deliveryResult.data) {
      return deliveryResult.data;
    }

    // Graceful fallback response when n8n upstream is mocked/offline
    return {
      success: deliveryResult.success,
      statusCode: deliveryResult.statusCode,
      ack_token: `ack-${Date.now()}`,
      accepted_count: payload.records.length,
      discarded_conflicts: 0,
      synced_at: syncedAt,
      device_id: dto.device_id,
    };
  }

  /**
   * Endpoint: GET /attendance/history
   * Queries attendance records from Supabase public.attendance
   */
  async getAttendanceHistory(query: {
    class_section_id?: string;
    student_id?: string;
    page?: number;
    limit?: number;
  }) {
    const client = this.supabaseService.getClient();
    let q = client.from('attendance').select('*');

    if (query.class_section_id) {
      q = q.eq('class_section_id', query.class_section_id);
    }
    if (query.student_id) {
      q = q.eq('student_id', query.student_id);
    }

    const limit = Math.max(1, Number(query.limit || 50));
    const page = Math.max(1, Number(query.page || 1));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await q
      .order('device_timestamp', { ascending: false })
      .range(from, to);

    if (error) {
      this.logger.error(`Error querying attendance history: ${error.message}`);
      throw new Error(error.message);
    }

    return {
      data: data || [],
      page,
      limit,
      total: count ?? (data?.length || 0),
    };
  }

  /**
   * Endpoint: GET /attendance/records
   * Generates or fetches paginated AttendanceRecord list for dashboard table
   */
  async getAttendanceRecords(options: {
    search?: string;
    status?: string;
    classId?: string;
    page?: number | string;
    pageSize?: number | string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.max(1, Number(options.pageSize || 20));
    const query: Record<string, any> = {};

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [{ _id: regex }, { full_name: regex }, { class_name: regex }];
    }

    if (options.classId) {
      query.class_name = options.classId.trim();
    }

    if (options.status && options.status !== 'ALL') {
      if (options.status === 'PROHIBITED') query.exam_prohibited = true;
      else if (options.status === 'WARNING') query.attendance_warning = true;
      else if (options.status === 'NORMAL') {
        query.attendance_warning = { $ne: true };
        query.exam_prohibited = { $ne: true };
      }
    }

    const total = await this.studentModel.countDocuments(query);
    const skip = (page - 1) * pageSize;

    const students = await this.studentModel
      .find(query)
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    const data = students.map((s, idx) => {
      const subject = SUBJECTS[idx % SUBJECTS.length];
      const totalSessions = subject.totalSessions;
      const absentSessions = Math.min(
        totalSessions,
        Math.round((s.absent_sessions || 0) * (totalSessions / (s.total_sessions || 20))),
      );
      const excused = Math.floor(absentSessions * 0.3);
      const attended = totalSessions - absentSessions;
      const absenceRate = Number((absentSessions / totalSessions).toFixed(2));

      let status: 'NORMAL' | 'WARNING' | 'PROHIBITED' = 'NORMAL';
      if (absenceRate > 0.20) status = 'PROHIBITED';
      else if (absenceRate >= 0.15) status = 'WARNING';

      return {
        id: `att-${s._id}-${subject.code}`,
        studentId: s._id,
        studentName: s.full_name,
        classId: s.class_name,
        subjectCode: subject.code,
        subjectName: subject.name,
        totalSessions,
        attendedSessions: attended,
        absentSessions,
        excusedAbsences: excused,
        absenceRate,
        status,
        lastUpdated: new Date().toISOString(),
      };
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
