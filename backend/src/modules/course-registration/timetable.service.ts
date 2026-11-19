import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../ai/supabase.service';

/** Một buổi học, đúng dạng TimetableEntry mà PWA sinh viên lưu vào IndexedDB. */
export interface TimetableEntry {
  id: string;
  studentId: string;
  classSectionId: string;
  course: string;
  code: string;
  date: string;
  start: string;
  end: string;
  room: string;
  lecturer: string;
  attendance: 'not-marked' | 'confirmed';
  updatedAt: number;
  scheduled: true;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 42;
const INACTIVE_ENROLLMENT = new Set(['DROPPED', 'WITHDRAWN', 'CANCELLED']);
const ATTENDED = new Set(['PRESENT', 'LATE']);
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const pad = (n: number) => String(n).padStart(2, '0');
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/**
 * Giờ mặc định của 10 tiết: tiết 50 phút, sáng tiết 1 từ 07:00, chiều tiết 6 từ 13:00.
 * Ghi đè bằng TIMETABLE_PERIODS khi trường dùng khung giờ khác.
 */
export const DEFAULT_PERIODS: string[] = Array.from({ length: 10 }, (_, i) => {
  const start = i < 5 ? 7 * 60 + i * 50 : 13 * 60 + (i - 5) * 50;
  return `${fromMinutes(start)}-${fromMinutes(start + 50)}`;
});

export function parsePeriods(raw?: string): string[] {
  if (!raw) return DEFAULT_PERIODS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('TIMETABLE_PERIODS phải là JSON, ví dụ ["07:00-07:50", ...]');
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every((p) => typeof p === 'string' && TIME_RANGE_RE.test(p))
  )
    throw new Error('TIMETABLE_PERIODS phải là mảng chuỗi "HH:MM-HH:MM"');
  return parsed as string[];
}

/** Ngày hiện tại (YYYY-MM-DD) theo giờ Việt Nam. */
export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
}

const parseDate = (value: string) => new Date(`${value}T00:00:00Z`);
const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Quy ước schedule_day: 2 = Thứ Hai ... 7 = Thứ Bảy, 8 = Chủ nhật. */
export const vkuWeekday = (d: Date) => (d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1);

