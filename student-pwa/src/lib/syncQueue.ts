import { db, type StudentDB, type SyncItem } from "./db";
import { apiUrl, sendMutation } from "./api";

const LEASE_MS = 30_000; // HTTP timeout is 10s. Expiry recovers a killed tab/worker.
export interface FlushResult {
  sent: number;
  failed: boolean;
  busy: boolean;
}
type Sender = (item: SyncItem) => Promise<unknown>;

export async function enqueueMutation(
  input: Pick<SyncItem, "method" | "url" | "body"> &
    Partial<Pick<SyncItem, "id" | "entityId">>,
  database: StudentDB = db,
) {
  return database.transaction("rw", database.syncQueue, async () => {
    const id = input.id || crypto.randomUUID();
    if (await database.syncQueue.get(id)) return id;
    const last = await database.syncQueue.orderBy("[createdAt+id]").last();
    await database.syncQueue.add({
      ...input,
      id,
      createdAt: Math.max(Date.now(), (last?.createdAt || 0) + 1),
      retries: 0,
    });
    return id;
  });
}

export async function queueAttendance(
  entityId: string,
  database: StudentDB = db,
) {
  // Atomic pending marker + enqueue; repeated clicks/tabs cannot create duplicate attendance.
  return database.transaction(
    "rw",
    database.timetable,
    database.syncQueue,
    async () => {
      const lesson = await database.timetable.get(entityId);
      if (!lesson) throw new Error("Không tìm thấy buổi học trên thiết bị.");
      if (lesson.attendance !== "not-marked") return;
      await enqueueMutation(
        {
          method: "POST",
          url: apiUrl(
            lesson.classSectionId ? "attendance/offline-sync" : "attendance",
          ),
          entityId,
          body: lesson.classSectionId
            ? {
                device_id: lesson.deviceId || `pwa-${crypto.randomUUID()}`,
                records: [
                  {
                    student_id: lesson.studentId,
                    class_section_id: lesson.classSectionId,
                    session_date: lesson.date,
                    status: "PRESENT",
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : { studentId: "23IT112", lessonId: entityId, attended: true },
        },
        database,
      );
      await database.timetable.update(entityId, { attendance: "pending" });
    },
  );
}

export async function queueClassAttendance(
  studentId: string,
  section: import("./api").ClassSection,
  date: string,
  deviceId: string,
  database: StudentDB = db,
) {
  if (!studentId.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("MSSV hoặc ngày học không hợp lệ.");
  const id = `${studentId}:${section.id}:${date}`;
  await database.transaction(
    "rw",
    database.timetable,
    database.syncQueue,
    async () => {
      if (!(await database.timetable.get(id)))
        await database.timetable.add({
          id,
          studentId,
          classSectionId: section.id,
          deviceId,
          course: section.course_name,
          code: section.id,
          date,
          start: "",
          end: "",
          room: "",
          lecturer: "",
          attendance: "not-marked",
          updatedAt: Date.now(),
        });
      await queueAttendance(id, database);
    },
  );
}

export async function flushQueue(
  database: StudentDB = db,
  send: Sender = sendMutation,
  now = () => Date.now(),
): Promise<FlushResult> {
  const owner = crypto.randomUUID();
  const result: FlushResult = { sent: 0, failed: false, busy: false };
  while (true) {
    // Claim ONLY the oldest row in an atomic transaction across tabs and workers.
    // A busy/failed head is never skipped: later mutations may depend on it.
    const claim = await database.transaction(
      "rw",
      database.syncQueue,
      async () => {
        const head = await database.syncQueue.orderBy("[createdAt+id]").first();
        if (!head) return { kind: "empty" as const };
        if (head.leaseOwner && (head.leaseUntil || 0) > now())
          return { kind: "busy" as const };
        await database.syncQueue.update(head.id, {
          leaseOwner: owner,
          leaseUntil: now() + LEASE_MS,
        });
        return { kind: "item" as const, item: head };
      },
    );
    if (claim.kind === "empty") return result;
    if (claim.kind === "busy") return { ...result, busy: true };
    const item = claim.item;
    try {
      await send(item);
      await database.transaction(
        "rw",
        database.syncQueue,
        database.timetable,
        async () => {
          const current = await database.syncQueue.get(item.id);
          if (current?.leaseOwner !== owner) return;
          if (item.entityId)
            await database.timetable.update(item.entityId, {
              attendance: "confirmed",
              updatedAt: now(),
            });
          await database.syncQueue.delete(item.id);
        },
      );
      result.sent++;
    } catch (error) {
      await database.transaction("rw", database.syncQueue, async () => {
        const current = await database.syncQueue.get(item.id);
        if (current?.leaseOwner === owner)
          await database.syncQueue.update(item.id, {
            retries: current.retries + 1,
            lastError:
              error instanceof Error ? error.message : "Không thể gửi dữ liệu",
            leaseOwner: undefined,
            leaseUntil: undefined,
          });
      });
      return { ...result, failed: true };
    }
  }
}
