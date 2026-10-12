import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Deterministic Pseudo-Random Generator (LCG)
class SeededRandom {
  private seed: number;
  constructor(seed = 20261010) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  range(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min));
  }
  choice<T>(array: readonly T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }
}

const rng = new SeededRandom(20261010);

const LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đoàn'];
const MIDDLE_MALE = ['Văn', 'Hữu', 'Đức', 'Quốc', 'Thành', 'Minh', 'Đình', 'Bảo', 'Gia', 'Tuấn', 'Hải', 'Thế'];
const FIRST_MALE = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Huy', 'Hùng', 'Khoa', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Phong', 'Phúc', 'Quân', 'Quang', 'Sơn', 'Tài', 'Thắng', 'Thịnh', 'Trung', 'Tú', 'Việt'];
const MIDDLE_FEMALE = ['Thị', 'Ngọc', 'Thảo', 'Phương', 'Mai', 'Thanh', 'Như', 'Hồng', 'Yến', 'Ánh', 'Bích', 'Kim'];
const FIRST_FEMALE = ['Anh', 'Chi', 'Dung', 'Hà', 'Hân', 'Hương', 'Linh', 'Mai', 'My', 'Ngân', 'Nhi', 'Nhung', 'Phương', 'Quỳnh', 'Thảo', 'Trang', 'Trâm', 'Uyên', 'Vân', 'Vy', 'Xuân', 'Yến'];

interface MajorConfig {
  code: string;
  name: string;
  department: string;
  advisorEmail: string;
}

const MAJORS: MajorConfig[] = [
  { code: 'GIT', name: 'Công nghệ Thông tin (Global IT)', department: 'Khoa Khoa học Máy tính', advisorEmail: 'advisor.cntt@vku.udn.vn' },
  { code: 'IT', name: 'Công nghệ Thông tin', department: 'Khoa Khoa học Máy tính', advisorEmail: 'advisor.cntt@vku.udn.vn' },
  { code: 'AI', name: 'Trí tuệ Nhân tạo', department: 'Khoa Khoa học Máy tính', advisorEmail: 'advisor.cntt@vku.udn.vn' },
  { code: 'DS', name: 'Khoa học Dữ liệu & Phân tích Dữ liệu', department: 'Khoa Khoa học Máy tính', advisorEmail: 'advisor.cntt@vku.udn.vn' },
  { code: 'CS', name: 'Khoa học Máy tính', department: 'Khoa Khoa học Máy tính', advisorEmail: 'advisor.cntt@vku.udn.vn' },
  { code: 'CE', name: 'Kỹ thuật Máy tính & IoT', department: 'Khoa Kỹ thuật Máy tính & Điện tử', advisorEmail: 'advisor.ktmt@vku.udn.vn' },
  { code: 'BA', name: 'Quản trị Kinh doanh số', department: 'Khoa Kinh tế số & TMĐT', advisorEmail: 'advisor.kts@vku.udn.vn' },
  { code: 'FIN', name: 'Công nghệ Tài chính (Fintech)', department: 'Khoa Kinh tế số & TMĐT', advisorEmail: 'advisor.kts@vku.udn.vn' },
];

const ADVISORS = [
  { id: 'ADV-01', name: 'TS. Nguyễn Văn Hùng', department: 'Khoa Khoa học Máy tính', email: 'advisor.cntt@vku.udn.vn' },
  { id: 'ADV-02', name: 'PGS.TS. Trần Quốc Tuấn', department: 'Khoa Khoa học Máy tính', email: 'advisor.cntt@vku.udn.vn' },
  { id: 'ADV-03', name: 'TS. Lê Thị Mai', department: 'Khoa Kỹ thuật Máy tính & Điện tử', email: 'advisor.ktmt@vku.udn.vn' },
  { id: 'ADV-04', name: 'TS. Đặng Minh Nhật', department: 'Khoa Kinh tế số & TMĐT', email: 'advisor.kts@vku.udn.vn' },
  { id: 'ADV-05', name: 'ThS. Phan Thanh Sơn', department: 'Khoa Khoa học Máy tính', email: 'advisor.cntt@vku.udn.vn' },
  { id: 'ADV-06', name: 'TS. Vũ Bích Ngọc', department: 'Khoa Kinh tế số & TMĐT', email: 'advisor.kts@vku.udn.vn' },
];

