import { db, type StudentDB } from "./db";
import { getTimetable } from "./api";

// Fetch outside the IndexedDB transaction: network awaits must not hold an IDB transaction open.
export async function refreshTimetable(database: StudentDB = db) {
  const incoming = await getTimetable();
  await database.transaction(
    "rw",
    database.timetable,
    database.syncQueue,
    async () => {
      const pending = new Set(
        (await database.syncQueue.toArray()).map((item) => item.entityId),
      );
      const existing = await database.timetable.toArray();
      const ids = new Set(incoming.map((item) => item.id));
      await database.timetable.bulkDelete(
        existing
          .filter(
            (item) =>
              !item.classSectionId &&
              !ids.has(item.id) &&
              !pending.has(item.id),
          )
          .map((item) => item.id),
      );
      const confirmed = new Set(
        existing
          .filter((item) => item.attendance === "confirmed")
          .map((item) => item.id),
      );
      await database.timetable.bulkPut(
        incoming.map((item) => ({
          ...item,
          attendance: pending.has(item.id)
            ? "pending"
            : confirmed.has(item.id)
              ? "confirmed"
              : item.attendance,
        })),
      );
    },
  );
}
