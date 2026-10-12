import { useEffect, useState } from "react";
import {
  CalendarDays,
  GraduationCap,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { getGrades, USE_MOCK, type Grade, type Profile } from "./lib/api";
import {
  Registration,
  FAQ,
  Assignments,
  Attendance,
} from "./components/StudentServices";
import { Timetable } from "./components/Timetable";
import { SyncStatus } from "./components/SyncStatus";
import { startSync } from "./lib/sync";

export function Skeleton() {
  return (
    <div className="skeleton-list" role="status" aria-label="Đang tải">
      <div />
      <div />
      <div />
    </div>
  );
}

function Grades({ studentId }: { studentId: string }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = () => {
    setState("loading");
    void getGrades(studentId)
      .then((data) => {
        setGrades(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  };
  useEffect(load, [studentId]);
  return (
    <section>
      <div className="section-heading">
        <h2>Kết quả học tập</h2>
        <span className="muted">Học kỳ I</span>
      </div>
      <p className="help">
        Khi mất mạng, điểm số được lấy từ lần xem gần nhất trên thiết bị này.
      </p>
      {state === "loading" ? (
        <Skeleton />
      ) : state === "error" ? (
        <div className="empty error">
          <AlertCircle />
          <p>Chưa tải được điểm số. Kết nối mạng để tải dữ liệu lần đầu.</p>
          <button className="secondary" onClick={load}>
            Thử lại
          </button>
        </div>
      ) : grades.length === 0 ? (
        <div className="empty">Chưa có điểm trong học kỳ này.</div>
      ) : (
        <div className="list">
          {grades.map((grade) => (
            <div className="grade-row" key={grade.course}>
              <div>
                {grade.course}
                <small>{grade.credits} tín chỉ</small>
              </div>
              <strong>{grade.score.toFixed(1)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function App() {
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("vku-profile") || "null") || {
          studentId: "23IT112",
          email: "",
          semester: "2026-2027-1",
        }
      );
    } catch {
      return { studentId: "23IT112", email: "", semester: "2026-2027-1" };
    }
  });
  const [draft, setDraft] = useState(profile);
  const [online, setOnline] = useState(navigator.onLine);
  const [swError, setSwError] = useState(false);
  const [tab, setTab] = useState(USE_MOCK ? "schedule" : "attendance");
  useEffect(startSync, []);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const error = () => setSwError(true);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    window.addEventListener("sw-error", error);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      window.removeEventListener("sw-error", error);
    };
  }, []);
  return (
    <>
      <header>
        <a className="brand" href="/">
          VKU <span>Sinh viên</span>
        </a>
        <SyncStatus online={online} />
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Học tập</h1>
            <p className="muted">
              MSSV <span className="separator">/</span> {profile.studentId}
            </p>
          </div>
          <span className="semester">Học kỳ I · 2026–2027</span>
        </div>
        <details className="profile">
          <summary>Thông tin sinh viên</summary>
          <form
            className="service-form"
            onSubmit={(e) => {
              e.preventDefault();
              const saved = {
                ...draft,
                studentId: draft.studentId.trim(),
                email: draft.email.trim(),
              };
              localStorage.setItem("vku-profile", JSON.stringify(saved));
              setProfile(saved);
            }}
          >
            <p className="help">
              Thông tin dùng cho bản thử nghiệm, chưa thay thế đăng nhập.
            </p>
            <label className="field">
              MSSV
              <input
                required
                maxLength={100}
                value={draft.studentId}
                onChange={(e) =>
                  setDraft({ ...draft, studentId: e.target.value })
                }
              />
            </label>
            <label className="field">
              Email sinh viên
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>
            <label className="field">
              Học kỳ
              <input
                required
                value={draft.semester}
                onChange={(e) =>
                  setDraft({ ...draft, semester: e.target.value })
                }
              />
            </label>
            <button className="secondary">Lưu thông tin</button>
          </form>
        </details>
        {swError && (
          <p className="inline-error" role="alert">
            Chưa bật được chế độ offline. Hãy tải lại trang khi có mạng.
          </p>
        )}
        {!online && (
          <div className="notice">
            <WifiOff />
            <span>
              Bạn đang ngoại tuyến. Điểm danh sẽ được lưu và gửi khi có mạng trở
              lại.
            </span>
          </div>
        )}
        <nav aria-label="Chức năng">
          {USE_MOCK && (
            <button
              className={`tab ${tab === "schedule" ? "active" : ""}`}
              aria-current={tab === "schedule" ? "page" : undefined}
              onClick={() => setTab("schedule")}
            >
              <CalendarDays />
              Lịch học
            </button>
          )}
          <button
            className={`tab ${tab === "grades" ? "active" : ""}`}
            aria-current={tab === "grades" ? "page" : undefined}
            onClick={() => setTab("grades")}
          >
            <GraduationCap />
            Điểm số
          </button>
          {[
            ["attendance", "Điểm danh"],
            ["registration", "Đăng ký học phần"],
            ["faq", "Hỏi đáp"],
            ["assignments", "Bài tập"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`tab ${tab === id ? "active" : ""}`}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div key={`${tab}:${profile.studentId}`}>
          {tab === "grades" && <Grades studentId={profile.studentId} />}
          {tab === "schedule" && <Timetable />}
          {tab === "attendance" && <Attendance profile={profile} />}
          {tab === "registration" && <Registration profile={profile} />}
          {tab === "faq" && <FAQ profile={profile} />}
          {tab === "assignments" && <Assignments profile={profile} />}
        </div>
        <footer>
          <span>VKU · Cổng sinh viên</span>
          <span>
            {USE_MOCK ? "Dữ liệu minh họa" : "Kết nối hệ thống đào tạo"}
          </span>
        </footer>
      </main>
    </>
  );
}
