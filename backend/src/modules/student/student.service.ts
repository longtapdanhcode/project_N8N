import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from './schemas/student.schema';
import { Thesis } from '../thesis/schemas/thesis.schema';
import { GradeRecord, AttendanceRecord } from '../academic-warning/schemas/student-warning.schema';

export class StudentFilterDto {
  search?: string;
  major?: string;
  classId?: string;
  status?: string;
  attendanceWarningOnly?: boolean | string;
  page?: number | string;
  pageSize?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
    @InjectModel(Thesis.name)
    private readonly thesisModel: Model<Thesis>,
    @InjectModel(GradeRecord.name)
    private readonly gradeModel: Model<GradeRecord>,
    @InjectModel(AttendanceRecord.name)
    private readonly attendanceModel: Model<AttendanceRecord>,
  ) {}

  private mapToFrontendStudent(doc: any, thesis?: any) {
    return {
      id: doc._id,
      studentId: doc._id,
      fullName: doc.full_name,
      gender: doc.gender || 'MALE',
      email: doc.student_email || `${doc._id.toLowerCase()}@vku.udn.vn`,
      phone: doc.phone || '',
      classId: doc.class_name || '',
      major: doc.major || '',
      department: doc.department || '',
      academicYear: doc.academic_year || '2022-2026',
      status: doc.status || 'ACTIVE',
      gpa: Number((doc.gpa ?? 0).toFixed(2)),
      creditsEarned: doc.credits_earned ?? 0,
      totalCredits: doc.total_credits ?? 135,
      attendanceRate: Number(((doc.attendance_rate ?? 100) / 100).toFixed(2)),
      absentSessions: doc.absent_sessions ?? 0,
      totalSessions: doc.total_sessions ?? 20,
      attendanceWarning: Boolean(doc.attendance_warning),
      examProhibited: Boolean(doc.exam_prohibited),
      thesisId: thesis ? thesis._id : undefined,
      thesis: thesis ? {
        _id: thesis._id,
        title: thesis.title,
        description: thesis.description,
        studentId: thesis.studentId,
        studentName: thesis.studentName || doc.full_name,
        advisorId: thesis.advisorId,
        advisorName: thesis.advisorName,
        department: thesis.department,
        milestones: thesis.milestones || [],
        progressPercent: thesis.progressPercent ?? 0,
        defenseStatus: thesis.defenseStatus ?? 'NOT_ELIGIBLE',
        createdAt: thesis.createdAt,
        updatedAt: thesis.updatedAt,
      } : undefined,
      createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async findAll(options: StudentFilterDto = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.max(1, Number(options.pageSize || options.limit || 20));
    const query: Record<string, any> = {};

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { _id: regex },
        { full_name: regex },
        { student_email: regex },
        { class_name: regex },
      ];
    }

    if (options.major) {
      query.major = new RegExp(options.major.trim(), 'i');
    }

    if (options.classId) {
      query.class_name = options.classId.trim();
    }

    if (options.status) {
      query.status = options.status.trim();
    }

    const warningOnly = options.attendanceWarningOnly === true || options.attendanceWarningOnly === 'true';
    if (warningOnly) {
      query.$or = [{ attendance_warning: true }, { exam_prohibited: true }];
    }

    const sortFieldMap: Record<string, string> = {
      gpa: 'gpa',
      creditsEarned: 'credits_earned',
      attendanceRate: 'attendance_rate',
      fullName: 'full_name',
      studentId: '_id',
      classId: 'class_name',
    };

    const sortField = options.sortBy ? (sortFieldMap[options.sortBy] || options.sortBy) : '_id';
    const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const total = await this.studentModel.countDocuments(query);
    const skip = (page - 1) * pageSize;

    const docs = await this.studentModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    // Fetch theses for these students if any
    const studentIds = docs.map((d) => d._id);
    const theses = await this.thesisModel.find({ studentId: { $in: studentIds } }).lean().exec();
    const thesisMap = new Map(theses.map((t) => [t.studentId, t]));

    const data = docs.map((doc) => this.mapToFrontendStudent(doc, thesisMap.get(doc._id)));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getClassList(): Promise<string[]> {
    const classes = await this.studentModel.distinct('class_name').exec();
    return classes.filter(Boolean).sort();
  }

  async getTopAttendanceViolators(limit = 5) {
    const count = Math.max(1, Number(limit || 5));
    const docs = await this.studentModel
      .find({ exam_prohibited: true })
      .sort({ absent_sessions: -1 })
      .limit(count)
      .lean()
      .exec();

    return docs.map((doc) => this.mapToFrontendStudent(doc));
  }

  async findById(studentId: string) {
    const doc = await this.studentModel.findById(studentId).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Student "${studentId}" not found`);
    }

    const [thesis, grades, attendances] = await Promise.all([
      this.thesisModel.findOne({ studentId }).lean().exec(),
      this.gradeModel.find({ student_id: studentId }).lean().exec(),
      this.attendanceModel.find({ student_id: studentId }).lean().exec(),
    ]);

    const student = this.mapToFrontendStudent(doc, thesis);
    return {
      ...student,
      grades: grades.map((g) => ({
        subject: g.subject,
        score: g.score,
        credits: g.credits,
      })),
      attendanceHistory: attendances.map((a) => ({
        session: a.session,
        status: a.status,
      })),
    };
  }

  async getDashboardKPIs() {
    const [
      totalStudents,
      activeStudents,
      attendanceWarningCount,
      examProhibitedCount,
      theses,
      avgGpaResult,
    ] = await Promise.all([
      this.studentModel.countDocuments(),
      this.studentModel.countDocuments({ status: 'ACTIVE' }),
      this.studentModel.countDocuments({ attendance_warning: true }),
      this.studentModel.countDocuments({ exam_prohibited: true }),
      this.thesisModel.find().lean().exec(),
      this.studentModel.aggregate([
        { $group: { _id: null, avgGpa: { $avg: '$gpa' } } },
      ]),
    ]);

    let totalMilestones = 0;
    let completedMilestones = 0;
    for (const t of theses) {
      const milestones = t.milestones || [];
      for (const m of milestones) {
        totalMilestones++;
        if (m.status === 'COMPLETED') completedMilestones++;
      }
    }

    const completedMilestonesRate = totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

    const averageGpa = avgGpaResult.length > 0 && avgGpaResult[0].avgGpa != null
      ? Number(avgGpaResult[0].avgGpa.toFixed(2))
      : 0;

    return {
      totalStudents,
      activeStudents,
      attendanceWarningCount,
      examProhibitedCount,
      totalTheses: theses.length,
      completedMilestonesRate,
      averageGpa,
    };
  }
}
