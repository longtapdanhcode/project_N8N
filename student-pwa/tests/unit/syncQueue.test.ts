import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudentDB, type SyncItem } from "../../src/lib/db";
import {
  enqueueMutation,
  flushQueue,
  queueAttendance,
} from "../../src/lib/syncQueue";

let db: StudentDB;
beforeEach(() => {
  db = new StudentDB(`test-${crypto.randomUUID()}`);
});
afterEach(async () => {
  await db.delete();
});
const mutation = (id: string, method: "POST" | "PUT" = "POST") => ({
  id,
  method,
  url: "/api/attendance",
  body: { lessonId: id },
});

describe("persistent FIFO sync queue", () => {
  it("sends oldest to newest, including writes created in the same millisecond", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      await enqueueMutation(mutation("z"), db);
      await enqueueMutation(mutation("a", "PUT"), db);
    } finally {
      vi.restoreAllMocks();
    }
    const send = vi.fn(async (_item: SyncItem) => {});
    expect(await flushQueue(db, send)).toEqual({
      sent: 2,
      failed: false,
      busy: false,
    });
    expect(send.mock.calls.map(([item]) => item.id)).toEqual(["z", "a"]);
    expect(send.mock.calls[1][0].method).toBe("PUT");
    expect(await db.syncQueue.count()).toBe(0);
  });
  it("increments retries and stops at a failed head without losing later items", async () => {
    await enqueueMutation(mutation("first"), db);
    await enqueueMutation(mutation("second"), db);
    const fail = vi.fn(async () => {
      throw new Error("HTTP 503");
    });
    expect((await flushQueue(db, fail)).failed).toBe(true);
    expect(fail).toHaveBeenCalledTimes(1);
    expect(await db.syncQueue.get("first")).toMatchObject({
      retries: 1,
      lastError: "HTTP 503",
    });
    expect(await db.syncQueue.count()).toBe(2);
    const retry = vi.fn(async (_item: SyncItem) => {});
    await flushQueue(db, retry);
    expect(retry.mock.calls.map(([item]) => item.id)).toEqual([
      "first",
      "second",
    ]);
    expect(retry.mock.calls[0][0].retries).toBe(1);
    expect(await db.syncQueue.count()).toBe(0);
  });
  it("does not send duplicates when separate DB connections flush concurrently", async () => {
    await enqueueMutation(mutation("one"), db);
    await enqueueMutation(mutation("two"), db);
    const secondConnection = new StudentDB(db.name);
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const send = vi.fn(async () => {
      started();
      await blocked;
    });
    try {
      const first = flushQueue(db, send);
      await entered;
      expect((await flushQueue(secondConnection, send)).busy).toBe(true);
      release();
      await first;
      expect(send).toHaveBeenCalledTimes(2);
      expect(await db.syncQueue.count()).toBe(0);
    } finally {
      release();
      secondConnection.close();
    }
  });
  it("recovers an expired worker lease", async () => {
    await enqueueMutation(mutation("abandoned"), db);
    await db.syncQueue.update("abandoned", {
      leaseOwner: "dead-worker",
      leaseUntil: 99,
    });
    const send = vi.fn(async () => {});
    expect((await flushQueue(db, send, () => 100)).sent).toBe(1);
  });
  it("retains the same idempotency key after a lost server response", async () => {
    await enqueueMutation(mutation("stable-id"), db);
    const applied = new Set<string>();
    let requests = 0;
    const send = async (item: SyncItem) => {
      applied.add(item.id);
      requests++;
      if (requests === 1) throw new Error("Response lost after server commit");
    };
    await flushQueue(db, send);
    await flushQueue(db, send);
    expect(requests).toBe(2);
    expect(applied.size).toBe(1);
    expect(await db.syncQueue.count()).toBe(0);
  });
  it("atomically marks pending and ignores duplicate attendance clicks", async () => {
    await db.timetable.put({
      id: "lesson",
      course: "Web",
      code: "IT301",
      date: "2026-10-12",
      start: "07:00",
      end: "09:30",
      room: "A301",
      lecturer: "Trần Quốc Huy",
      attendance: "not-marked",
      updatedAt: 0,
    });
    await Promise.all([
      queueAttendance("lesson", db),
      queueAttendance("lesson", db),
    ]);
    expect(await db.syncQueue.count()).toBe(1);
    expect((await db.timetable.get("lesson"))?.attendance).toBe("pending");
    await flushQueue(db, async () => {});
    expect((await db.timetable.get("lesson"))?.attendance).toBe("confirmed");
    await queueAttendance("lesson", db);
    expect(await db.syncQueue.count()).toBe(0);
  });
  it("keeps failed writes through a database close/reopen", async () => {
    await enqueueMutation(mutation("persist"), db);
    await flushQueue(db, async () => {
      throw new Error("offline");
    });
    db.close();
    await db.open();
    expect(await db.syncQueue.get("persist")).toMatchObject({ retries: 1 });
    await flushQueue(db, async () => {});
    expect(await db.syncQueue.count()).toBe(0);
  });
});
