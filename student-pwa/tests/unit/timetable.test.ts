import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentDB, type TimetableEntry } from "../../src/lib/db";
import { refreshTimetable, weekLabel } from "../../src/lib/timetable";

let db: StudentDB;
beforeEach(() => {
  db = new StudentDB(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await db.delete();
});

const lesson = (id: string, over: Partial<TimetableEntry> = {}) =>
  ({
    id,
    studentId: "23IT001",
    classSectionId: "IT3010-01",
    course: "Hệ thống phân tán",
    code: "IT3010-01",
    date: "2026-11-16",
    start: "07:00",
    end: "09:30",
    room: "",
    lecturer: "",
    attendance: "not-marked",
    updatedAt: 0,
    scheduled: true,
    ...over,
  }) as TimetableEntry;

const serve = (entries: TimetableEntry[]) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(entries), { status: 200 })),
  );

describe("refreshTimetable with backend lessons", () => {
  it("replaces stale scheduled lessons but keeps manual and pending ones", async () => {
    await db.timetable.bulkPut([
      lesson("stale"),
      lesson("pending-stale", { attendance: "pending" }),
      lesson("manual", { scheduled: undefined }),
    ]);
    await db.syncQueue.put({
      id: "q1",
      method: "POST",
      url: "/api/attendance/offline-sync",
      body: {},
      createdAt: 1,
      retries: 0,
      entityId: "pending-stale",
    });
    serve([lesson("fresh")]);
    await refreshTimetable(db);
    expect((await db.timetable.toArray()).map((l) => l.id).sort()).toEqual([
      "fresh",
      "manual",
      "pending-stale",
    ]);
  });

  it("does not downgrade a lesson already confirmed on this device", async () => {
    await db.timetable.put(lesson("same", { attendance: "confirmed" }));
    serve([lesson("same")]);
    await refreshTimetable(db);
    expect((await db.timetable.get("same"))?.attendance).toBe("confirmed");
  });

  it("surfaces backend errors instead of clearing the saved timetable", async () => {
    await db.timetable.put(lesson("kept"));
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: "Chưa đọc được dữ liệu lịch học" }), {
            status: 503,
          }),
      ),
    );
    await expect(refreshTimetable(db)).rejects.toThrow("Chưa đọc được");
    expect(await db.timetable.get("kept")).toBeDefined();
  });
});

describe("weekLabel", () => {
  it("labels the Monday–Sunday week of a date", () => {
    expect(weekLabel("2026-10-14")).toBe("12–18 tháng 10, 2026");
    expect(weekLabel("2026-11-19")).toBe("16–22 tháng 11, 2026");
    expect(weekLabel("2026-11-01")).toBe("26/10 – 1/11, 2026");
    expect(weekLabel("2026-12-31")).toBe("28/12/2026 – 3/1/2027");
  });
});
