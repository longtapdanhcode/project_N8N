import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SubmissionListService, parseListQuery } from './submission-list.service';

/** Model giả: ghi lại filter/sort/skip/limit, trả dữ liệu cố định. */
function fakeModel(rows: any[], calls: any[] = []) {
  const chain = (result: any, call: any) => {
    const q: any = {
      sort: (s: any) => ((call.sort = s), q),
      skip: (n: number) => ((call.skip = n), q),
      limit: (n: number) => ((call.limit = n), q),
      lean: () => q,
      exec: async () => result,
    };
    return q;
  };
  return {
    calls,
    find: (filter: any, projection?: any) => {
      const call = { op: 'find', filter, projection };
      calls.push(call);
      return chain(rows, call);
    },
    countDocuments: (filter: any) => {
      calls.push({ op: 'count', filter });
      return { exec: async () => rows.length };
    },
  };
}

const submission = {
  _id: 's1',
  studentId: '23IT001',
  assignmentTitle: 'REST API',
  content: 'Nội dung',
  criteria: ['Đúng yêu cầu'],
  status: 'COMPLETED',
  feedback: { summary: 'Tốt', score: 8, strengths: ['Rõ'], weaknesses: [], suggestions: [] },
  createdAt: new Date('2026-11-18T01:00:00Z'),
  updatedAt: new Date('2026-11-18T02:00:00Z'),
};

describe('parseListQuery', () => {
  it('applies defaults and clamps paging', () => {
    expect(parseListQuery({ page: '0', pageSize: '500' })).toMatchObject({
      page: 1,
      pageSize: 100,
      sort: { createdAt: -1, _id: 1 },
    });
  });

  it('maps score to feedback.score and treats ALL as no filter', () => {
    const q = parseListQuery({ sortBy: 'score', sortOrder: 'asc', status: 'ALL' });
    expect(q.sort).toEqual({ 'feedback.score': 1, _id: 1 });
    expect(q.status).toBeUndefined();
  });

  it('rejects unknown sort fields, statuses and orders', () => {
    expect(() => parseListQuery({ sortBy: 'readTokenHash' })).toThrow(BadRequestException);
    expect(() => parseListQuery({ status: 'PENDING' })).toThrow(BadRequestException);
    expect(() => parseListQuery({ sortOrder: 'sideways' })).toThrow(BadRequestException);
    expect(() => parseListQuery({ search: 'x'.repeat(101) })).toThrow(BadRequestException);
  });
});

describe('SubmissionListService', () => {
  it('returns a page with student names and ISO dates', async () => {
    const subs = fakeModel([submission]);
    const students = fakeModel([{ _id: '23IT001', full_name: 'Nguyễn Văn A' }]);
    const service = new SubmissionListService(subs as any, students as any);

    const result = await service.list({ page: '2', pageSize: '10', status: 'completed' });

    expect(result).toMatchObject({ total: 1, page: 2, pageSize: 10, totalPages: 1 });
    expect(result.data[0]).toMatchObject({
      submissionId: 's1',
      studentName: 'Nguyễn Văn A',
      createdAt: '2026-11-18T01:00:00.000Z',
      feedback: { score: 8 },
    });
    const find = subs.calls.find((c) => c.op === 'find');
    expect(find).toMatchObject({ filter: { status: 'COMPLETED' }, skip: 10, limit: 10 });
  });

  it('searches title, MSSV and matching student names with an escaped regex', async () => {
    const subs = fakeModel([]);
    const students = fakeModel([{ _id: '23IT009' }]);
    const service = new SubmissionListService(subs as any, students as any);

    await service.list({ search: 'a.b' });

    const nameLookup = students.calls[0];
    expect(String(nameLookup.filter.full_name)).toBe('/a\\.b/i');
    const filter = subs.calls.find((c) => c.op === 'count').filter;
    expect(filter.$or).toHaveLength(3);
    expect(filter.$or[2]).toEqual({ studentId: { $in: ['23IT009'] } });
  });

  it('leaves a missing name or score empty instead of inventing one', async () => {
    const subs = fakeModel([{ ...submission, feedback: { summary: '' } }]);
    const service = new SubmissionListService(subs as any, fakeModel([]) as any);
    const [row] = (await service.list()).data;
    expect(row.studentName).toBeNull();
    expect(row.feedback?.score).toBeNull();
  });

  it('maps database errors to 503', async () => {
    const broken = {
      countDocuments: () => ({ exec: async () => Promise.reject(new Error('down')) }),
      find: () => fakeModel([]).find({}),
    };
    const service = new SubmissionListService(broken as any, fakeModel([]) as any);
    await expect(service.list()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