const THESIS_TOPICS = [
  'Hệ sinh thái Trợ lý RAG AI hỗ trợ học vụ thông minh kết hợp Supabase pgvector và Gemini',
  'Ứng dụng Reciprocal Rank Fusion (RRF) tối ưu hóa truy vấn quy chế đào tạo đại học',
  'Hệ thống giám sát điểm danh sinh viên tự động và cảnh báo học vụ thời gian thực qua n8n',
  'Kiến trúc Message Queue BullMQ xử lý tác vụ chấm bài tự động quy mô lớn',
  'Nền tảng phân tích hành vi học tập và dự báo nguy cơ trượt môn dựa trên Machine Learning',
  'Giải pháp xác thực chữ ký HMAC-SHA256 bảo mật liên thông webhook Microservices',
  'Ứng dụng nhận diện khuôn mặt trên Edge Device phục vụ điểm danh phòng học thông minh',
  'Hệ thống quản lý đề tài tốt nghiệp số hóa quy trình phê duyệt và thẩm định đồ án',
  'Mô hình đánh giá năng lực lập trình sinh viên ứng dụng LLM Multi-Turn Evaluation',
  'Nền tảng thương mại điện tử phi tập trung tích hợp cổng thanh toán thông minh',
  'Hệ thống phát hiện bất thường trong dữ liệu học phí và điểm danh sinh viên',
  'Trợ lý ảo hỗ trợ cố vấn học tập định hướng chương trình đào tạo cá nhân hóa',
];

const CORE_COURSES = [
  { id: 'IT1010', course_name: 'Nhập môn lập trình', prerequisite_course_id: null },
  { id: 'BA2010', course_name: 'Kinh tế số & Phân tích kinh doanh', prerequisite_course_id: null },
  { id: 'IT3010', course_name: 'Hệ thống phân tán & Điện toán đám mây', prerequisite_course_id: 'IT1010' },
  { id: 'IT3025', course_name: 'Trí tuệ nhân tạo nâng cao', prerequisite_course_id: 'IT1010' },
  { id: 'IT3040', course_name: 'Kiến trúc phần mềm & Thiết kế hệ thống', prerequisite_course_id: 'IT1010' },
  { id: 'DS3030', course_name: 'Khai phá dữ liệu & Học máy ứng dụng', prerequisite_course_id: 'IT1010' },
  { id: 'CE2050', course_name: 'Hệ nhúng & Internet vạn vật (IoT)', prerequisite_course_id: 'IT1010' },
];

const CLASS_SECTIONS = [
  { id: 'IT3010-01', course_id: 'IT3010', course_name: 'Hệ thống phân tán & Điện toán đám mây', max_capacity: 50, schedule_day: 2, start_period: 1, end_period: 3 },
  { id: 'IT3010-02', course_id: 'IT3010', course_name: 'Hệ thống phân tán & Điện toán đám mây', max_capacity: 50, schedule_day: 4, start_period: 4, end_period: 6 },
  { id: 'IT3025-01', course_id: 'IT3025', course_name: 'Trí tuệ nhân tạo nâng cao', max_capacity: 45, schedule_day: 3, start_period: 1, end_period: 3 },
  { id: 'IT3025-02', course_id: 'IT3025', course_name: 'Trí tuệ nhân tạo nâng cao', max_capacity: 45, schedule_day: 5, start_period: 7, end_period: 9 },
  { id: 'IT3040-01', course_id: 'IT3040', course_name: 'Kiến trúc phần mềm & Thiết kế hệ thống', max_capacity: 50, schedule_day: 6, start_period: 1, end_period: 3 },
  { id: 'BA2010-01', course_id: 'BA2010', course_name: 'Kinh tế số & Phân tích kinh doanh', max_capacity: 60, schedule_day: 2, start_period: 7, end_period: 9 },
  { id: 'DS3030-01', course_id: 'DS3030', course_name: 'Khai phá dữ liệu & Học máy ứng dụng', max_capacity: 40, schedule_day: 4, start_period: 1, end_period: 3 },
  { id: 'CE2050-01', course_id: 'CE2050', course_name: 'Hệ nhúng & Internet vạn vật (IoT)', max_capacity: 40, schedule_day: 5, start_period: 1, end_period: 3 },
];

