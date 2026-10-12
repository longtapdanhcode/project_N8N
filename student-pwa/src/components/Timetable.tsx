import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { MapPin, RefreshCw, AlertCircle, Check, Clock3 } from "lucide-react";
import { db } from "../lib/db";
import { refreshTimetable } from "../lib/timetable";
import { queueAttendance } from "../lib/syncQueue";
import { scheduleSync } from "../lib/sync";

export function Timetable() {
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const entries = useLiveQuery(() =>
    db.timetable
      .orderBy("[date+start]")
      .filter((item) => !item.classSectionId)
      .toArray(),
  );
  const queue = useLiveQuery(() => db.syncQueue.toArray());
  const markAttendance = async (id: string) => {
    try {
      await queueAttendance(id);
      scheduleSync();
    } catch {
      setError(
        "Chưa lưu được điểm danh. Kiểm tra dung lượng thiết bị và thử lại.",
      );
    }
  };
  const refresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await refreshTimetable();
    } catch {
      setError("Chưa cập nhật được lịch. Bạn vẫn có thể xem bản đã lưu.");
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    // Read IndexedDB first; only then refresh the network copy.
    void db.timetable
      .count()
      .then(() => {
        if (navigator.onLine) void refresh();
      })
      .catch(() =>
        setError(
          "Không thể mở bộ nhớ trên thiết bị. Hãy kiểm tra quyền lưu trữ của trình duyệt.",
        ),
      );
    const online = () => void refresh();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  return (
    <section aria-label="Lịch học">
      <div className="section-heading">
        <div>
          <h2>Lịch học trong tuần</h2>
          <p className="help">12–18 tháng 10, 2026</p>
        </div>
        <button
          className="secondary icon-button"
          onClick={() => void refresh()}
          disabled={refreshing || !navigator.onLine}
        >
          <RefreshCw className={refreshing ? "spin" : ""} />
          Cập nhật
        </button>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          <AlertCircle />
          {error}
        </p>
      )}
      {entries === undefined || (entries.length === 0 && refreshing) ? (
        <div className="skeleton-list" role="status" aria-label="Đang tải lịch">
          <div />
          <div />
          <div />
        </div>
      ) : entries.length === 0 ? (
        <div className="empty">
          Chưa có lịch đã lưu. Kết nối mạng và chọn Cập nhật để tải lịch học.
        </div>
      ) : (
        <div className="schedule-list">
          {entries.map((entry, index) => (
            <div key={entry.id}>
              {(index === 0 || entries[index - 1].date !== entry.date) && (
                <h3 className="day-heading">
                  {new Intl.DateTimeFormat("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  }).format(new Date(`${entry.date}T12:00:00`))}
                </h3>
              )}
              <article className="lesson" aria-label={entry.course}>
                <div className="lesson-time">
                  <strong>{entry.start}</strong>
                  <span>{entry.end}</span>
                </div>
                <div className="lesson-detail">
                  <h3>{entry.course}</h3>
                  <p>{entry.code}</p>
                  <div className="lesson-meta">
                    <span>
                      <MapPin />
                      {entry.room}
                    </span>
                    <span>{entry.lecturer}</span>
                  </div>
                </div>
                <div className="lesson-action">
                  {entry.attendance === "pending" ? (
                    <span
                      className={`row-status ${queue?.some((item) => item.entityId === entry.id && item.lastError) ? "error" : ""}`}
                    >
                      <Clock3 />
                      Chờ đồng bộ
                    </span>
                  ) : entry.attendance === "confirmed" ? (
                    <span className="row-status">
                      <Check />
                      Đã điểm danh
                    </span>
                  ) : (
                    <button
                      className="primary"
                      onClick={() => void markAttendance(entry.id)}
                    >
                      Điểm danh
                    </button>
                  )}
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
      {entries && entries.length > 0 && (
        <p className="storage-note">
          Lịch học đã lưu trên thiết bị · Có thể xem khi ngoại tuyến
        </p>
      )}
    </section>
  );
}
