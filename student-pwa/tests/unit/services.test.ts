import { afterEach, describe, expect, it, vi } from "vitest";
import {
  askFAQ,
  getSubmission,
  registerCourse,
  sendMutation,
  getGrades,
  type ClassSection,
} from "../../src/lib/api";
import { StudentDB } from "../../src/lib/db";
import { flushQueue, queueClassAttendance } from "../../src/lib/syncQueue";

const section: ClassSection = {
  id: "IT301-01",
  course_id: "IT301",
  course_name: "Lập trình Web",
  max_capacity: 50,
  current_enrolled: 20,
  schedule_day: 2,
  start_period: 1,
  end_period: 3,
};
afterEach(() => vi.unstubAllGlobals());
describe("backend workflow contracts", () => {
  it("shows empty real grades without substituting example scores", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ grades: [] }));
    vi.stubGlobal("fetch", fetch);
    expect(await getGrades("student-without-grades")).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("surfaces grade API failures instead of retrying with fake fallback data", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ message: "Máy chủ điểm đang lỗi" }, { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    await expect(getGrades("student-api-error")).rejects.toThrow("Máy chủ điểm đang lỗi");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps offline attendance on HTTP 200 failure, retries with the original LWW timestamp, and prevents duplicate clicks", async () => {
    const db = new StudentDB(`services-${crypto.randomUUID()}`);
    try {
      await Promise.all([
        queueClassAttendance("23IT112", section, "2026-10-12", "device-1", db),
        queueClassAttendance("23IT112", section, "2026-10-12", "device-1", db),
      ]);
      expect(await db.syncQueue.count()).toBe(1);
      const original = (await db.syncQueue.toArray())[0];
      expect(original.body).toMatchObject({
        device_id: "device-1",
        records: [
          {
            student_id: "23IT112",
            class_section_id: "IT301-01",
            session_date: "2026-10-12",
            status: "PRESENT",
          },
        ],
      });
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ success: false, ack_token: "misleading-ack" }),
        )
        .mockResolvedValueOnce(
          Response.json({ success: true, ack_token: "ack-1" }),
        );
      vi.stubGlobal("fetch", fetch);
      expect((await flushQueue(db, sendMutation)).failed).toBe(true);
      expect(await db.syncQueue.count()).toBe(1);
      expect((await flushQueue(db, sendMutation)).sent).toBe(1);
      expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
      expect((await db.timetable.toArray())[0].attendance).toBe("confirmed");
      await queueClassAttendance(
        "23IT112",
        section,
        "2026-10-12",
        "device-1",
        db,
      );
      expect(await db.syncQueue.count()).toBe(0);
    } finally {
      await db.delete();
    }
  });
  it("does not accept a missing attendance ACK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ success: true })),
    );
    await expect(
      sendMutation({
        id: "1",
        method: "POST",
        url: "/api/attendance/offline-sync",
        body: {},
        createdAt: 0,
        retries: 0,
      }),
    ).rejects.toThrow("xác nhận");
  });
  it("sends the registration DTO and surfaces workflow rejection", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: false, message: "Lớp đã đủ chỗ" }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      registerCourse(
        {
          studentId: "23IT112",
          email: "sv@vku.udn.vn",
          semester: "2026-2027-1",
        },
        section,
      ),
    ).rejects.toThrow("Lớp đã đủ chỗ");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      student_id: "23IT112",
      student_email: "sv@vku.udn.vn",
      semester: "2026-2027-1",
      course_id: "IT301",
      class_section_id: "IT301-01",
    });
  });
  it("preserves FAQ sources and reads submission results using only its scoped token", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          answer: "Liên hệ cố vấn",
          needsEscalation: true,
          sources: [{ id: "1", title: "Quy chế" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ submissionId: "s1", status: "QUEUED" }),
      );
    vi.stubGlobal("fetch", fetch);
    expect((await askFAQ("Điều kiện?", "23IT112")).needsEscalation).toBe(true);
    await getSubmission({
      submissionId: "s1",
      readToken: "scoped-token",
      title: "Bài 1",
      studentId: "23IT112",
      status: "QUEUED",
    });
    expect(fetch.mock.calls[1][1].headers).toMatchObject({
      "x-submission-token": "scoped-token",
    });
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty(
      "x-internal-api-key",
    );
  });
});