/** Khoảng ngày cần dựng lịch; mặc định là tuần hiện tại (Thứ Hai đến Chủ nhật). */
export function resolveRange(from?: string, to?: string, today = todayInVietnam()) {
  for (const [name, value] of [
    ['from', from],
    ['to', to],
  ] as const) {
    if (value !== undefined && (!DATE_RE.test(value) || isNaN(parseDate(value).getTime())))
      throw new BadRequestException(`${name} phải có dạng YYYY-MM-DD`);
  }
  if (!from) {
    const base = parseDate(today);
    const monday = addDays(base, -((vkuWeekday(base) - 2 + 7) % 7));
    from = formatDate(monday);
    to ??= formatDate(addDays(monday, 6));
  }
  to ??= formatDate(addDays(parseDate(from), 6));
  const days = (parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000;
  if (days < 0) throw new BadRequestException('from phải trước hoặc bằng to');
  if (days >= MAX_RANGE_DAYS)
    throw new BadRequestException(`Mỗi lần chỉ lấy tối đa ${MAX_RANGE_DAYS} ngày`);
  return { from, to };
}

interface SectionRow {
  id: string;
  course_id?: string;
  course_name: string;
  schedule_day: number;
  start_period: number;
  end_period: number;
  room?: string | null;
  lecturer?: string | null;
  updated_at?: string | null;
}

/** Dựng các buổi học từ lớp học phần đã đăng ký; thuần, không gọi I/O. */
export function buildEntries(input: {
  studentId: string;
  sections: SectionRow[];
  attendance: { class_section_id: string; session_date: string; status: string }[];
  from: string;
  to: string;
  periods: string[];
}): { entries: TimetableEntry[]; skipped: string[] } {
  const attended = new Set(
    input.attendance
      .filter((a) => ATTENDED.has(String(a.status).toUpperCase()))
      .map((a) => `${a.class_section_id}:${a.session_date}`),
  );
  const entries: TimetableEntry[] = [];
  const skipped: string[] = [];
  const valid = input.sections.filter((s) => {
    const ok =
      Number.isInteger(s.schedule_day) &&
      s.schedule_day >= 2 &&
      s.schedule_day <= 8 &&
      Number.isInteger(s.start_period) &&
      Number.isInteger(s.end_period) &&
      s.start_period >= 1 &&
      s.start_period <= s.end_period &&
      s.end_period <= input.periods.length;
    if (!ok) skipped.push(s.id);
    return ok;
  });

  for (
    let d = parseDate(input.from);
    d <= parseDate(input.to);
    d = addDays(d, 1)
  ) {
    const date = formatDate(d);
    for (const s of valid) {
      if (s.schedule_day !== vkuWeekday(d)) continue;
      const updated = s.updated_at ? Date.parse(s.updated_at) : NaN;
      entries.push({
        id: `${input.studentId}:${s.id}:${date}`,
        studentId: input.studentId,
        classSectionId: s.id,
        course: s.course_name,
        code: s.id,
        date,
        start: input.periods[s.start_period - 1].split('-')[0],
        end: input.periods[s.end_period - 1].split('-')[1],
        room: s.room ?? '',
        lecturer: s.lecturer ?? '',
        attendance: attended.has(`${s.id}:${date}`) ? 'confirmed' : 'not-marked',
        updatedAt: Number.isNaN(updated) ? 0 : updated,
        scheduled: true,
      });
    }
  }
  entries.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      toMinutes(a.start) - toMinutes(b.start) ||
      a.classSectionId.localeCompare(b.classSectionId),
  );
  return { entries, skipped };
}

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Lịch học cá nhân trong khoảng ngày: lấy các lớp học phần đang học của học kỳ
   * gần nhất (hoặc học kỳ được chỉ định) rồi trải theo thứ trong tuần.
   */
  async getStudentTimetable(
    studentId: string,
    query: { from?: string; to?: string; semester?: string } = {},
  ): Promise<TimetableEntry[]> {
    const id = String(studentId ?? '').trim();
    if (!id || id.length > 50) throw new BadRequestException('Mã sinh viên không hợp lệ');
    if (query.semester !== undefined && (!query.semester.trim() || query.semester.length > 50))
      throw new BadRequestException('semester không hợp lệ');
    const { from, to } = resolveRange(query.from, query.to);
    const periods = parsePeriods(this.config.get<string>('TIMETABLE_PERIODS'));
    const client = this.supabaseService.getClient();

    const enrollments = await client
      .from('enrollments')
      .select('class_section_id, semester, status')
      .eq('student_id', id);
    if (enrollments.error) this.fail('enrollments', enrollments.error.message);

    const active = (enrollments.data ?? []).filter(
      (e: any) => !INACTIVE_ENROLLMENT.has(String(e.status ?? '').toUpperCase()),
    );
    // Không có ngày bắt đầu/kết thúc học kỳ trong CSDL, nên chỉ dùng một học kỳ:
    // học kỳ được chỉ định, hoặc học kỳ có tên lớn nhất (mới nhất) mà sinh viên đang học.
    const semester =
      query.semester?.trim() ??
      active.map((e: any) => String(e.semester)).sort().at(-1);
    const sectionIds = [
      ...new Set(
        active
          .filter((e: any) => String(e.semester) === semester)
          .map((e: any) => String(e.class_section_id)),
      ),
    ];
    if (sectionIds.length === 0) return [];

    const [sections, attendance] = await Promise.all([
      client.from('class_sections').select('*').in('id', sectionIds),
      client
        .from('attendance')
        .select('class_section_id, session_date, status')
        .eq('student_id', id)
        .gte('session_date', from)
        .lte('session_date', to),
    ]);
    if (sections.error) this.fail('class_sections', sections.error.message);
    if (attendance.error) this.fail('attendance', attendance.error.message);

    const { entries, skipped } = buildEntries({
      studentId: id,
      sections: (sections.data ?? []) as SectionRow[],
      attendance: (attendance.data ?? []) as any[],
      from,
      to,
      periods,
    });
    if (skipped.length)
      this.logger.warn(`Bỏ qua lớp có thứ/tiết không hợp lệ: ${skipped.join(', ')}`);
    return entries;
  }

  private fail(table: string, message: string): never {
    this.logger.error(`Không đọc được ${table}: ${message}`);
    throw new ServiceUnavailableException('Chưa đọc được dữ liệu lịch học');
  }
}
