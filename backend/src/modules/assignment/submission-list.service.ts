import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Submission } from './submission.schema';
import { Student, StudentDocument } from '../student/schemas/student.schema';

export const SUBMISSION_STATUSES = [
  'QUEUED',
  'COMPLETED',
  'QUEUE_FAILED',
  'FAILED',
] as const;

/** Trường được phép sắp xếp; không cho client sắp theo trường tùy ý. */
const SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  status: 'status',
  studentId: 'studentId',
  assignmentTitle: 'assignmentTitle',
  score: 'feedback.score',
};

export interface SubmissionListQuery {
  page?: string | number;
  pageSize?: string | number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const iso = (v: unknown) =>
  v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null;
const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];

export function parseListQuery(q: SubmissionListQuery = {}) {
  const page = Math.max(1, Math.floor(Number(q.page)) || 1);
  const pageSize = Math.min(100, Math.max(1, Math.floor(Number(q.pageSize)) || 20));
  const search = typeof q.search === 'string' ? q.search.trim() : '';
  if (search.length > 100) throw new BadRequestException('search tối đa 100 ký tự');
  const rawStatus = typeof q.status === 'string' ? q.status.trim().toUpperCase() : '';
  const status = rawStatus && rawStatus !== 'ALL' ? rawStatus : undefined;
  if (status && !(SUBMISSION_STATUSES as readonly string[]).includes(status))
    throw new BadRequestException('status không hợp lệ');
  const sortBy = q.sortBy || 'createdAt';
  if (!SORT_FIELDS[sortBy]) throw new BadRequestException('sortBy không hợp lệ');
  if (q.sortOrder && !['asc', 'desc'].includes(q.sortOrder))
    throw new BadRequestException('sortOrder phải là asc hoặc desc');
  return {
    page,
    pageSize,
    search,
    status,
    sort: { [SORT_FIELDS[sortBy]]: q.sortOrder === 'asc' ? 1 : -1, _id: 1 } as Record<string, 1 | -1>,
  };
}

@Injectable()
export class SubmissionListService {
  private readonly logger = new Logger(SubmissionListService.name);

  constructor(
    @InjectModel('Submission') private readonly submissions: Model<Submission>,
    @InjectModel(Student.name) private readonly students: Model<StudentDocument>,
  ) {}

  /** Danh sách bài nộp cho giảng viên: lọc, tìm theo tiêu đề/MSSV/họ tên, phân trang. */
  async list(query: SubmissionListQuery = {}) {
    const { page, pageSize, search, status, sort } = parseListQuery(query);
    try {
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        const byName = await this.students
          .find({ full_name: regex }, { _id: 1 })
          .limit(500)
          .lean()
          .exec();
        filter.$or = [
          { assignmentTitle: regex },
          { studentId: regex },
          ...(byName.length ? [{ studentId: { $in: byName.map((s) => String(s._id)) } }] : []),
        ];
      }

      const [total, docs] = await Promise.all([
        this.submissions.countDocuments(filter).exec(),
        this.submissions
          .find(filter)
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean()
          .exec(),
      ]);

      const ids = [...new Set(docs.map((d) => String(d.studentId)))];
      const names = new Map(
        (ids.length
          ? await this.students
              .find({ _id: { $in: ids } }, { full_name: 1 })
              .lean()
              .exec()
          : []
        ).map((s) => [String(s._id), s.full_name]),
      );

      return {
        data: docs.map((doc: any) => ({
          _id: String(doc._id),
          submissionId: String(doc._id),
          studentId: String(doc.studentId),
          studentName: names.get(String(doc.studentId)) ?? null,
          assignmentTitle: doc.assignmentTitle,
          content: doc.content ?? '',
          criteria: strings(doc.criteria),
          status: doc.status,
          model: doc.model ?? null,
          feedback: doc.feedback
            ? {
                summary: doc.feedback.summary ?? '',
                score: typeof doc.feedback.score === 'number' ? doc.feedback.score : null,
                strengths: strings(doc.feedback.strengths),
                weaknesses: strings(doc.feedback.weaknesses),
                suggestions: strings(doc.feedback.suggestions),
              }
            : null,
          createdAt: iso(doc.createdAt),
          updatedAt: iso(doc.updatedAt),
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error: any) {
      this.logger.error(`Không đọc được danh sách bài nộp: ${error?.message}`);
      throw new ServiceUnavailableException('Chưa đọc được danh sách bài nộp');
    }
  }
}
