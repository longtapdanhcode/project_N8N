import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  askFAQ,
  getCourses,
  getSections,
  registerCourse,
  submitAssignment,
  getSubmission,
  getAttendanceHistory,
  getTheses,
  updateMilestone,
  type Course,
  type ClassSection,
  type Profile,
  type SubmissionReceipt,
  type AttendanceRecord,
  type StudentThesis,
} from "../lib/api";
import { db } from "../lib/db";
import { queueClassAttendance } from "../lib/syncQueue";
import { scheduleSync } from "../lib/sync";

const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Không thể kết nối. Vui lòng thử lại.";
export function Loading() {
  return (
    <div className="skeleton-list" role="status" aria-label="Đang tải">
      <div />
      <div />
    </div>
  );
}
export function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <p className="inline-error" role="alert">
      {error}
    </p>
  ) : null;
}

export function Registration({ profile }: { profile: Profile }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registeredIds, setRegisteredIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`vku-registered-${profile.studentId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [c, s] = await Promise.all([getCourses(), getSections()]);
      setCourses(c);
      setSections(s);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const register = async (section: ClassSection) => {
    if (!profile.studentId || !profile.email || !profile.semester) {
      setError(
        "Điền MSSV, email và học kỳ ở Thông tin sinh viên trước khi đăng ký.",
      );
      return;
    }
    setBusy(section.id);
    setError("");
    setNotice("");
    try {
      const result = await registerCourse(profile, section);
      setNotice(
        result.message ||
          "Máy chủ đã tiếp nhận đăng ký. Kết quả phụ thuộc kiểm tra sĩ số và điều kiện học phần.",
      );
      setRegisteredIds((prev) => {
        const next = prev.includes(section.id) ? prev : [...prev, section.id];
        try {
          localStorage.setItem(
            `vku-registered-${profile.studentId}`,
            JSON.stringify(next),
          );
        } catch {}
        return next;
      });
      setSections(await getSections());
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  };
  const visible = sections.filter((s) => !course || s.course_id === course);
  return (
    <section>
      <div className="section-heading">
        <h2>Đăng ký học phần</h2>
        <button
          className="secondary"
          disabled={loading || !!busy}
          onClick={() => void load()}
        >
          Tải lại
        </button>
      </div>
      <p className="help">
        Chọn lớp trong học kỳ {profile.semester}. Hệ thống kiểm tra môn tiên
        quyết và chỗ trống khi gửi đăng ký.
      </p>
      <label className="field">
        Môn học
        <select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">Tất cả môn học</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} · {c.course_name}
            </option>
          ))}
        </select>
      </label>
      <ErrorNotice error={error} />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <Loading />
      ) : !visible.length ? (
        <div className="empty">
          {error
            ? "Chưa tải được danh sách lớp."
            : "Chưa có lớp học phần phù hợp."}
        </div>
      ) : (
        <div className="list">
          {visible.map((s) => {
            const isRegistered = registeredIds.includes(s.id);
            const isFull = s.current_enrolled >= s.max_capacity;
            const disabled = !!busy || isRegistered || isFull;
            return (
              <div className="grade-row" key={s.id}>
                <div>
                  <b>{s.course_name}</b>
                  <small>
                    {s.id} · Thứ {s.schedule_day} · Tiết {s.start_period}–
                    {s.end_period}
                  </small>
                  <small>
                    {s.current_enrolled}/{s.max_capacity} sinh viên
                  </small>
                </div>
                <button
                  className={isRegistered ? "secondary" : "primary"}
                  disabled={disabled}
                  onClick={() => void register(s)}
                >
                  {busy === s.id
                    ? "Đang gửi…"
                    : isRegistered
                      ? "Đã đăng ký"
                      : isFull
                        ? "Đã đủ chỗ"
                        : "Đăng ký"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FAQ({ profile }: { profile: Profile }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Awaited<ReturnType<typeof askFAQ>>>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section>
      <h2>Hỏi đáp học vụ</h2>
      <p className="help">
        Tra cứu quy chế và hướng dẫn học tập từ kho tài liệu của trường.
      </p>
      <form
        className="service-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setAnswer(undefined);
          try {
            setAnswer(await askFAQ(question.trim(), profile.studentId));
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Câu hỏi
          <textarea
            required
            maxLength={4000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Điều kiện đăng ký học phần là gì?"
          />
        </label>
        <button className="primary" disabled={busy || !question.trim()}>
          {busy ? "Đang tra cứu…" : "Gửi câu hỏi"}
        </button>
      </form>
      <ErrorNotice error={error} />
      {busy ? (
        <Loading />
      ) : answer ? (
        <article className="response">
          <h3>Phản hồi</h3>
          <p className="prewrap">{answer.answer}</p>
          {answer.sources?.length ? (
            <>
              <h3>Nguồn tham khảo</h3>
              <ul>
                {answer.sources.map((c, i) => (
                  <li key={i}>{c.title}</li>
                ))}
              </ul>
            </>
          ) : null}
          {answer.needsEscalation && (
            <p className="help">
              Cần xác nhận thêm với cố vấn học tập trước khi thực hiện.
            </p>
          )}
        </article>
      ) : (
        <p className="help">Chưa có phản hồi. Nhập câu hỏi để bắt đầu.</p>
      )}
    </section>
  );
}

function SubmissionCard({ receipt }: { receipt: SubmissionReceipt }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await getSubmission(receipt);
      await db.submissions.update(receipt.submissionId, {
        status: result.status,
        feedback: result.feedback,
      });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (receipt.status !== "QUEUED") return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await getSubmission(receipt);
        if (disposed) return;
        await db.submissions.update(receipt.submissionId, {
          status: result.status,
          feedback: result.feedback,
        });
        if (result.status === "QUEUED") timer = setTimeout(poll, 5000);
      } catch (e) {
        if (!disposed) setError(message(e));
      }
    };
    timer = setTimeout(poll, 5000);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [receipt.submissionId, receipt.status, receipt.readToken]);
  const labels: Record<string, string> = {
    QUEUED: "Đang chờ nhận xét",
    COMPLETED: "Đã có nhận xét",
    FAILED: "Xử lý thất bại",
    QUEUE_FAILED: "Chưa đưa được vào hàng đợi",
  };
  return (
    <article className="response">
      <div className="section-heading">
        <h3>{receipt.title}</h3>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          {busy ? "Đang tải…" : "Kiểm tra kết quả"}
        </button>
      </div>
      <p className="help">{labels[receipt.status] || receipt.status}</p>
      <ErrorNotice error={error} />
      {receipt.feedback && (
        <>
          <p>
            <b>{receipt.feedback.score}/10</b> · Điểm tham khảo từ AI
          </p>
          <p className="prewrap">{receipt.feedback.summary}</p>
          {(
            [
              ["strengths", "Điểm tốt"],
              ["weaknesses", "Cần cải thiện"],
              ["suggestions", "Gợi ý"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <h3>{label}</h3>
              <ul>
                {receipt.feedback![key].map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </article>
  );
}

export function Assignments({ profile }: { profile: Profile }) {
  const receipts = useLiveQuery(
    () => db.submissions.where("studentId").equals(profile.studentId).toArray(),
    [profile.studentId],
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [criteria, setCriteria] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section>
      <h2>Nộp bài và nhận xét</h2>
      <p className="help">
        Bài nộp dạng văn bản. Kết quả được cập nhật tự động; lịch sử trên thiết
        bị này lưu mã truy cập riêng cho từng bài.
      </p>
      <form
        className="service-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (!profile.studentId)
              throw new Error(
                "Điền MSSV ở Thông tin sinh viên trước khi nộp bài.",
              );
            const lines = criteria
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            if (lines.length > 20 || lines.some((s) => s.length > 1000))
              throw new Error("Tối đa 20 tiêu chí, mỗi tiêu chí 1.000 ký tự.");
            const result = await submitAssignment({
              studentId: profile.studentId,
              assignmentTitle: title.trim(),
              content: content.trim(),
              criteria: lines,
            });
            await db.submissions.put({
              ...result,
              title,
              studentId: profile.studentId,
            });
            setTitle("");
            setContent("");
            setCriteria("");
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Tên bài tập
          <input
            required
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="field">
          Nội dung bài
          <textarea
            required
            maxLength={30000}
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <label className="field">
          Tiêu chí đánh giá (mỗi dòng một tiêu chí)
          <textarea
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
          />
        </label>
        <button
          className="primary"
          disabled={busy || !title.trim() || !content.trim()}
        >
          {busy ? "Đang nộp…" : "Nộp bài"}
        </button>
      </form>
      <ErrorNotice error={error} />
      <h3>Bài đã nộp trên thiết bị</h3>
      {!receipts ? (
        <Loading />
      ) : !receipts.length ? (
        <div className="empty">Chưa có bài nộp.</div>
      ) : (
        receipts.map((r) => <SubmissionCard key={r.submissionId} receipt={r} />)
      )}
    </section>
  );
}

export function Attendance({ profile }: { profile: Profile }) {
  const sections = useLiveQuery(() => db.sections.toArray());
  const queued = useLiveQuery(() => db.syncQueue.toArray());
  const lessons = useLiveQuery(
    () =>
      db.timetable.filter((l) => l.studentId === profile.studentId).toArray(),
    [profile.studentId],
  );
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        getSections().then((s) =>
          db.transaction("rw", db.sections, async () => {
            await db.sections.clear();
            await db.sections.bulkPut(s);
          }),
        ),
        getAttendanceHistory(profile.studentId).then((h) => setHistory(h.data)),
      ]);
      const failed = results.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void load();
  }, [profile.studentId]);
  return (
    <section>
      <div className="section-heading">
        <h2>Điểm danh</h2>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          Tải lại
        </button>
      </div>
      <p className="help">
        Chọn đúng lớp và ngày học. Khi mất mạng, phiếu điểm danh được giữ trên
        thiết bị đến khi máy chủ xác nhận.
      </p>
      <ErrorNotice error={error} />
      {!sections ? (
        <Loading />
      ) : (
        <form
          className="service-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setBusy(true);
            try {
              const s = sections.find((s) => s.id === sectionId);
              if (!s || !profile.studentId)
                throw new Error("Chọn lớp và điền MSSV trước khi điểm danh.");
              let deviceId = localStorage.getItem("vku-device-id");
              if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem("vku-device-id", deviceId);
              }

              await queueClassAttendance(profile.studentId, s, date, deviceId);
              scheduleSync();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Lớp học phần
            <select
              required
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              <option value="">Chọn lớp</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.course_name}
                </option>
              ))}
            </select>
          </label>
          {!sections.length && (
            <p className="help">
              Chưa có danh sách lớp. Kết nối mạng và bấm Tải lại.
            </p>
          )}
          <label className="field">
            Ngày học
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !sectionId}>
            Xác nhận có mặt
          </button>
        </form>
      )}
      <h3>Phiếu trên thiết bị</h3>
      {!lessons ? (
        <Loading />
      ) : !lessons.length ? (
        <div className="empty">Chưa có phiếu điểm danh.</div>
      ) : (
        <div className="list">
          {lessons.map((l) => (
            <div className="grade-row" key={l.id}>
              <div>
                {l.course}
                <small>
                  {l.code} · {l.date}
                </small>
              </div>
              <span>
                {l.attendance === "confirmed" ? "Đã đồng bộ" : "Chờ đồng bộ"}
                {queued?.find((q) => q.entityId === l.id)?.lastError && (
                  <small className="inline-error">
                    Chưa gửi được. Bấm Thử lại ở đầu trang khi có mạng.
                  </small>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      <h3>Lịch sử máy chủ (50 phiếu gần nhất)</h3>
      {!history.length ? (
        <p className="help">Chưa có lịch sử được tải.</p>
      ) : (
        <div className="list">
          {history.map((h, i) => (
            <div className="grade-row" key={i}>
              <span>
                {h.class_section_id}
                <small>{h.session_date}</small>
              </span>
              <span>
                {h.status === "PRESENT"
                  ? "Có mặt"
                  : h.status === "ABSENT"
                    ? "Vắng"
                    : h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Theses({ profile }: { profile: Profile }) {
  const [thesis, setThesis] = useState<StudentThesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyMilestoneId, setBusyMilestoneId] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const loadThesis = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getTheses(profile.studentId);
      const found =
        list.find((t) => t.studentId === profile.studentId) || list[0] || null;
      setThesis(found);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadThesis();
  }, [profile.studentId]);

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (!thesis) return;
    setBusyMilestoneId(milestoneId);
    setError("");
    setActionNotice("");
    try {
      const res = await updateMilestone(thesis._id, milestoneId, "COMPLETED");
      if (res.success && res.thesis) {
        setThesis(res.thesis);
        setActionNotice(
          "Đã cập nhật mốc đồ án thành công và kích hoạt phân tích AI.",
        );
      } else {
        await loadThesis();
        setActionNotice("Đã gửi cập nhật mốc đồ án.");
      }
    } catch (e) {
      setError(message(e));
      await loadThesis().catch(() => {});
    } finally {
      setBusyMilestoneId("");
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Đã hoàn thành";
      case "IN_PROGRESS":
        return "Đang thực hiện";
      case "PENDING":
      default:
        return "Chưa bắt đầu";
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "";
    try {
      return new Date(isoStr).toLocaleDateString("vi-VN");
    } catch {
      return isoStr;
    }
  };

  return (
    <section>
      <div className="section-heading">
        <h2>Đồ án tốt nghiệp</h2>
        <button
          className="secondary"
          disabled={loading || !!busyMilestoneId}
          onClick={() => void loadThesis()}
        >
          Tải lại
        </button>
      </div>
      <p className="help">
        Theo dõi tiến độ đề tài và nhận xét tự động từ Cố vấn AI cho từng mốc
        thời gian.
      </p>

      <ErrorNotice error={error} />
      {actionNotice && (
        <p className="notice" role="status">
          {actionNotice}
        </p>
      )}

      {loading ? (
        <Loading />
      ) : !thesis ? (
        <div className="empty">
          {error
            ? "Chưa tải được thông tin đồ án."
            : "Chưa có dữ liệu đồ án tốt nghiệp cho sinh viên này."}
        </div>
      ) : (
        <>
          <article className="response">
            <div className="section-heading">
              <h3>{thesis.title}</h3>
              <span className="semester">
                Tiến độ: <strong>{thesis.progressPercent}%</strong>
              </span>
            </div>
            {thesis.description && (
              <p className="muted">{thesis.description}</p>
            )}
            <div className="lesson-meta">
              <span>
                Sinh viên: <b>{thesis.studentName}</b> ({thesis.studentId})
              </span>
              {thesis.advisorName && (
                <span>
                  GVHD: <b>{thesis.advisorName}</b>
                </span>
              )}
              {thesis.department && <span>{thesis.department}</span>}
              <span>
                Điều kiện bảo vệ:{" "}
                <b
                  style={{
                    color:
                      thesis.defenseStatus === "ELIGIBLE"
                        ? "var(--primary)"
                        : "var(--muted)",
                  }}
                >
                  {thesis.defenseStatus === "ELIGIBLE"
                    ? "Đủ điều kiện"
                    : "Chưa đủ điều kiện"}
                </b>
              </span>
            </div>
          </article>

          <h3>Danh sách các mốc tiến độ (Milestones)</h3>
          {!thesis.milestones || thesis.milestones.length === 0 ? (
            <div className="empty">Chưa có mốc tiến độ nào.</div>
          ) : (
            <div className="list">
              {thesis.milestones.map((m) => {
                const isCompleted = m.status === "COMPLETED";
                const isBusy = busyMilestoneId === m._id;
                return (
                  <div className="grade-row" key={m._id} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "16px",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <b>{m.title}</b>
                        <small>
                          Hạn chót: {formatDate(m.deadline)} · Trạng thái:{" "}
                          <span
                            style={{
                              color: isCompleted
                                ? "var(--primary)"
                                : "var(--muted)",
                              fontWeight: 500,
                            }}
                          >
                            {getStatusLabel(m.status)}
                          </span>
                        </small>
                      </div>

                      <div>
                        {isCompleted ? (
                          <button className="secondary" disabled>
                            Đã hoàn thành
                          </button>
                        ) : (
                          <button
                            className="primary"
                            disabled={isBusy || !!busyMilestoneId}
                            onClick={() => void handleCompleteMilestone(m._id)}
                          >
                            {isBusy ? "Đang xử lý & AI…" : "Hoàn thành"}
                          </button>
                        )}
                      </div>
                    </div>

                    {m.aiFeedback && (
                      <div
                        style={{
                          marginTop: "12px",
                          padding: "12px 16px",
                          background: "var(--bg)",
                          borderLeft: "3px solid var(--primary)",
                          borderRadius: "4px",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            fontSize: "var(--text-xs)",
                            color: "var(--primary)",
                            marginBottom: "4px",
                          }}
                        >
                          Nhận xét từ Cố vấn AI:
                        </strong>
                        <p className="prewrap" style={{ margin: 0 }}>
                          {m.aiFeedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

