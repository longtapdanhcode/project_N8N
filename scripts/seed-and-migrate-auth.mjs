import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const mongoose = require('../backend/node_modules/mongoose');
const bcrypt = require('../backend/node_modules/bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vku-ai-support';

async function seedAndMigrate() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  const defaultPassword = '123456';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  const users = [
    {
      username: '23IT143',
      studentId: '23IT143',
      fullName: 'Lê Bảo Long',
      email: 'longlb.23it@vku.udn.vn',
      role: 'STUDENT',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: '23IT003',
      studentId: '23IT003',
      fullName: 'Hoàng Lê An',
      email: 'anhl.23it@vku.udn.vn',
      role: 'STUDENT',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.minh',
      fullName: 'TS. Nguyễn Công Minh',
      email: 'minhnc@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.huy',
      fullName: 'ThS. Trần Quốc Huy',
      email: 'huytq@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.ha',
      fullName: 'TS. Nguyễn Thu Hà',
      email: 'hant@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Kỹ thuật Máy tính',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.phuc',
      fullName: 'ThS. Lê Văn Phúc',
      email: 'phuclv@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.dung',
      fullName: 'TS. Đặng Quang Dũng',
      email: 'dungdq@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Khoa học Dữ liệu',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      username: 'gv.demo',
      fullName: 'ThS. Trần Quốc Huy (Demo)',
      email: 'gv.demo@vku.udn.vn',
      role: 'TEACHER',
      department: 'Khoa Công nghệ Thông tin',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  console.log('--- Step 1: Upsert Users in `users` collection ---');
  for (const u of users) {
    await db.collection('users').updateOne(
      { $or: [{ username: u.username }, { email: u.email }] },
      { $set: u },
      { upsert: true }
    );
    console.log(`✓ User ${u.username} (${u.fullName} - ${u.role}) upserted`);
  }

  console.log('--- Step 2: Ensure 23IT112 -> 23IT143 migration in theses, submissions, attendances ---');
  const resTheses = await db.collection('theses').updateMany(
    { studentId: '23IT112' },
    { $set: { studentId: '23IT143', studentName: 'Lê Bảo Long' } }
  );
  console.log(`Migrated theses: ${resTheses.modifiedCount}`);

  const resSubs = await db.collection('submissions').updateMany(
    { studentId: '23IT112' },
    { $set: { studentId: '23IT143', studentName: 'Lê Bảo Long' } }
  );
  console.log(`Migrated submissions: ${resSubs.modifiedCount}`);

  const resAtt1 = await db.collection('attendances').updateMany(
    { student_id: '23IT112' },
    { $set: { student_id: '23IT143' } }
  );
  const resAtt2 = await db.collection('attendances').updateMany(
    { studentId: '23IT112' },
    { $set: { studentId: '23IT143' } }
  );
  console.log(`Migrated attendances: ${resAtt1.modifiedCount + resAtt2.modifiedCount}`);

  // Ensure 23IT003 has a thesis if none exists
  const existing003 = await db.collection('theses').findOne({ studentId: '23IT003' });
  if (!existing003) {
    await db.collection('theses').insertOne({
      topic: 'Hệ thống AI Phân loại Tài liệu Học vụ và Hỗ trợ Tuyển sinh VKU',
      title: 'Hệ thống AI Phân loại Tài liệu Học vụ và Hỗ trợ Tuyển sinh VKU',
      studentId: '23IT003',
      studentName: 'Hoàng Lê An',
      advisorName: 'TS. Nguyễn Công Minh',
      department: 'Khoa Công nghệ Thông tin',
      status: 'IN_PROGRESS',
      defenseStatus: 'ELIGIBLE',
      progress: 60,
      milestones: [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Khảo sát và Phân tích Yêu cầu',
          deadline: '2026-10-30T17:00:00.000Z',
          status: 'COMPLETED',
          aiFeedback: 'Đã hoàn thành xuất sắc tài liệu SRS và sơ đồ kiến trúc hệ thống.',
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Thiết kế RAG Pipeline và Fine-tuning',
          deadline: '2026-11-20T17:00:00.000Z',
          status: 'IN_PROGRESS',
        },
        {
          _id: new mongoose.Types.ObjectId().toString(),
          title: 'Thực nghiệm và Viết Báo cáo Khóa luận',
          deadline: '2026-12-15T17:00:00.000Z',
          status: 'PENDING',
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('✓ Created thesis for 23IT003 (Hoàng Lê An)');
  }

  // Ensure sample attendances for 23IT143 and 23IT003
  const attCount143 = await db.collection('attendances').countDocuments({ student_id: '23IT143' });
  if (attCount143 === 0) {
    await db.collection('attendances').insertMany([
      { student_id: '23IT143', session: 'Buổi 1', status: 'PRESENT', created_at: new Date() },
      { student_id: '23IT143', session: 'Buổi 2', status: 'PRESENT', created_at: new Date() },
      { student_id: '23IT143', session: 'Buổi 3', status: 'PRESENT', created_at: new Date() },
    ]);
    console.log('✓ Added attendances for 23IT143');
  }

  const attCount003 = await db.collection('attendances').countDocuments({ student_id: '23IT003' });
  if (attCount003 === 0) {
    await db.collection('attendances').insertMany([
      { student_id: '23IT003', session: 'Buổi 1', status: 'PRESENT', created_at: new Date() },
      { student_id: '23IT003', session: 'Buổi 2', status: 'PRESENT', created_at: new Date() },
      { student_id: '23IT003', session: 'Buổi 3', status: 'PRESENT', created_at: new Date() },
    ]);
    console.log('✓ Added attendances for 23IT003');
  }

  console.log('=== Database seed & migration completed successfully! ===');
  await mongoose.disconnect();
}

seedAndMigrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
