import { MongoClient } from "mongodb";
import type { PaginatedResult, Submission } from "@/types";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vku-ai-support";

let client: MongoClient | null = null;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  return client.db();
}

function detectCourseName(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("web") || lower.includes("rest api") || lower.includes("crud")) {
    return "Lập trình Web";
  }
  if (lower.includes("socket") || lower.includes("mạng") || lower.includes("network")) {
    return "Mạng máy tính";
  }
  if (
    lower.includes("cấu trúc") ||
    lower.includes("dijkstra") ||
    lower.includes("knapsack") ||
    lower.includes("cái túi") ||
    lower.includes("thuật toán")
  ) {
    return "Cấu trúc dữ liệu & Giải thuật";
  }
  if (lower.includes("dữ liệu") || lower.includes("database") || lower.includes("sql")) {
    return "Cơ sở dữ liệu";
  }
  return "Lập trình Web";
}

export async function fetchSubmissions(options: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
} = {}): Promise<PaginatedResult<Submission>> {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(options.pageSize) || 20));
  const search = (options.search || "").trim();
  const statusFilter = options.status && options.status !== "ALL" ? options.status : "";

  try {
    const db = await getDb();
    const submissionsCol = db.collection("submissions");
    const studentsCol = db.collection("students");

    // Pre-cache students dictionary for name lookup
    const students = await studentsCol.find().toArray();
    const studentMap = new Map<string, string>();
    for (const s of students) {
      const id = String(s._id || s.studentId);
      const name = s.full_name || s.fullName || s.name;
      if (name) studentMap.set(id, name);
    }
    // Static fallbacks for standard test accounts
    if (!studentMap.has("23IT112")) studentMap.set("23IT112", "Lê Bảo Long");
    if (!studentMap.has("23IT143")) studentMap.set("23IT143", "Trần Văn Nam");

    const query: Record<string, any> = {};

    if (statusFilter) {
      query.status = statusFilter;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      // Find student IDs matching search name
      const matchingStudentIds: string[] = [];
      for (const [sId, sName] of studentMap.entries()) {
        if (sName.toLowerCase().includes(search.toLowerCase())) {
          matchingStudentIds.push(sId);
        }
      }

      query.$or = [
        { assignmentTitle: regex },
        { studentId: regex },
        ...(matchingStudentIds.length > 0 ? [{ studentId: { $in: matchingStudentIds } }] : []),
      ];
    }

    const sortDirection = options.sortOrder === "asc" ? 1 : -1;
    const sortField = options.sortBy || "createdAt";
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const total = await submissionsCol.countDocuments(query);
    const skip = (page - 1) * pageSize;

    const rawDocs = await submissionsCol
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .toArray();

    const data: Submission[] = rawDocs.map((doc: any) => {
      const sId = String(doc.studentId || "");
      const title = doc.assignmentTitle || "Bài nộp sinh viên";
      return {
        _id: String(doc._id),
        submissionId: String(doc._id),
        studentId: sId,
        studentName: studentMap.get(sId) || (sId ? `Sinh viên ${sId}` : "Chưa rõ"),
        courseName: detectCourseName(title),
        assignmentTitle: title,
        content: doc.content || "",
        criteria: Array.isArray(doc.criteria) ? doc.criteria : [],
        status: doc.status || "PENDING",
        model: doc.model || "gemini-3.5-flash-lite",
        feedback: doc.feedback
          ? {
              summary: doc.feedback.summary || "",
              score: typeof doc.feedback.score === "number" ? doc.feedback.score : 0,
              strengths: Array.isArray(doc.feedback.strengths) ? doc.feedback.strengths : [],
              weaknesses: Array.isArray(doc.feedback.weaknesses) ? doc.feedback.weaknesses : [],
              suggestions: Array.isArray(doc.feedback.suggestions) ? doc.feedback.suggestions : [],
            }
          : undefined,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || new Date().toISOString()),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt || new Date().toISOString()),
      };
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("Lỗi khi truy vấn submissions từ MongoDB:", error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}
