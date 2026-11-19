import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/vku-ai-support';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STUDENT_ID = '23IT143';
const STUDENT_NAME = 'Lê Bảo Long';
const STUDENT_EMAIL = 'longlb.23it@vku.udn.vn';
const ADVISOR_EMAIL = 'covan.cntt@vku.udn.vn';
const CLASS_ID = '23IT1';
const MAJOR = 'Công nghệ Thông tin';
const DEPARTMENT = 'Khoa Công nghệ Thông tin';

export type SimulationMode = 'warn' | 'prohibit' | 'reset';

interface SimulationConfig {
  mode: SimulationMode;
  title: string;
  totalSessions: number;
  absentSessions: number;
  absenceRatePercent: number;
  attendanceRatePercent: number;
  attendanceWarning: boolean;
  examProhibited: boolean;
  warningTier: 'ATTENDANCE_WARNING' | 'EXAM_PROHIBITED' | 'NORMAL';
}

const CONFIGS: Record<SimulationMode, SimulationConfig> = {
  warn: {
    mode: 'warn',
    title: 'MỨC 1: CẢNH BÁO ĐIỂM DANH (VẮNG 16% - 18% SỐ TIẾT)',
    totalSessions: 45,
    absentSessions: 8,
    absenceRatePercent: 17.8, // 8 / 45 = 17.78%
    attendanceRatePercent: 82.2,
    attendanceWarning: true,
    examProhibited: false,
    warningTier: 'ATTENDANCE_WARNING',
  },
  prohibit: {
    mode: 'prohibit',
    title: 'MỨC 2: CẤM THI THEO ĐIỀU 14 (VẮNG > 20% SỐ TIẾT)',
    totalSessions: 45,
    absentSessions: 10,
    absenceRatePercent: 22.2, // 10 / 45 = 22.22%
    attendanceRatePercent: 77.8,
    attendanceWarning: true,
    examProhibited: true,
    warningTier: 'EXAM_PROHIBITED',
  },
  reset: {
    mode: 'reset',
    title: 'MỨC 0: RESET VỀ BÌNH THƯỜNG (0% VẮNG, CHUYÊN CẦN 100%)',
    totalSessions: 45,
    absentSessions: 0,
    absenceRatePercent: 0.0,
    attendanceRatePercent: 100.0,
    attendanceWarning: false,
    examProhibited: false,
    warningTier: 'NORMAL',
  },
};

function parseModeFromArgs(): SimulationMode {
  const arg = (process.argv[2] || '').toLowerCase().trim();
  if (['warn', 'warning', '1', '--warn', '-w'].includes(arg)) {
    return 'warn';
  }
  if (['prohibit', 'prohibited', '2', '--prohibit', '-p'].includes(arg)) {
    return 'prohibit';
  }
  if (['reset', '0', '--reset', '-r'].includes(arg)) {
    return 'reset';
  }

  // Default to warn if not specified
  return 'warn';
}

