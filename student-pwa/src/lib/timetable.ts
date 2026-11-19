import { db, type StudentDB, type TimetableEntry } from "./db";
import { getTimetable } from "./api";

// Buổi thuộc lịch học (từ backend hoặc dữ liệu mẫu), khác buổi tự thêm ở mục Điểm danh.
export const isTimetableLesson = (item: TimetableEntry) =>
  item.scheduled === true || !item.classSectionId;

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Nhãn tuần (Thứ Hai–Chủ nhật) chứa ngày đã cho, ví dụ "12–18 tháng 10, 2026". */
export function weekLabel(date: string) {
  const day = new Date(`${date}T12:00:00`);
  const monday = new Date(day);
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const [m1, m2] = [monday.getMonth() + 1, sunday.getMonth() + 1];
  const [y1, y2] = [monday.getFullYear(), sunday.getFullYear()];
  if (y1 !== y2)
    return `${monday.getDate()}/${m1}/${y1} – ${sunday.getDate()}/${m2}/${y2}`;
  if (m1 !== m2)
    return `${monday.getDate()}/${m1} – ${sunday.getDate()}/${m2}, ${y2}`;
  return `${monday.getDate()}–${sunday.getDate()} tháng ${m1}, ${y1}`;
}

export const todayIso = () => isoDate(new Date());

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
              isTimetableLesson(item) &&
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
