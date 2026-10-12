import Dexie, { type Table } from "dexie";

export interface TimetableEntry {
  id: string;
  course: string;
  code: string;
  date: string;
  start: string;
  end: string;
  room: string;
  lecturer: string;
  attendance: "not-marked" | "pending" | "confirmed";
  updatedAt: number;
  studentId?: string;
  classSectionId?: string;
  deviceId?: string;
}

export interface SyncItem {
  id: string;
  method: "POST" | "PUT";
  url: string;
  body: unknown;
  createdAt: number;
  retries: number;
  // Optional metadata links a mutation to its visible row and records retry errors.
  entityId?: string;
  lastError?: string;
  leaseOwner?: string;
  leaseUntil?: number;
}

export class StudentDB extends Dexie {
  sections!: Table<import("./api").ClassSection, string>;
  submissions!: Table<import("./api").SubmissionReceipt, string>;
  timetable!: Table<TimetableEntry, string>;
  syncQueue!: Table<SyncItem, string>;
  constructor(name = "vku-student") {
    super(name);
    this.version(1).stores({
      timetable: "id, date, [date+start]",
      syncQueue: "id, [createdAt+id], entityId",
    });
    this.version(2).stores({
      sections: "id",
      submissions: "submissionId, studentId",
    });
  }
}

export const db = new StudentDB();
