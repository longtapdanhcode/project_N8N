import {
  CONTEXT_TURNS,
  FaqMemoryService,
  MAX_STORED_TURNS,
  searchQueryFor,
} from './faq-memory.service';

type Doc = { _id: string; role: string; userId: string; turns: any[]; expiresAt: Date };

/** Mô phỏng các thao tác Mongoose mà service dùng. */
function fakeModel() {
  const docs = new Map<string, Doc>();
  const matches = (d: Doc | undefined, f: any) =>
    !!d && d.role === f.role && d.userId === f.userId;
  return {
    docs,
    findOne: jest.fn((filter: any, projection: any) => ({
      lean: async () => {
        const d = docs.get(filter._id);
        if (!matches(d, filter)) return null;
        return { ...d!, turns: d!.turns.slice(projection.turns.$slice) };
      },
    })),
    updateOne: jest.fn(async (filter: any, update: any) => {
      const existing = docs.get(filter._id);
      if (existing && !matches(existing, filter)) throw new Error('E11000 duplicate key');
      const d = existing ?? { ...filter, turns: [] };
      const push = update.$push.turns;
      d.turns = [...d.turns, ...push.$each].slice(push.$slice);
      d.expiresAt = update.$set.expiresAt;
      docs.set(filter._id, d);
    }),
  };
}

const student = { role: 'student' as const, userId: '22IT001' };

describe('FaqMemoryService', () => {
  it('keeps no history for anonymous askers', async () => {
    const model = fakeModel();
    const memory = new FaqMemoryService(model as any);
    expect(await memory.open({})).toBeNull();
    expect(await memory.open({ userId: '22IT001' })).toBeNull();
  });

  it('starts a new conversation, then reuses it for the same user', async () => {
    const model = fakeModel();
    const memory = new FaqMemoryService(model as any);
    const first = await memory.open(student);
    expect(first?.history).toEqual([]);
    await memory.record(first, student, 'Học phí?', '10 triệu.');

    const next = await memory.open(student, first!.conversationId);
    expect(next).toEqual({
      conversationId: first!.conversationId,
      history: [{ question: 'Học phí?', answer: '10 triệu.' }],
    });
    const saved = model.docs.get(first!.conversationId)!;
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("never opens another user's conversation", async () => {
    const model = fakeModel();
    const memory = new FaqMemoryService(model as any);
    const mine = await memory.open(student);
    await memory.record(mine, student, 'Học phí?', '10 triệu.');

    const other = await memory.open(
      { role: 'student', userId: '22IT999' },
      mine!.conversationId,
    );
    expect(other?.conversationId).not.toBe(mine!.conversationId);
    expect(other?.history).toEqual([]);
    const teacher = await memory.open(
      { role: 'teacher', userId: '22IT001' },
      mine!.conversationId,
    );
    expect(teacher?.conversationId).not.toBe(mine!.conversationId);
  });

  it('ignores malformed ids without querying', async () => {
    const model = fakeModel();
    const memory = new FaqMemoryService(model as any);
    const session = await memory.open(student, { $ne: null });
    expect(session?.history).toEqual([]);
    await memory.open(student, 'abc');
    expect(model.findOne).not.toHaveBeenCalled();
  });

  it('returns only the latest turns and caps what is stored', async () => {
    const model = fakeModel();
    const memory = new FaqMemoryService(model as any);
    const session = await memory.open(student);
    for (let i = 1; i <= MAX_STORED_TURNS + 3; i++)
      await memory.record(session, student, `Câu ${i}`, `Đáp ${i}`);

    expect(model.docs.get(session!.conversationId)!.turns).toHaveLength(MAX_STORED_TURNS);
    const reopened = await memory.open(student, session!.conversationId);
    expect(reopened!.history).toHaveLength(CONTEXT_TURNS);
    expect(reopened!.history.at(-1)!.question).toBe(`Câu ${MAX_STORED_TURNS + 3}`);
  });

  it('answers as a new conversation when storage fails', async () => {
    const model = fakeModel();
    model.findOne.mockImplementation(() => ({
      lean: async () => {
        throw new Error('mongo down');
      },
    }));
    model.updateOne.mockRejectedValue(new Error('mongo down'));
    const memory = new FaqMemoryService(model as any);
    const session = await memory.open(student, '33333333-3333-4333-8333-333333333333');
    expect(session?.history).toEqual([]);
    await expect(memory.record(session, student, 'Hỏi', 'Đáp')).resolves.toBeUndefined();
  });
});

describe('searchQueryFor', () => {
  it('adds the previous question to follow-ups only', () => {
    expect(searchQueryFor('Học phí?', [])).toBe('Học phí?');
    expect(
      searchQueryFor('Còn học kỳ hè?', [
        { question: 'Câu cũ', answer: 'x' },
        { question: 'Học phí học kỳ 1?', answer: 'y' },
      ]),
    ).toBe('Học phí học kỳ 1?\nCòn học kỳ hè?');
  });
});
