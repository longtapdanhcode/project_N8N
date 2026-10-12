import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../webhook/webhook.service';
import { StudentRecord } from './schemas/student-warning.schema';

export interface AcademicWarningScanResult {
  success: boolean;
  total_violations: number;
  dispatched_count: number;
  violations: Array<{
    student_id: string;
    full_name: string;
    student_email?: string;
    gpa: number;
    absent_rate: number;
    failed_credits: number;
    warning_tier: string;
    advisor_email: string;
  }>;
}

@Injectable()
export class AcademicWarningService {
  private readonly logger = new Logger(AcademicWarningService.name);

  constructor(
    @InjectModel(StudentRecord.name)
    private readonly studentModel: Model<StudentRecord>,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Executes a 5-stage MongoDB aggregation pipeline to detect students at academic risk:
   * Stage 1: $lookup grades
   * Stage 2: $lookup attendances
   * Stage 3: $project GPA, failed credits (score < 4.0), and absent count
   * Stage 4: $addFields absent_rate (%)
   * Stage 5: $match criteria: GPA < 2.0 OR absent_rate >= 20% OR failed_credits >= 8
   *
   * Dispatches ACADEMIC_WARNING_ALERT to n8n webhook for matched students up to limit.
   * Safety Guard / Rate Limiter: In dev or test environments, defaults to dispatching 1 sample student.
   */
  async scanAndDispatchWarnings(limit?: number): Promise<AcademicWarningScanResult> {
    this.logger.log('Executing academic risk aggregation pipeline on MongoDB...');

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'grades',
          localField: '_id',
          foreignField: 'student_id',
          as: 'academic_grades',
        },
      },
      {
        $lookup: {
          from: 'attendances',
          localField: '_id',
          foreignField: 'student_id',
          as: 'attendance_records',
        },
      },
      {
        $project: {
          _id: 1,
          full_name: 1,
          advisor_email: 1,
          student_email: 1,
          gpa: { $ifNull: [{ $avg: '$academic_grades.score' }, 0] },
          failed_credits: {
            $reduce: {
              input: '$academic_grades',
              initialValue: 0,
              in: {
                $cond: [
                  { $lt: ['$$this.score', 4.0] },
                  { $add: ['$$value', { $ifNull: ['$$this.credits', 0] }] },
                  '$$value',
                ],
              },
            },
          },
          total_sessions: { $size: '$attendance_records' },
          absent_sessions: {
            $size: {
              $filter: {
                input: '$attendance_records',
                as: 'att',
                cond: {
                  $in: [
                    { $toUpper: { $ifNull: ['$$att.status', ''] } },
                    ['ABSENT', 'VẮNG', 'VANG'],
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          absent_rate: {
            $cond: [
              { $eq: ['$total_sessions', 0] },
              0,
              {
                $multiply: [
                  { $divide: ['$absent_sessions', '$total_sessions'] },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          $or: [
            { gpa: { $lt: 2.0 } },
            { absent_rate: { $gte: 20 } },
            { failed_credits: { $gte: 8 } },
          ],
        },
      },
    ];

    const violations = await this.studentModel.aggregate(pipeline).exec();
    this.logger.log(`Found ${violations.length} students violating academic criteria.`);

    const n8nWarningUrl = this.configService.get<string>(
      'N8N_ACADEMIC_WARNING_URL',
      'http://localhost:5678/webhook/academic-warning-alert',
    );

    // Map all violated students for the full violation report
    const mappedViolations = violations.map((student) => {
      const gpa = Number((student.gpa ?? 0).toFixed(2));
      const absentRate = Number((student.absent_rate ?? 0).toFixed(2));
      const failedCredits = student.failed_credits ?? 0;

      let warningTier = 'TIER_1';
      if (gpa < 1.0 || absentRate >= 40 || failedCredits >= 16) {
        warningTier = 'TIER_3';
      } else if (gpa < 1.5 || absentRate >= 30 || failedCredits >= 12) {
        warningTier = 'TIER_2';
      }

      return {
        student_id: student._id,
        full_name: student.full_name,
        student_email: student.student_email,
        gpa,
        absent_rate: absentRate,
        failed_credits: failedCredits,
        warning_tier: warningTier,
        advisor_email: student.advisor_email,
      };
    });

    // Safety Guard / Rate Limiter:
    // Nếu có tham số limit thì cắt mảng, mặc định chế độ test chỉ gửi 1 sinh viên
    const dispatchLimit =
      limit !== undefined
        ? limit
        : (process.env.NODE_ENV === 'production' ? violations.length : 1);
    const targetStudents = violations.slice(0, Math.max(0, dispatchLimit));

    this.logger.log(
      `Dispatch limit set to ${dispatchLimit}. Dispatching webhook for ${targetStudents.length}/${violations.length} students.`,
    );

    let dispatchedCount = 0;

    for (const student of targetStudents) {
      const gpa = Number((student.gpa ?? 0).toFixed(2));
      const absentRate = Number((student.absent_rate ?? 0).toFixed(2));
      const failedCredits = student.failed_credits ?? 0;

      let warningTier = 'TIER_1';
      if (gpa < 1.0 || absentRate >= 40 || failedCredits >= 16) {
        warningTier = 'TIER_3';
      } else if (gpa < 1.5 || absentRate >= 30 || failedCredits >= 12) {
        warningTier = 'TIER_2';
      }

      const payload = {
        student_id: student._id,
        full_name: student.full_name,
        student_email: student.student_email,
        advisor_email: student.advisor_email,
        gpa,
        absent_rate: absentRate,
        failed_credits: failedCredits,
        warning_tier: warningTier,
        scanned_at: new Date().toISOString(),
      };

      try {
        const dispatchRes = await this.webhookService.sendToN8n(
          payload,
          'ACADEMIC_WARNING_ALERT',
          n8nWarningUrl,
        );
        if (dispatchRes.success) {
          dispatchedCount++;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch alert for student ${student._id}: ${err.message}`);
      }
    }

    return {
      success: true,
      total_violations: violations.length,
      dispatched_count: dispatchedCount,
      violations: mappedViolations,
    };
  }
}
