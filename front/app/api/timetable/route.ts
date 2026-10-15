import { NextResponse } from "next/server";

const mockTimetable = [
  {
    id: "web-20261012",
    course: "Lập trình Web",
    code: "IT301 · 23IT2",
    date: "2026-10-12",
    start: "07:00",
    end: "09:30",
    room: "K.A301",
    lecturer: "ThS. Trần Quốc Huy",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "db-20261012",
    course: "Cơ sở dữ liệu",
    code: "IT204 · 23IT2",
    date: "2026-10-12",
    start: "13:00",
    end: "15:30",
    room: "K.B204",
    lecturer: "TS. Nguyễn Thu Hà",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "network-20261013",
    course: "Mạng máy tính",
    code: "IT205 · 23IT2",
    date: "2026-10-13",
    start: "07:00",
    end: "09:30",
    room: "K.A402",
    lecturer: "ThS. Lê Văn Phúc",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
  {
    id: "software-20261014",
    course: "Công nghệ phần mềm",
    code: "IT302 · 23IT2",
    date: "2026-10-14",
    start: "09:45",
    end: "12:00",
    room: "K.B301",
    lecturer: "TS. Phạm Thị Mai",
    attendance: "not-marked",
    updatedAt: 1791766800000,
  },
];

export async function GET() {
  return NextResponse.json(mockTimetable, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
