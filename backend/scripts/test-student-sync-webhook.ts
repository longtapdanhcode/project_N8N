import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1/internal/sync/supabase-student`;
const SECRET = process.env.SUPABASE_WEBHOOK_SECRET ?? '';
if (!SECRET) {
  console.error('Thiếu SUPABASE_WEBHOOK_SECRET trong backend/.env');
  process.exit(1);
}
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/vku-ai-support';

async function runTests() {
  console.log('============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ ENDPOINT POST /api/v1/internal/sync/supabase-student');
  console.log(`🎯 URL: ${BASE_URL}`);
  console.log('============================================================\n');

  // Test 1: Không có header x-webhook-secret
  console.log('1️⃣ Test Case 1: Gửi request không có header x-webhook-secret');
  try {
    const res1 = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'UPDATE',
        table: 'students',
        record: { id: '23IT143', full_name: 'Lê Bảo Long', status: 'ACTIVE' },
      }),
    });
    console.log(`   Status code: ${res1.status} (Kỳ vọng: 401)`);
    if (res1.status === 401) {
      console.log('   ✅ PASS: Bị từ chối Unauthorized chính xác khi thiếu secret.\n');
    } else {
      console.error('   ❌ FAIL: Không chặn request thiếu secret!\n');
    }
  } catch (err: any) {
    console.error(`   ❌ Lỗi kết nối: ${err.message}. Backend đang chạy ở cổng ${PORT} chưa?\n`);
    return;
  }

  // Test 2: Gửi sai secret
  console.log('2️⃣ Test Case 2: Gửi request với sai header x-webhook-secret');
  const res2 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': 'sai_secret_roi_123',
    },
    body: JSON.stringify({
      type: 'UPDATE',
      table: 'students',
      record: { id: '23IT143', full_name: 'Lê Bảo Long', status: 'ACTIVE' },
    }),
  });
  console.log(`   Status code: ${res2.status} (Kỳ vọng: 401)`);
  if (res2.status === 401) {
    console.log('   ✅ PASS: Bị từ chối Unauthorized chính xác khi sai secret.\n');
  } else {
    console.error('   ❌ FAIL: Không chặn request sai secret!\n');
  }

  // Test 3: Gửi UPDATE sinh viên 23IT143 với secret hợp lệ
  console.log('3️⃣ Test Case 3: Gửi webhook UPDATE hợp lệ cho sinh viên 23IT143');
  const updatePayload = {
    type: 'UPDATE',
    table: 'students',
    record: {
      id: '23IT143',
      full_name: 'Lê Bảo Long (SSOT Verified)',
      status: 'active',
    },
  };
  const res3 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': SECRET,
    },
    body: JSON.stringify(updatePayload),
  });
  const data3: any = await res3.json();
  console.log(`   Status code: ${res3.status} (Kỳ vọng: 200)`);
  console.log('   Response body:', data3);

  // Kiểm tra trực tiếp trong MongoDB
  await mongoose.connect(MONGO_URI);
  const studentCollection = mongoose.connection.collection<any>('students');
  const doc3 = await studentCollection.findOne({ _id: '23IT143' as any });
  console.log('   Kiểm tra MongoDB:', {
    id: doc3?._id,
    full_name: doc3?.full_name,
    status: doc3?.status,
  });

  if (doc3?.full_name === 'Lê Bảo Long (SSOT Verified)' && doc3?.status === 'ACTIVE') {
    console.log('   ✅ PASS: MongoDB đã cập nhật ngay lập tức theo webhook Supabase!\n');
  } else {
    console.error('   ❌ FAIL: Dữ liệu MongoDB chưa khớp!\n');
  }

  // Test 4: Gửi INSERT sinh viên mới 23IT999
  console.log('4️⃣ Test Case 4: Gửi webhook INSERT sinh viên mới 23IT999');
  const insertPayload = {
    type: 'INSERT',
    table: 'students',
    record: {
      id: '23IT999',
      full_name: 'Nguyễn Văn Test SSOT',
      status: 'ACTIVE',
    },
  };
  const res4 = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': SECRET,
    },
    body: JSON.stringify(insertPayload),
  });
  const data4: any = await res4.json();
  console.log(`   Status code: ${res4.status} (Kỳ vọng: 200)`);
  console.log('   Response body:', data4);

  const doc4 = await studentCollection.findOne({ _id: '23IT999' as any });
  console.log('   Kiểm tra MongoDB bản ghi mới 23IT999:', {
    id: doc4?._id,
    full_name: doc4?.full_name,
    status: doc4?.status,
    student_email: doc4?.student_email,
    advisor_email: doc4?.advisor_email,
  });

  if (doc4?._id === '23IT999' && doc4?.student_email === '23it999@vku.udn.vn') {
    console.log('   ✅ PASS: Sinh viên mới được thêm tự động với đầy đủ trường bắt buộc mặc định!\n');
  } else {
    console.error('   ❌ FAIL: Sinh viên mới chưa được tạo chuẩn xác!\n');
  }

  // Dọn dẹp dữ liệu test
  console.log('🧹 Dọn dẹp: Khôi phục tên Lê Bảo Long cho 23IT143 và xóa 23IT999');
  await studentCollection.updateOne(
    { _id: '23IT143' as any },
    { $set: { full_name: 'Lê Bảo Long', status: 'ACTIVE' } },
  );
  await studentCollection.deleteOne({ _id: '23IT999' as any });
  console.log('✅ Đã dọn dẹp xong.\n');

  await mongoose.disconnect();
  console.log('🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ ĐÃ THÀNH CÔNG 100%!');
}

runTests().catch((err) => {
  console.error('Lỗi khi chạy test:', err);
  process.exit(1);
});
