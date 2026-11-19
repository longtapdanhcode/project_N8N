import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_PERIODS,
  TimetableService,
  buildEntries,
  parsePeriods,
  resolveRange,
  todayInVietnam,
} from './timetable.service';

const section = (over: Record<string, unknown> = {}) => ({
  id: 'IT3010-01',
  course_name: 'Hệ thống phân tán',
  schedule_day: 2,
  start_period: 1,
  end_period: 3,
  ...over,
});

describe('timetable helpers', () => {
  it('default periods: tiết 1–3 là 07:00–09:30, tiết 6 bắt đầu 13:00', () => {
    expect(DEFAULT_PERIODS[0]).toBe('07:00-07:50');
    expect(DEFAULT_PERIODS[2]).toBe('08:40-09:30');
    expect(DEFAULT_PERIODS[5]).toBe('13:00-13:50');
    expect(DEFAULT_PERIODS).toHaveLength(10);
  });

  it('parsePeriods validates the override', () => {
    expect(parsePeriods('["06:30-07:15"]')).toEqual(['06:30-07:15']);
    expect(() => parsePeriods('not json')).toThrow();
    expect(() => parsePeriods('["7:00-8:00"]')).toThrow();
    expect(() => parsePeriods('[]')).toThrow();
  });

  it('resolveRange defaults to Monday–Sunday of the current week', () => {
    // 2026-11-19 là Thứ Năm.
    expect(resolveRange(undefined, undefined, '2026-11-19')).toEqual({
      from: '2026-11-16',
      to: '2026-11-22',
    });
    // Chủ nhật thuộc tuần bắt đầu từ Thứ Hai trước đó.
    expect(resolveRange(undefined, undefined, '2026-11-22').from).toBe('2026-11-16');
    expect(resolveRange('2026-11-01').to).toBe('2026-11-07');
  });

  it('resolveRange rejects bad input', () => {
    expect(() => resolveRange('2026-13-40')).toThrow(BadRequestException);
    expect(() => resolveRange('2026-11-10', '2026-11-01')).toThrow(BadRequestException);
    expect(() => resolveRange('2026-01-01', '2026-03-01')).toThrow(BadRequestException);
  });

  it('todayInVietnam uses UTC+7', () => {
    expect(todayInVietnam(new Date('2026-11-18T18:30:00Z'))).toBe('2026-11-19');
  });

  it('buildEntries spreads sections over matching weekdays with attendance', () => {
    const { entries, skipped } = buildEntries({
      studentId: '23IT001',
      sections: [
        section(),
        section({ id: 'IT3025-02', course_name: 'AI', schedule_day: 5, start_period: 7, end_period: 9, room: 'K.A301' }),
        section({ id: 'BAD', schedule_day: 9 }),
        section({ id: 'BAD2', start_period: 4, end_period: 2 }),
      ],
      attendance: [
        { class_section_id: 'IT3010-01', session_date: '2026-11-16', status: 'PRESENT' },
        { class_section_id: 'IT3025-02', session_date: '2026-11-19', status: 'ABSENT' },
      ],
      from: '2026-11-16',
      to: '2026-11-22',
      periods: DEFAULT_PERIODS,
    });
    expect(skipped).toEqual(['BAD', 'BAD2']);
    expect(entries).toEqual([
      expect.objectContaining({
        id: '23IT001:IT3010-01:2026-11-16',
        classSectionId: 'IT3010-01',
        date: '2026-11-16',
        start: '07:00',
        end: '09:30',
        room: '',
        attendance: 'confirmed',
        scheduled: true,
      }),
      expect.objectContaining({
        id: '23IT001:IT3025-02:2026-11-19',
        date: '2026-11-19',
        start: '13:50',
        end: '16:20',
        room: 'K.A301',
        attendance: 'not-marked',
      }),
    ]);
  });
});

describe('TimetableService', () => {
  function fakeClient(tables: Record<string, { data?: any[]; error?: { message: string } }>) {
    const calls: { table: string; filters: unknown[][] }[] = [];
    const client = {
      from(table: string) {
        const call = { table, filters: [] as unknown[][] };
        calls.push(call);
        const builder: any = {
          select: () => builder,
          then: (resolve: any) =>
            resolve({ data: tables[table]?.data ?? [], error: tables[table]?.error ?? null }),
        };
        for (const op of ['eq', 'in', 'gte', 'lte'])
          builder[op] = (...args: unknown[]) => {
            call.filters.push([op, ...args]);
            return builder;
          };
        return builder;
      },
    };
    return { client, calls };
  }

  const build = (tables: Parameters<typeof fakeClient>[0], periods?: string) => {
    const fake = fakeClient(tables);
    const service = new TimetableService(
      { getClient: () => fake.client } as any,
      { get: () => periods } as any,
    );
    return { service, calls: fake.calls };
  };

  it('uses only active enrollments of the latest semester', async () => {
    const { service, calls } = build({
      enrollments: {
        data: [
          { class_section_id: 'OLD-01', semester: '2025-2026-HK2', status: 'ENROLLED' },
          { class_section_id: 'IT3010-01', semester: '2026-2027-HK1', status: 'ENROLLED' },
          { class_section_id: 'DROP-01', semester: '2026-2027-HK1', status: 'DROPPED' },
        ],
      },
      class_sections: { data: [section()] },
      attendance: { data: [] },
    });
    const entries = await service.getStudentTimetable('23IT001', {
      from: '2026-11-16',
      to: '2026-11-22',
    });
    expect(entries.map((e) => e.id)).toEqual(['23IT001:IT3010-01:2026-11-16']);
    expect(calls[0].filters).toEqual([['eq', 'student_id', '23IT001']]);
    expect(calls[1].filters).toEqual([['in', 'id', ['IT3010-01']]]);
    expect(calls[2].filters).toEqual([
      ['eq', 'student_id', '23IT001'],
      ['gte', 'session_date', '2026-11-16'],
      ['lte', 'session_date', '2026-11-22'],
    ]);
  });

  it('returns an empty list without querying sections when nothing is enrolled', async () => {
    const { service, calls } = build({ enrollments: { data: [] } });
    expect(await service.getStudentTimetable('23IT001')).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('maps database errors to 503 instead of an empty timetable', async () => {
    const { service } = build({ enrollments: { error: { message: 'down' } } });
    await expect(service.getStudentTimetable('23IT001')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects an empty student id', async () => {
    const { service } = build({});
    await expect(service.getStudentTimetable('  ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
