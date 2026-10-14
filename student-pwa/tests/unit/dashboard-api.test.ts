import { afterEach, expect, it, vi } from "vitest";
import {
  updateThesisMilestone,
  refreshThesis,
  ingestDocument,
  scanAcademicWarnings,
} from "../../../front/lib/api";
import type { Thesis } from "../../../front/types";

afterEach(() => vi.unstubAllGlobals());
it("surfaces a failed thesis workflow instead of displaying a saved state", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { message: "Mốc đã lưu nhưng workflow lỗi" },
          { status: 502 },
        ),
      ),
  );
  await expect(
    updateThesisMilestone("thesis1", "milestone1", "COMPLETED"),
  ).rejects.toThrow("workflow lỗi");
});
it("reloads server feedback from the correct thesis after an update", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ data: [], totalPages: 2 }))
    .mockResolvedValueOnce(
      Response.json({
        data: [
          { _id: "thesis1", milestones: [{ aiFeedback: "Đã hoàn thành" }] },
        ],
        totalPages: 2,
      }),
    );
  vi.stubGlobal("fetch", fetch);
  expect(
    (await refreshThesis({ _id: "thesis1", studentId: "23IT112" } as Thesis))
      .milestones[0].aiFeedback,
  ).toBe("Đã hoàn thành");
  expect(fetch.mock.calls[1][0]).toContain("page=2");
});
it("uploads files as multipart and preview scans explicitly send limit zero", async () => {
  const fetch = vi
    .fn()
    .mockImplementation(async () => Response.json({ success: true }));
  vi.stubGlobal("fetch", fetch);
  await ingestDocument(
    { title: "Quy chế", content: "", category: "quy_che" },
    new File(["Quy chế học vụ"], "quyche.txt", { type: "text/plain" }),
  );
  expect(fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
  expect(fetch.mock.calls[0][1].headers).toBeUndefined();
  await scanAcademicWarnings(0);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ limit: 0 });
});