async function runSimulation() {
  const mode = parseModeFromArgs();
  const cfg = CONFIGS[mode];

  console.log('========================================================================');
  console.log(`🚀 [SIMULATION] ${cfg.title}`);
  console.log(`👤 Sinh viên mục tiêu: ${STUDENT_NAME} (MSSV: ${STUDENT_ID}) - Lớp: ${CLASS_ID}`);
  console.log('========================================================================\n');

  // 1. KẾT NỐI MONGODB
  console.log(`🔌 [1/3] Kết nối MongoDB: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.connect(MONGO_URI);
  const studentsCol = mongoose.connection.collection<any>('students');
  const attendancesCol = mongoose.connection.collection<any>('attendances');

  // Cập nhật Document sinh viên trong MongoDB
  const studentUpdatePayload = {
    _id: STUDENT_ID,
    studentId: STUDENT_ID,
    full_name: STUDENT_NAME,
    fullName: STUDENT_NAME,
    student_email: STUDENT_EMAIL,
    advisor_email: ADVISOR_EMAIL,
    class_name: CLASS_ID,
    classId: CLASS_ID,
    major: MAJOR,
    department: DEPARTMENT,
    status: 'ACTIVE',
    total_sessions: cfg.totalSessions,
    totalSessions: cfg.totalSessions,
    absent_sessions: cfg.absentSessions,
    absentSessions: cfg.absentSessions,
    attendance_rate: cfg.attendanceRatePercent,
    attendanceRate: cfg.attendanceRatePercent / 100,
    attendance_warning: cfg.attendanceWarning,
    attendanceWarning: cfg.attendanceWarning,
    exam_prohibited: cfg.examProhibited,
    examProhibited: cfg.examProhibited,
    updatedAt: new Date(),
  };

  await studentsCol.updateOne(
    { _id: STUDENT_ID },
    { $set: studentUpdatePayload },
    { upsert: true },
  );
  console.log(`   ✅ Đã cập nhật collection 'students' cho MSSV ${STUDENT_ID}:`);
  console.log(`      • Tổng số tiết: ${cfg.totalSessions}`);
  console.log(`      • Số tiết vắng: ${cfg.absentSessions} (~${cfg.absenceRatePercent}%)`);
  console.log(`      • Tỉ lệ chuyên cần: ${cfg.attendanceRatePercent}%`);
  console.log(`      • Cảnh báo điểm danh (attendance_warning): ${cfg.attendanceWarning}`);
  console.log(`      • Cấm thi Điều 14 (exam_prohibited): ${cfg.examProhibited}`);

  // Cập nhật chi tiết các bản ghi điểm danh trong collection 'attendances'
  await attendancesCol.deleteMany({ student_id: STUDENT_ID });
  const attendanceDocs = [];
  const startDate = new Date('2026-09-05T07:00:00Z');

  for (let i = 1; i <= cfg.totalSessions; i++) {
    const isAbsent = i <= cfg.absentSessions;
    const sessionDate = new Date(startDate);
    sessionDate.setDate(startDate.getDate() + (i - 1) * 3);

    attendanceDocs.push({
      student_id: STUDENT_ID,
      session: `Buổi ${i}`,
      status: isAbsent ? 'ABSENT' : 'PRESENT',
      created_at: sessionDate,
      updated_at: sessionDate,
    });
  }

  if (attendanceDocs.length > 0) {
    await attendancesCol.insertMany(attendanceDocs);
  }
  console.log(
    `   ✅ Đã tạo mới ${attendanceDocs.length} bản ghi điểm danh trong collection 'attendances' (${cfg.absentSessions} vắng, ${cfg.totalSessions - cfg.absentSessions} có mặt).`,
  );

  // 2. KẾT NỐI SUPABASE
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`\n🔌 [2/3] Kết nối Supabase: ${SUPABASE_URL}`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Đảm bảo sinh viên tồn tại trong public.students
    await supabase.from('students').upsert({
      id: STUDENT_ID,
      full_name: STUDENT_NAME,
      status: 'ACTIVE',
    });

    if (cfg.mode === 'reset') {
      // Xóa các cảnh báo học vụ của sinh viên
      await supabase
        .from('academic_warnings')
        .delete()
        .eq('student_id', STUDENT_ID);
      console.log(`   ✅ Đã xóa các bản ghi cảnh báo trong 'public.academic_warnings' của sinh viên ${STUDENT_ID}.`);
    } else {
      // Chèn bản ghi cảnh báo mới
      const { error: warnErr } = await supabase.from('academic_warnings').insert({
        student_id: STUDENT_ID,
        gpa: 2.85,
        absent_rate: cfg.absenceRatePercent,
        warning_tier: cfg.warningTier,
        advisor_email: ADVISOR_EMAIL,
        notified_at: new Date().toISOString(),
      });

      if (warnErr) {
        console.warn(`   ⚠️ Supabase academic_warnings insert: ${warnErr.message}`);
      } else {
        console.log(`   ✅ Đã chèn bản ghi cảnh báo vào 'public.academic_warnings':`);
        console.log(`      • warning_tier: ${cfg.warningTier}`);
        console.log(`      • absent_rate: ${cfg.absenceRatePercent}%`);
        console.log(`      • advisor_email: ${ADVISOR_EMAIL}`);
      }
    }

    // Cập nhật một số bản ghi trong public.attendance để đối soát đồng bộ
    try {
      const sectionId = 'IT3010-01';
      for (let i = 1; i <= Math.min(cfg.totalSessions, 15); i++) {
        const isAbsent = i <= Math.min(cfg.absentSessions, 5);
        const dateStr = new Date(Date.now() - (16 - i) * 86400000)
          .toISOString()
          .slice(0, 10);
        await supabase.from('attendance').upsert(
          {
            student_id: STUDENT_ID,
            class_section_id: sectionId,
            session_date: dateStr,
            status: isAbsent ? 'ABSENT' : 'PRESENT',
            device_timestamp: new Date().toISOString(),
          },
          { onConflict: 'student_id,class_section_id,session_date' },
        );
      }
      console.log(`   ✅ Đã đồng bộ điểm danh mẫu vào 'public.attendance' trên Supabase.`);
    } catch (e: any) {
      console.warn(`   ⚠️ Supabase attendance sync note: ${e?.message}`);
    }
  } else {
    console.log('\n⚠️ [2/3] Bỏ qua Supabase do thiếu cấu hình trong .env.');
  }

  await mongoose.disconnect();

  // 3. HƯỚNG DẪN KIỂM TRA TRÊN UI
  console.log('\n========================================================================');
  console.log('🎉 [3/3] MÔ PHỎNG DỮ LIỆU ĐÃ ÁP DỤNG THÀNH CÔNG!');
  console.log('========================================================================');
  console.log('📊 Bạn có thể mở trình duyệt để kiểm tra trực quan trên giao diện:');
  console.log('   1. Dashboard Giảng viên:');
  console.log('      👉 http://localhost:3000/teacher');
  console.log('         (Xem KPI Cảnh báo điểm danh / Cấm thi và Top sinh viên vi phạm)');
  console.log('   2. Bảng theo dõi điểm danh chuyên cần:');
  console.log('      👉 http://localhost:3000/teacher/attendance');
  console.log(`         (Tìm kiếm MSSV "${STUDENT_ID}" để thấy huy hiệu ${cfg.mode === 'prohibit' ? 'ĐỎ: CẤM THI ĐIỀU 14' : cfg.mode === 'warn' ? 'VÀNG: CẢNH BÁO ĐIỂM DANH' : 'XANH: BÌNH THƯỜNG'})`);
  console.log('   3. Danh sách quản lý sinh viên:');
  console.log('      👉 http://localhost:3000/teacher/students');
  console.log('========================================================================\n');
}

runSimulation().catch((err) => {
  console.error('❌ Lỗi khi thực thi script mô phỏng:', err);
  process.exit(1);
});