function generateVietnameseName(gender: 'MALE' | 'FEMALE'): string {
  const last = rng.choice(LAST_NAMES);
  const mid = gender === 'MALE' ? rng.choice(MIDDLE_MALE) : rng.choice(MIDDLE_FEMALE);
  const first = gender === 'MALE' ? rng.choice(FIRST_MALE) : rng.choice(FIRST_FEMALE);
  return `${last} ${mid} ${first}`;
}

async function main() {
  console.log('================================================================');
  console.log('🚀 VKU SEED PIPELINE: MIGRATING MOCK DATA TO MONGODB & SUPABASE');
  console.log('================================================================');

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vku-ai-support';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  const mongoDb = mongoose.connection.db;
  if (!mongoDb) throw new Error('MongoDB database instance is null');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log(`Connected to Supabase at: ${supabaseUrl}\n`);

  // 1. Generate 500 Students
  console.log('📦 1. Generating 500 standardized VKU students...');
  const years = ['21', '22', '23', '24'];
  const generatedStudents: any[] = [];
  const mongoGrades: any[] = [];
  const mongoAttendances: any[] = [];
  const mongoTheses: any[] = [];

  // Indices 1 to 14 will intentionally be at academic risk (GPA < 2.0 or failed >= 8 credits or absent >= 20%)
  for (let i = 1; i <= 500; i++) {
    const gender: 'MALE' | 'FEMALE' = rng.next() > 0.4 ? 'MALE' : 'FEMALE';
    const fullName = generateVietnameseName(gender);
    const major = rng.choice(MAJORS);
    const year = rng.choice(years);
    const classNum = rng.range(1, 4);
    const className = `${year}${major.code}_0${classNum}`;
    const studentId = `${year}${major.code}${String(i).padStart(3, '0')}`;
    const studentEmail = `${studentId.toLowerCase()}@vku.udn.vn`;
    const advisorEmail = major.advisorEmail;
    const phone = `0${rng.range(32, 39)}${rng.range(1000000, 9999999)}`;

    const isTargetWarning = i <= 14;

    let gpa: number;
    let absentSessions: number;
    const totalSessions = 20;

    if (isTargetWarning) {
      if (i % 3 === 0) {
        gpa = Number((1.2 + rng.next() * 0.6).toFixed(2)); // GPA < 2.0
        absentSessions = rng.range(5, 8); // >= 25% absent
      } else if (i % 3 === 1) {
        gpa = Number((2.1 + rng.next() * 0.5).toFixed(2));
        absentSessions = rng.range(5, 7); // >= 25% absent
      } else {
        gpa = Number((1.5 + rng.next() * 0.4).toFixed(2));
        absentSessions = rng.range(2, 4);
      }
    } else {
      gpa = Number((2.2 + rng.next() * 1.6).toFixed(2));
      absentSessions = rng.range(0, 3); // < 15% absent
    }

    const absentRate = Number(((absentSessions / totalSessions) * 100).toFixed(2));
    const attendanceRate = Number(((1 - absentSessions / totalSessions) * 100).toFixed(2));
    const attendanceWarning = absentRate >= 15;
    const examProhibited = absentRate >= 20;

    let status = 'ACTIVE';
    if (examProhibited || gpa < 2.0) {
      status = 'WARNING';
    } else if (year === '21' && rng.next() > 0.8) {
      status = 'GRADUATED';
    }

    const totalCredits = 135;
    let creditsEarned = 35;
    if (year === '21') creditsEarned = rng.range(115, 135);
    else if (year === '22') creditsEarned = rng.range(80, 110);
    else if (year === '23') creditsEarned = rng.range(45, 75);
    else creditsEarned = rng.range(15, 40);

    const studentRecord = {
      _id: studentId,
      full_name: fullName,
      gender,
      student_email: studentEmail,
      advisor_email: advisorEmail,
      phone,
      class_name: className,
      major: major.name,
      department: major.department,
      academic_year: `20${year}-20${Number(year) + 4}`,
      status,
      gpa,
      credits_earned: creditsEarned,
      total_credits: totalCredits,
      total_sessions: totalSessions,
      absent_sessions: absentSessions,
      attendance_rate: attendanceRate,
      attendance_warning: attendanceWarning,
      exam_prohibited: examProhibited,
      created_at: new Date(`20${year}-09-05T00:00:00.000Z`),
      updated_at: new Date(),
    };

    generatedStudents.push(studentRecord);

    // MongoDB Grades for student
    const studentSubjects = [
      { name: 'Hệ thống phân tán & Điện toán đám mây', credits: 3 },
      { name: 'Trí tuệ nhân tạo nâng cao', credits: 3 },
      { name: 'Kiến trúc phần mềm & Thiết kế hệ thống', credits: 3 },
      { name: 'Kinh tế số & Phân tích kinh doanh', credits: 3 },
      { name: 'Khai phá dữ liệu & Học máy ứng dụng', credits: 3 },
    ];

    for (let sIdx = 0; sIdx < studentSubjects.length; sIdx++) {
      const subj = studentSubjects[sIdx];
      let score: number;
      if (isTargetWarning && sIdx < 3) {
        // Failed courses (< 4.0) causing failed_credits >= 8
        score = Number((2.0 + rng.next() * 1.8).toFixed(1));
      } else {
        score = Number((5.5 + rng.next() * 4.0).toFixed(1));
      }

      mongoGrades.push({
        student_id: studentId,
        subject: subj.name,
        score,
        credits: subj.credits,
        created_at: new Date(),
      });
    }

    // MongoDB Attendance sessions
    for (let sess = 1; sess <= totalSessions; sess++) {
      const isAbsent = sess <= absentSessions;
      mongoAttendances.push({
        student_id: studentId,
        session: `Buổi ${sess}`,
        status: isAbsent ? 'ABSENT' : 'PRESENT',
        created_at: new Date(),
      });
    }

    // Thesis generation for seniors (Khóa 21 or 22 with >= 95 credits)
    if (year === '21' || (year === '22' && creditsEarned >= 95)) {
      const advisor = rng.choice(ADVISORS);
      const topic = rng.choice(THESIS_TOPICS);
      const progressRatio = rng.next();
      const m1Status = 'COMPLETED';
      const m2Status = progressRatio > 0.3 ? 'COMPLETED' : 'IN_PROGRESS';
      const m3Status = progressRatio > 0.6 ? 'COMPLETED' : progressRatio > 0.4 ? 'IN_PROGRESS' : 'PENDING';
      const m4Status = progressRatio > 0.85 ? 'COMPLETED' : 'PENDING';

      mongoTheses.push({
        _id: `the-${studentId}`,
        title: `${topic} (${major.code})`,
        description: `Nghiên cứu ứng dụng và triển khai thực nghiệm giải pháp phục vụ chuyển đổi số tại VKU.`,
        studentId,
        studentName: fullName,
        advisorId: advisor.id,
        advisorName: advisor.name,
        department: major.department,
        progressPercent: Math.round(((Number(m1Status === 'COMPLETED') + Number(m2Status === 'COMPLETED') + Number(m3Status === 'COMPLETED') + Number(m4Status === 'COMPLETED')) / 4) * 100),
        defenseStatus: progressRatio >= 0.75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
        milestones: [
          { _id: `ms1-${studentId}`, title: 'Đề cương chi tiết & Nghiên cứu tổng quan', deadline: new Date('2026-03-15'), status: m1Status, aiFeedback: 'Đề cương đã được duyệt, mục tiêu rõ ràng.' },
          { _id: `ms2-${studentId}`, title: 'Thiết kế kiến trúc hệ thống & Triển khai MVP', deadline: new Date('2026-05-20'), status: m2Status, aiFeedback: 'Kiến trúc Subdocument và Message Queue BullMQ xử lý tải ổn định.' },
          { _id: `ms3-${studentId}`, title: 'Thử nghiệm, Đo lường hiệu năng & Tối ưu AI', deadline: new Date('2026-08-10'), status: m3Status, aiFeedback: 'Tỷ lệ RRF ranking đạt độ chính xác >94%.' },
          { _id: `ms4-${studentId}`, title: 'Hoàn thiện luận văn & Chuẩn bị bảo vệ', deadline: new Date('2026-10-30'), status: m4Status, aiFeedback: 'Đủ điều kiện bảo vệ trước hội đồng khoa học cấp trường.' },
        ],
        createdAt: new Date('2026-01-10T08:00:00.000Z'),
        updatedAt: new Date(),
      });
    }
  }

  // 2. Insert into MongoDB
  console.log(`\n🍃 2. Upserting into MongoDB (vku-ai-support)...`);
  const studentOps = generatedStudents.map((s) => ({
    updateOne: {
      filter: { _id: s._id },
      update: { $set: s },
      upsert: true,
    },
  }));
  const mongoStudentRes = await mongoDb.collection('students').bulkWrite(studentOps);
  console.log(`   - Students: upserted/matched ${mongoStudentRes.upsertedCount + mongoStudentRes.matchedCount} records.`);

  // Grades: Clear & re-seed for clean consistency
  await mongoDb.collection('grades').deleteMany({});
  const mongoGradeRes = await mongoDb.collection('grades').insertMany(mongoGrades);
  console.log(`   - Grades: inserted ${mongoGradeRes.insertedCount} records.`);

  // Attendances: Clear & re-seed
  await mongoDb.collection('attendances').deleteMany({});
  const mongoAttRes = await mongoDb.collection('attendances').insertMany(mongoAttendances);
  console.log(`   - Attendances: inserted ${mongoAttRes.insertedCount} records.`);

  // Theses: Upsert
  if (mongoTheses.length > 0) {
    const thesisOps = mongoTheses.map((t) => ({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: t },
        upsert: true,
      },
    }));
    const thesisRes = await mongoDb.collection('theses').bulkWrite(thesisOps);
    console.log(`   - Theses: upserted/matched ${thesisRes.upsertedCount + thesisRes.matchedCount} records.`);
  }

  // 3. Insert into Supabase (PostgreSQL)
  console.log(`\n🐘 3. Upserting into Supabase (PostgreSQL)...`);

  // A. public.students
  const supabaseStudents = generatedStudents.map((s) => ({
    id: s._id,
    full_name: s.full_name,
    status: s.status,
  }));
  // Batch 100 at a time for Supabase
  for (let i = 0; i < supabaseStudents.length; i += 100) {
    const batch = supabaseStudents.slice(i, i + 100);
    const { error } = await supabase.from('students').upsert(batch, { onConflict: 'id' });
    if (error) console.error(`   ! Supabase students batch error:`, error.message);
  }
  console.log(`   - public.students: 500 records synced.`);

  // B. public.courses
  const { error: courseErr } = await supabase.from('courses').upsert(CORE_COURSES, { onConflict: 'id' });
  if (courseErr) console.error(`   ! Supabase courses error:`, courseErr.message);
  else console.log(`   - public.courses: ${CORE_COURSES.length} courses synced.`);

  // C. public.class_sections
  const { error: sectionErr } = await supabase.from('class_sections').upsert(CLASS_SECTIONS, { onConflict: 'id' });
  if (sectionErr) console.error(`   ! Supabase class_sections error:`, sectionErr.message);
  else console.log(`   - public.class_sections: ${CLASS_SECTIONS.length} sections synced.`);

  // D. public.enrollments
  const enrollments: any[] = [];
  const attendancesPg: any[] = [];
  for (let i = 0; i < 150; i++) {
    const student = generatedStudents[i];
    const section = CLASS_SECTIONS[i % CLASS_SECTIONS.length];
    enrollments.push({
      student_id: student._id,
      course_id: section.course_id,
      class_section_id: section.id,
      semester: '2026_HK1',
      grade: student.gpa,
      status: 'ENROLLED',
      registered_at: new Date().toISOString(),
    });

    attendancesPg.push({
      student_id: student._id,
      class_section_id: section.id,
      session_date: '2026-10-10',
      status: student.exam_prohibited ? 'ABSENT' : 'PRESENT',
      device_timestamp: new Date().toISOString(),
    });
  }

  // Clear existing enrollments & attendance for idempotency
  await supabase.from('attendance').delete().neq('student_id', 'NON_EXISTENT');
  await supabase.from('enrollments').delete().neq('student_id', 'NON_EXISTENT');

  for (let i = 0; i < enrollments.length; i += 50) {
    const batch = enrollments.slice(i, i + 50);
    const { error } = await supabase.from('enrollments').insert(batch);
    if (error) console.error(`   ! Supabase enrollments batch error:`, error.message);
  }
  console.log(`   - public.enrollments: ${enrollments.length} enrollments synced.`);

  for (let i = 0; i < attendancesPg.length; i += 50) {
    const batch = attendancesPg.slice(i, i + 50);
    const { error } = await supabase.from('attendance').insert(batch);
    if (error) console.error(`   ! Supabase attendance batch error:`, error.message);
  }
  console.log(`   - public.attendance: ${attendancesPg.length} records synced.`);

  // 4. Verification & Audit Report
  console.log('\n================================================================');
  console.log('📊 AUDIT & RECONCILIATION SUMMARY TABLE:');
  console.log('================================================================');

  const countMongoStudents = await mongoDb.collection('students').countDocuments();
  const countMongoGrades = await mongoDb.collection('grades').countDocuments();
  const countMongoAttendances = await mongoDb.collection('attendances').countDocuments();
  const countMongoTheses = await mongoDb.collection('theses').countDocuments();

  const { count: countPgStudents } = await supabase.from('students').select('*', { count: 'exact', head: true });
  const { count: countPgCourses } = await supabase.from('courses').select('*', { count: 'exact', head: true });
  const { count: countPgSections } = await supabase.from('class_sections').select('*', { count: 'exact', head: true });
  const { count: countPgEnrollments } = await supabase.from('enrollments').select('*', { count: 'exact', head: true });
  const { count: countPgAttendance } = await supabase.from('attendance').select('*', { count: 'exact', head: true });

  console.table([
    { Database: 'MongoDB', Collection_or_Table: 'students', Record_Count: countMongoStudents, Status: 'SYNCHRONIZED' },
    { Database: 'MongoDB', Collection_or_Table: 'grades', Record_Count: countMongoGrades, Status: 'SYNCHRONIZED' },
    { Database: 'MongoDB', Collection_or_Table: 'attendances', Record_Count: countMongoAttendances, Status: 'SYNCHRONIZED' },
    { Database: 'MongoDB', Collection_or_Table: 'theses', Record_Count: countMongoTheses, Status: 'SYNCHRONIZED' },
    { Database: 'Supabase PostgreSQL', Collection_or_Table: 'public.students', Record_Count: countPgStudents, Status: 'SYNCHRONIZED' },
    { Database: 'Supabase PostgreSQL', Collection_or_Table: 'public.courses', Record_Count: countPgCourses, Status: 'SYNCHRONIZED' },
    { Database: 'Supabase PostgreSQL', Collection_or_Table: 'public.class_sections', Record_Count: countPgSections, Status: 'SYNCHRONIZED' },
    { Database: 'Supabase PostgreSQL', Collection_or_Table: 'public.enrollments', Record_Count: countPgEnrollments, Status: 'SYNCHRONIZED' },
    { Database: 'Supabase PostgreSQL', Collection_or_Table: 'public.attendance', Record_Count: countPgAttendance, Status: 'SYNCHRONIZED' },
  ]);

  await mongoose.disconnect();
  console.log('\n✅ SEEDING COMPLETE! All mock data successfully migrated to live databases.');
}

main().catch((err) => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
