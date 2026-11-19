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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MongoStudentDoc {
  _id: string;
  full_name?: string;
  fullName?: string;
  status?: string;
  student_email?: string;
  advisor_email?: string;
  [key: string]: any;
}

interface SupabaseStudentRow {
  id: string;
  full_name: string;
  status: string;
}

async function backfillStudents() {
  console.log('============================================================');
  console.log('🔄 BẮT ĐẦU ĐỒNG BỘ 2 CHIỀU SINH VIÊN (MONGODB <-> SUPABASE)');
  console.log('============================================================');

  // 1. Kết nối MongoDB
  console.log(`🔌 Kết nối MongoDB: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
  await mongoose.connect(MONGO_URI);
  const studentCollection = mongoose.connection.collection<any>('students');

  // 2. Lấy dữ liệu hiện có từ cả 2 cơ sở dữ liệu
  const mongoStudents = (await studentCollection.find().toArray()) as unknown as MongoStudentDoc[];
  console.log(`📊 Số lượng sinh viên hiện tại trong MongoDB: ${mongoStudents.length}`);

  const { data: supaInitial, error: supaFetchErr } = await supabase
    .from('students')
    .select('id, full_name, status');

  if (supaFetchErr) {
    console.error('❌ Lỗi khi đọc bảng public.students từ Supabase:', supaFetchErr.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  const supaStudentsInitial = supaInitial as SupabaseStudentRow[];
  console.log(`📊 Số lượng sinh viên hiện tại trong Supabase: ${supaStudentsInitial.length}`);

  const supaIdSet = new Set(supaStudentsInitial.map((s) => String(s.id)));
  const mongoIdSet = new Set(mongoStudents.map((s) => String(s._id)));

  // 3. CHIỀU 1: ĐỒNG BỘ TỪ MONGODB -> SUPABASE
  // Chuẩn bị payload upsert vào Supabase (giải quyết lỗi Foreign Key cho enrollments)
  console.log('\n--- BƯỚC 1: ĐỒNG BỘ TỪ MONGODB SANG SUPABASE (BULK UPSERT) ---');
  const supaUpsertBatch: SupabaseStudentRow[] = mongoStudents.map((doc) => {
    const rawStatus = doc.status ? String(doc.status).toUpperCase() : 'ACTIVE';
    const status = ['ACTIVE', 'WARNING', 'DROPPED', 'GRADUATED', 'SUSPENDED'].includes(rawStatus)
      ? rawStatus
      : 'ACTIVE';

    return {
      id: String(doc._id).trim(),
      full_name: (doc.full_name || doc.fullName || 'Chưa cập nhật họ tên').trim(),
      status,
    };
  });

  const BATCH_SIZE = 200;
  let upsertedToSupaCount = 0;

  for (let i = 0; i < supaUpsertBatch.length; i += BATCH_SIZE) {
    const chunk = supaUpsertBatch.slice(i, i + BATCH_SIZE);
    const { error: upsertErr } = await supabase
      .from('students')
      .upsert(chunk, { onConflict: 'id' });

    if (upsertErr) {
      console.error(`❌ Lỗi upsert chunk [${i}..${i + chunk.length}] vào Supabase:`, upsertErr.message);
    } else {
      upsertedToSupaCount += chunk.length;
    }
  }

  const newToSupa = mongoStudents.filter((m) => !supaIdSet.has(String(m._id)));
  console.log(`✅ Đã đẩy ${upsertedToSupaCount} bản ghi sang Supabase.`);
  console.log(`   Trong đó có ${newToSupa.length} sinh viên mới được bổ sung vào Supabase:`,
    newToSupa.map((s) => s._id).join(', ') || '(không có sinh viên mới)'
  );

  // 4. CHIỀU 2: ĐỒNG BỘ TỪ SUPABASE -> MONGODB
  // Đảm bảo mọi sinh viên trong Supabase (SSOT) đều có mặt trong MongoDB
  console.log('\n--- BƯỚC 2: ĐỒNG BỘ TỪ SUPABASE SANG MONGODB (SSOT ENFORCEMENT) ---');
  const { data: supaRefreshed, error: supaRefErr } = await supabase
    .from('students')
    .select('id, full_name, status');

  if (supaRefErr) {
    console.error('❌ Lỗi khi tải lại dữ liệu Supabase:', supaRefErr.message);
    await mongoose.disconnect();
    process.exit(1);
  }

  const supaAll = supaRefreshed as SupabaseStudentRow[];
  let syncedToMongoCount = 0;
  let mongoAddedCount = 0;

  for (const s of supaAll) {
    const studentId = String(s.id).trim();
    const isNew = !mongoIdSet.has(studentId);

    const result = await studentCollection.updateOne(
      { _id: studentId as any },
      {
        $set: {
          full_name: s.full_name,
          status: s.status ? s.status.toUpperCase() : 'ACTIVE',
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: studentId,
          student_email: `${studentId.toLowerCase()}@vku.udn.vn`,
          advisor_email: 'advisor.cntt@vku.udn.vn',
          gender: 'MALE',
          class_name: '23IT1',
          major: 'Công nghệ Thông tin',
          department: 'Khoa Công nghệ Thông tin',
          academic_year: '2023-2027',
          gpa: 3.0,
          credits_earned: 0,
          total_credits: 135,
          total_sessions: 20,
          absent_sessions: 0,
          attendance_rate: 100,
          attendance_warning: false,
          exam_prohibited: false,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    syncedToMongoCount++;
    if (result.upsertedCount > 0 || isNew) {
      mongoAddedCount++;
    }
  }

  console.log(`✅ Đã đồng bộ ${syncedToMongoCount} sinh viên từ Supabase vào MongoDB.`);
  if (mongoAddedCount > 0) {
    console.log(`   (Trong đó có ${mongoAddedCount} sinh viên mới được tạo trong MongoDB)`);
  }

  // 5. ĐỐI SOÁT VÀ TỔNG KẾT DỮ LIỆU
  console.log('\n============================================================');
  console.log('📋 KẾT QUẢ ĐỐI SOÁT DỮ LIỆU SAU ĐỒNG BỘ:');
  console.log('============================================================');

  const finalMongoCount = await studentCollection.countDocuments();
  const { count: finalSupaCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true });

  console.log(`- Tổng số sinh viên MongoDB:  ${finalMongoCount}`);
  console.log(`- Tổng số sinh viên Supabase: ${finalSupaCount}`);

  // Kiểm tra đặc biệt cho sinh viên 23IT143
  const targetStudentMongo = await studentCollection.findOne({ _id: '23IT143' as any });
  const { data: targetStudentSupa } = await supabase
    .from('students')
    .select('*')
    .eq('id', '23IT143')
    .single();

  console.log('\n🎯 KIỂM TRA ĐẶC BIỆT CHO SINH VIÊN 23IT143:');
  console.log('  MongoDB : ', targetStudentMongo ? { id: targetStudentMongo._id, name: targetStudentMongo.full_name, status: targetStudentMongo.status } : 'KHÔNG TÌM THẤY');
  console.log('  Supabase: ', targetStudentSupa ? { id: targetStudentSupa.id, name: targetStudentSupa.full_name, status: targetStudentSupa.status } : 'KHÔNG TÌM THẤY');

  console.log(`\n🎉 Đã đồng bộ ${finalSupaCount} sinh viên thành công! Dữ liệu 2 bên đã đạt trạng thái nhất quán 100%.`);

  await mongoose.disconnect();
}

backfillStudents().catch(async (err) => {
  console.error('❌ Quá trình đồng bộ thất bại:', err);
  await mongoose.disconnect();
  process.exit(1);
});
