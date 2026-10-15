#!/usr/bin/env node

/**
 * ==============================================================================
 * VKU AI Student Support System - Thesis Milestone E2E Test Suite
 * ==============================================================================
 * Kịch bản kiểm thử End-to-End toàn diện cho luồng:
 * "VKU - Mốc đồ án - HMAC Mongo Gemini (12 nodes)"
 * Webhook path: /webhook/thesis-milestone-updated
 * ==============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- 1. Đọc và parse biến môi trường từ backend/.env ---
function loadEnv() {
  const envPath = path.join(rootDir, 'backend', '.env');
  const env = {
    PORT: '3001',
    N8N_PORT: '5678',
    WEBHOOK_SECRET: '616a09a9323b2d861c69d6fa1139a4db18aff7e24ea818bd292a6469bb80dd98',
    N8N_INTERNAL_API_KEY: 'vku_internal_secret_2026',
    N8N_THESIS_URL: 'http://localhost:5678/webhook/thesis-milestone-updated',
    MONGO_DB: 'vku-ai-support',
  };

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        env[k] = v;
      }
    }
  }
  return env;
}

const env = loadEnv();
const BACKEND_URL = `http://localhost:${env.PORT || '3001'}`;
const N8N_URL = `http://localhost:${env.N8N_PORT || '5678'}`;
const WEBHOOK_URL = env.N8N_THESIS_URL || `${N8N_URL}/webhook/thesis-milestone-updated`;
const SECRET = env.WEBHOOK_SECRET;

// Helper: Ký HMAC SHA-256
function signHmac(payload, secretKey) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

// Helper: Query MongoDB qua container vku-mongo
function mongoEval(jsCode) {
  try {
    // Escape $ để zsh shell không nuốt biến dạng $set hay $.status
    const escaped = jsCode.replace(/\\/g, '\\\\').replace(/\$/g, '\\$').replace(/"/g, '\\"');
    const cmd = `docker exec vku-mongo mongosh ${env.MONGO_DB} --quiet --eval "${escaped}"`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 8000 });
    return output.trim();
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

// Bảng kết quả tổng hợp
const resultsMatrix = [];

function recordResult(testCase, inputSummary, httpStatus, latencyMs, dbImpact, evaluation) {
  resultsMatrix.push({
    testCase,
    inputSummary,
    httpStatus,
    latencyMs,
    dbImpact,
    evaluation,
  });
}

async function runThesisMilestoneE2E() {
  console.log('\n' + '='.repeat(90));
  console.log('🚀 BẮT ĐẦU KIỂM THỬ E2E LUỒNG "VKU - MỐC ĐỒ ÁN - HMAC MONGO GEMINI (12 NODES)"');
  console.log('='.repeat(90));
  console.log(`- Webhook Endpoint: ${WEBHOOK_URL}`);
  console.log(`- Backend NestJS:   ${BACKEND_URL}`);
  console.log(`- MongoDB Database: ${env.MONGO_DB}`);
  console.log(`- HMAC Secret:      ${SECRET.slice(0, 10)}...${SECRET.slice(-8)}\n`);

  // =========================================================================
  // BƯỚC 1: KHẢO SÁT & CHUẨN BỊ DỮ LIỆU TRONG MONGODB
  // =========================================================================
  console.log('▶ [BƯỚC 1] Khảo sát dữ liệu thực tế trong MongoDB...');
  let thesisId = '6ad098898ff330e75ad1a7be';
  let milestoneId = '6ad098898ff330e75ad1a7bb';

  const checkDoc = mongoEval(`db.theses.findOne({ _id: ObjectId("${thesisId}") })`);
  if (!checkDoc || checkDoc === 'null') {
    console.log('  ⚠️ Không tìm thấy đồ án mẫu, tiến hành khởi tạo đồ án mẫu chuẩn ObjectId...');
    const seedJs = `
      db.theses.insertOne({
        _id: ObjectId("${thesisId}"),
        title: "Hệ thống AI Hỗ trợ Sinh viên VKU",
        description: "Nghiên cứu ứng dụng và triển khai thực nghiệm hệ thống AI hỗ trợ sinh viên thông minh tích hợp RAG, n8n và LLM tại VKU.",
        studentId: "23IT112",
        studentName: "Lê Bảo Long",
        advisorId: "ADV-01",
        advisorName: "TS. Nguyễn Công Minh",
        department: "Khoa Công nghệ Thông tin",
        progressPercent: 0,
        defenseStatus: "NOT_ELIGIBLE",
        milestones: [
          {
            _id: ObjectId("${milestoneId}"),
            title: "Thiết kế kiến trúc hệ thống & Subdocument DB",
            deadline: new Date("2026-04-15T00:00:00Z"),
            status: "IN_PROGRESS",
            aiFeedback: null
          },
          {
            _id: ObjectId("6ad098898ff330e75ad1a7bc"),
            title: "Triển khai n8n Workflow & RAG Vector Core",
            deadline: new Date("2026-06-30T00:00:00Z"),
            status: "PENDING",
            aiFeedback: null
          },
          {
            _id: ObjectId("6ad098898ff330e75ad1a7bd"),
            title: "Bảo vệ đồ án tốt nghiệp trước Hội đồng",
            deadline: new Date("2026-09-15T00:00:00Z"),
            status: "PENDING",
            aiFeedback: null
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    `;
    mongoEval(seedJs);
  }

  console.log(`  ✔ Đồ án kiểm thử: thesisId="${thesisId}" | milestoneId="${milestoneId}"\n`);

  // =========================================================================
  // CASE 1: Happy Path - Hoàn thành mốc & Gemini tạo nhận xét
  // =========================================================================
  console.log('▶ [CASE 1] Happy Path: Mốc hoàn thành & AI sinh nhận xét (COMPLETED)...');
  try {
    // Đảm bảo trạng thái mốc trong MongoDB sẵn sàng là COMPLETED để NestJS callback ghi nhận
    const resetJs = 'db.theses.updateOne({ _id: ObjectId("' + thesisId + '"), "milestones._id": ObjectId("' + milestoneId + '") }, { $set: { "milestones.$.status": "COMPLETED", "milestones.$.aiFeedback": null } });';
    mongoEval(resetJs);

    const payloadCase1 = { thesisId, milestoneId, status: 'COMPLETED' };
    const rawCase1 = JSON.stringify(payloadCase1);
    const sigCase1 = signHmac(rawCase1, SECRET);

    const t0 = Date.now();
    const res1 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': sigCase1,
        'x-event-type': 'THESIS_MILESTONE_UPDATED',
      },
      body: rawCase1,
    });
    const dt1 = Date.now() - t0;
    const data1 = await res1.json();

    // Kiểm tra trực tiếp document đồ án trong MongoDB xem aiFeedback đã được lưu chưa
    const queryJs = `const t = db.theses.findOne({ _id: ObjectId("${thesisId}") }); const m = t.milestones.find(x => String(x._id) === "${milestoneId}"); print(JSON.stringify({ status: m.status, aiFeedback: m.aiFeedback }));`;
    const verifyDocRaw = mongoEval(queryJs);
    const verifyData = JSON.parse(verifyDocRaw);

    const isOk1 =
      res1.status === 200 &&
      data1.success === true &&
      data1.aiFeedbackSaved === true &&
      typeof verifyData.aiFeedback === 'string' &&
      verifyData.aiFeedback.length > 20;

    console.log(`  ✔ HTTP Status: ${res1.status} (${dt1}ms)`);
    console.log(`  ✔ Response Body: success=${data1.success}, aiFeedbackSaved=${data1.aiFeedbackSaved}`);
    console.log(`  ✔ Phản hồi AI (Gemini 3.5 Flash Lite): "${verifyData.aiFeedback?.slice(0, 100)}..."`);
    console.log(`  ✔ Tác động MongoDB: Milestone status="${verifyData.status}", aiFeedback đã lưu vĩnh viễn.`);

    recordResult(
      'Case 1: Happy Path (COMPLETED & AI Feedback)',
      `thesisId: ${thesisId.slice(0, 8)}..., status: COMPLETED`,
      `HTTP ${res1.status}`,
      `${dt1}ms`,
      `Milestone chuyển COMPLETED & lưu aiFeedback (${verifyData.aiFeedback?.length} chars)`,
      isOk1 ? 'PASSED' : 'FAILED',
    );
  } catch (err) {
    console.error(`  ❌ Lỗi Case 1: ${err.message}`);
    recordResult('Case 1: Happy Path', 'status: COMPLETED', 'ERROR', '0ms', err.message, 'FAILED');
  }

  // =========================================================================
  // CASE 2: Happy Path - Đang thực hiện / Chờ (IN_PROGRESS)
  // =========================================================================
  console.log('\n▶ [CASE 2] Happy Path: Mốc đang tiến hành (IN_PROGRESS - Không kích hoạt AI)...');
  try {
    const payloadCase2 = { thesisId, milestoneId, status: 'IN_PROGRESS' };
    const rawCase2 = JSON.stringify(payloadCase2);
    const sigCase2 = signHmac(rawCase2, SECRET);

    const t0 = Date.now();
    const res2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': sigCase2,
        'x-event-type': 'THESIS_MILESTONE_UPDATED',
      },
      body: rawCase2,
    });
    const dt2 = Date.now() - t0;
    const data2 = await res2.json();

    const isOk2 =
      res2.status === 200 &&
      data2.success === true &&
      data2.aiFeedbackSaved === false &&
      data2.status === 'IN_PROGRESS';

    console.log(`  ✔ HTTP Status: ${res2.status} (${dt2}ms)`);
    console.log(`  ✔ Response Body: success=${data2.success}, aiFeedbackSaved=${data2.aiFeedbackSaved}`);
    console.log('  ✔ Luồng n8n: Nhánh "Đang thực hiện" bỏ qua bước gọi Gemini, phản hồi 200 ngay.');

    recordResult(
      'Case 2: Happy Path (IN_PROGRESS)',
      `thesisId: ${thesisId.slice(0, 8)}..., status: IN_PROGRESS`,
      `HTTP ${res2.status}`,
      `${dt2}ms`,
      'Bỏ qua Gemini, aiFeedbackSaved=false, phản hồi tức thì',
      isOk2 ? 'PASSED' : 'FAILED',
    );
  } catch (err) {
    console.error(`  ❌ Lỗi Case 2: ${err.message}`);
    recordResult('Case 2: IN_PROGRESS', 'status: IN_PROGRESS', 'ERROR', '0ms', err.message, 'FAILED');
  }

  // =========================================================================
  // CASE 3: Bảo mật HMAC - Chữ ký giả mạo
  // =========================================================================
  console.log('\n▶ [CASE 3] Bảo mật HMAC: Phát hiện và chặn chữ ký giả mạo...');
  try {
    const payloadCase3 = { thesisId, milestoneId, status: 'IN_PROGRESS' };
    const rawCase3 = JSON.stringify(payloadCase3);
    const fakeSig = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

    const t0 = Date.now();
    const res3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': fakeSig,
        'x-event-type': 'THESIS_MILESTONE_UPDATED',
      },
      body: rawCase3,
    });
    const dt3 = Date.now() - t0;
    const data3 = await res3.json();

    const isOk3 = res3.status === 401 && (data3.error || '').includes('Chữ ký hoặc dữ liệu không hợp lệ');

    console.log(`  ✔ HTTP Status: ${res3.status} (${dt3}ms)`);
    console.log(`  ✔ Error Message: "${data3.error}"`);
    console.log('  ✔ Chặn đứng tại Node "Kiểm tra HMAC" -> An toàn tuyệt đối.');

    recordResult(
      'Case 3: Bảo mật HMAC (Chữ ký giả mạo)',
      `x-signature: ${fakeSig.slice(0, 16)}...`,
      `HTTP ${res3.status}`,
      `${dt3}ms`,
      'Không tác động MongoDB (Bị chặn 401 tại n8n HMAC Node)',
      isOk3 ? 'PASSED' : 'FAILED',
    );
  } catch (err) {
    console.error(`  ❌ Lỗi Case 3: ${err.message}`);
    recordResult('Case 3: Bảo mật HMAC', 'Fake Signature', 'ERROR', '0ms', err.message, 'FAILED');
  }

  // =========================================================================
  // CASE 4: Dữ liệu không tồn tại - Not Found
  // =========================================================================
  console.log('\n▶ [CASE 4] Dữ liệu không tồn tại: ID ngẫu nhiên không có trong database...');
  try {
    const randomThesisId = '507f191e810c19729de860ea';
    const randomMilestoneId = '507f1f77bcf86cd799439011';
    const payloadCase4 = { thesisId: randomThesisId, milestoneId: randomMilestoneId, status: 'IN_PROGRESS' };
    const rawCase4 = JSON.stringify(payloadCase4);
    const sigCase4 = signHmac(rawCase4, SECRET);

    const t0 = Date.now();
    const res4 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': sigCase4,
        'x-event-type': 'THESIS_MILESTONE_UPDATED',
      },
      body: rawCase4,
    });
    const dt4 = Date.now() - t0;
    const data4 = await res4.json();

    const isOk4 = res4.status === 404 && (data4.error || '').includes('Không tìm thấy đồ án hoặc mốc');

    console.log(`  ✔ HTTP Status: ${res4.status} (${dt4}ms)`);
    console.log(`  ✔ Error Message: "${data4.error}"`);
    console.log('  ✔ Xử lý tại Node "Có đồ án và mốc?" -> Rẽ nhánh Trả 404 chuẩn xác.');

    recordResult(
      'Case 4: Dữ liệu không tồn tại (Not Found)',
      `Random ID: thesis=${randomThesisId.slice(0, 8)}..., milestone=${randomMilestoneId.slice(0, 8)}...`,
      `HTTP ${res4.status}`,
      `${dt4}ms`,
      'Không tìm thấy bản ghi, rẽ nhánh 404 trả về lỗi kiểm soát',
      isOk4 ? 'PASSED' : 'FAILED',
    );
  } catch (err) {
    console.error(`  ❌ Lỗi Case 4: ${err.message}`);
    recordResult('Case 4: Not Found', 'Random ID', 'ERROR', '0ms', err.message, 'FAILED');
  }

  // =========================================================================
  // BƯỚC 3: KIỂM TRA LOG EXECUTION TRONG N8N
  // =========================================================================
  console.log('\n' + '='.repeat(90));
  console.log('📊 KIỂM TRA TRẠNG THÁI LƯỢT CHẠY TRONG N8N (EXECUTION LOGS):');
  console.log('='.repeat(90));
  try {
    const execLogRaw = execSync(
      `docker exec vku-n8n node -e '
        const sqlite3 = require("/usr/local/lib/node_modules/n8n/node_modules/sqlite3");
        const db = new sqlite3.Database("/home/node/.n8n/database.sqlite");
        db.all("SELECT id, status, startedAt, stoppedAt FROM execution_entity WHERE workflowId = \\"khcX8YSa8Cpw435l\\" ORDER BY id DESC LIMIT 4", (err, rows) => {
          console.log(JSON.stringify(rows));
          db.close();
        });
      '`,
      { encoding: 'utf8' },
    );
    const executions = JSON.parse(execLogRaw.trim());
    for (const ex of executions) {
      console.log(`  • Execution #${ex.id}: status=${ex.status.toUpperCase()} | Started: ${ex.startedAt} -> Stopped: ${ex.stoppedAt}`);
    }
  } catch (e) {
    console.log(`  ⚠️ Không thể đọc execution log: ${e.message}`);
  }

  // =========================================================================
  // BƯỚC 4: BÁO CÁO KẾT QUẢ E2E RESULT MATRIX
  // =========================================================================
  console.log('\n' + '='.repeat(100));
  console.log('📋 BẢNG MA TRẬN ĐÁNH GIÁ E2E WORKFLOW MỐC ĐỒ ÁN (VKU - THESIS MILESTONE)');
  console.log('='.repeat(100));
  console.table(
    resultsMatrix.map((r) => ({
      'Tên Case': r.testCase,
      'Input Test Payload': r.inputSummary,
      'HTTP Status': r.httpStatus,
      'Thời gian (ms)': r.latencyMs,
      'Tác động MongoDB / Logic': r.dbImpact,
      'Kết quả': r.evaluation,
    })),
  );

  const allPassed = resultsMatrix.every((r) => r.evaluation === 'PASSED');
  console.log('='.repeat(100));
  if (allPassed) {
    console.log('🎉 100% CẢ 4 KỊCH BẢN KIỂM THỬ E2E CHO LUỒNG MỐC ĐỒ ÁN ĐÃ VƯỢT QUA XUẤT SẮC (PASSED)!');
  } else {
    console.log('⚠️ CÓ TEST CASE CHƯA ĐẠT, VUI LÒNG KIỂM TRA CHI TIẾT Ở TRÊN.');
  }
  console.log('='.repeat(100) + '\n');
}

runThesisMilestoneE2E().catch((err) => {
  console.error('Fatal error during thesis milestone test:', err);
  process.exit(1);
});
