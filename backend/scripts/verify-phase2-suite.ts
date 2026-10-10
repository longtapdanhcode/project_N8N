import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';
import { GeminiService } from '../src/modules/ai/gemini.service';
import { SupabaseService } from '../src/modules/ai/supabase.service';

interface TestCaseResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  errorDetails?: string;
  payload?: any;
  expected?: string;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

function padEndVisible(str: string, targetLength: number): string {
  const visibleLen = stripAnsi(str).length;
  const padding = targetLength > visibleLen ? ' '.repeat(targetLength - visibleLen) : '';
  return str + padding;
}

function printReportTable(results: TestCaseResult[]): void {
  const col1Width = 46;
  const col2Width = 8;

  const topBorder    = `┌${'─'.repeat(col1Width)}┬${'─'.repeat(col2Width)}┐`;
  const headerRow    = `│ ${padEndVisible('Test Case', col1Width - 1)}│ ${padEndVisible('Status', col2Width - 1)}│`;
  const midBorder    = `├${'─'.repeat(col1Width)}┼${'─'.repeat(col2Width)}┤`;
  const bottomBorder = `└${'─'.repeat(col1Width)}┴${'─'.repeat(col2Width)}┘`;

  console.log('\n' + topBorder);
  console.log(headerRow);
  console.log(midBorder);

  for (const r of results) {
    const statusFormatted =
      r.status === 'PASSED'
        ? '\x1b[32mPASSED\x1b[0m'
        : '\x1b[31mFAILED\x1b[0m';
    const row = `│ ${padEndVisible(r.name, col1Width - 1)}│ ${padEndVisible(statusFormatted, col2Width - 1)}│`;
    console.log(row);
  }

  console.log(bottomBorder + '\n');
}

async function runVerificationSuite() {
  console.log('================================================================================');
  console.log('       AUTOMATED VERIFICATION SUITE: PHASE 2 (AI CORE & STRUCTURED OUTPUTS)     ');
  console.log('================================================================================\n');

  console.log('Khởi tạo NestJS Application Context...');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const geminiService = app.get(GeminiService);
  const supabaseService = app.get(SupabaseService);
  const aiService = app.get(AiService);

  const testResults: TestCaseResult[] = [];

  // ============================================================================
  // Test Case 1: Semantic Embedding & Supabase Vector Connection
  // ============================================================================
  const tc1: TestCaseResult = {
    name: '1. Gemini Embedding (768-dim)',
    status: 'PASSED',
  };
  try {
    console.log('-> [Test 1] Đang kiểm tra Gemini Embedding & Supabase Connection...');
    const sampleText = 'Quy chế đào tạo và quản lý học vụ VKU năm học 2026';
    const embedding = await geminiService.generateEmbedding(sampleText);

    if (!Array.isArray(embedding)) {
      throw new Error(`Vector embedding không phải là mảng. Nhận được: ${typeof embedding}`);
    }

    if (embedding.length !== 768) {
      throw new Error(`Độ dài vector embedding không phải 768 chiều. Nhận được: ${embedding.length} chiều.`);
    }

    const allNumbers = embedding.every((val) => typeof val === 'number' && !isNaN(val));
    if (!allNumbers) {
      throw new Error('Vector embedding chứa phần tử không phải dạng number hợp lệ.');
    }

    // Kiểm tra kết nối Supabase và quyền truy cập bảng public.documents
    const { data, error } = await supabaseService
      .getClient()
      .from('documents')
      .select('id, title, embedding')
      .limit(1);

    if (error) {
      throw new Error(`Không thể kết nối hoặc truy vấn bảng 'documents' trên Supabase: ${error.message}`);
    }

    if (!Array.isArray(data)) {
      throw new Error(`Dữ liệu documents trả về không hợp lệ: ${JSON.stringify(data)}`);
    }

    tc1.status = 'PASSED';
  } catch (err: any) {
    tc1.status = 'FAILED';
    tc1.errorDetails = err?.message || String(err);
    tc1.expected = 'Mảng vector 768 số thực và kết nối thành công bảng documents trên Supabase';
  }
  testResults.push(tc1);

  // ============================================================================
  // Test Case 2: Hybrid Search (RRF) & Database RPC
  // ============================================================================
  const tc2: TestCaseResult = {
    name: '2. Hybrid Search RRF Ranking',
    status: 'PASSED',
  };
  try {
    console.log('-> [Test 2] Đang kiểm tra Hybrid Search (RRF) trên Supabase RPC...');
    const query = 'Quy chế học vụ VKU vắng quá 20%';
    const results = await aiService.hybridSearch(query, { matchCount: 5 });

    if (!Array.isArray(results) || results.length === 0) {
      throw new Error(`Không tìm thấy kết quả nào từ Hybrid Search (kết quả rỗng).`);
    }

    // Assert trường score tồn tại và xếp hạng giảm dần
    for (let i = 0; i < results.length; i++) {
      const item = results[i];
      if (typeof item.score !== 'number' || isNaN(item.score)) {
        throw new Error(`Kết quả tại vị trí [${i}] không có trường 'score' hợp lệ. Nhận được: ${item.score}`);
      }

      if (i > 0) {
        const prevScore = results[i - 1].score;
        const currentScore = item.score;
        if (currentScore > prevScore) {
          throw new Error(
            `Xếp hạng RRF không giảm dần: Kết quả [${i}] (score: ${currentScore}) > Kết quả [${i - 1}] (score: ${prevScore})`,
          );
        }
      }
    }

    tc2.status = 'PASSED';
  } catch (err: any) {
    tc2.status = 'FAILED';
    tc2.errorDetails = err?.message || String(err);
    tc2.expected = 'Mảng kết quả chứa score dạng số và được xếp hạng giảm dần';
  }
  testResults.push(tc2);

  // ============================================================================
  // Test Case 3A: LLM Structured Output Compliance (In-domain)
  // ============================================================================
  const tc3a: TestCaseResult = {
    name: '3A. Structured Output (In-domain)',
    status: 'PASSED',
  };
  try {
    console.log('-> [Test 3A] Đang kiểm tra RAG Structured Output với câu hỏi trong phạm vi tài liệu...');
    const inDomainQuestion = 'Sinh viên vắng quá 20% số tiết thì bị xử lý thế nào?';
    const response3A = await aiService.askAssistant(inDomainQuestion);
    tc3a.payload = response3A;

    // Assert answer là chuỗi không rỗng
    if (typeof response3A.answer !== 'string' || response3A.answer.trim().length === 0) {
      throw new Error(`Trường 'answer' rỗng hoặc không phải chuỗi.`);
    }

    // Assert confidence_score >= 0.7
    if (typeof response3A.confidence_score !== 'number' || response3A.confidence_score < 0.7) {
      throw new Error(`'confidence_score' phải >= 0.7. Nhận được: ${response3A.confidence_score}`);
    }

    // Assert citations chứa tài liệu liên quan
    if (
      !Array.isArray(response3A.citations) ||
      response3A.citations.length === 0 ||
      !response3A.citations.some((c) =>
        c.toLowerCase().includes('quy chế') || c.toLowerCase().includes('vku'),
      )
    ) {
      throw new Error(
        `'citations' phải chứa tài liệu tham khảo liên quan (ví dụ 'Quy chế học vụ VKU'). Nhận được: ${JSON.stringify(
          response3A.citations,
        )}`,
      );
    }

    // Assert requires_human_escalation === false
    if (response3A.requires_human_escalation !== false) {
      throw new Error(
        `'requires_human_escalation' phải là false cho câu hỏi có trong tài liệu. Nhận được: ${response3A.requires_human_escalation}`,
      );
    }

    tc3a.status = 'PASSED';
  } catch (err: any) {
    tc3a.status = 'FAILED';
    tc3a.errorDetails = err?.message || String(err);
    tc3a.expected =
      'answer không rỗng, confidence_score >= 0.7, citations có tài liệu, requires_human_escalation === false';
  }
  testResults.push(tc3a);

  // ============================================================================
  // Test Case 3B: LLM Structured Output Compliance (Out-domain Escalation)
  // ============================================================================
  const tc3b: TestCaseResult = {
    name: '3B. Structured Output Escalation (Out-domain)',
    status: 'PASSED',
  };
  try {
    console.log('-> [Test 3B] Đang kiểm tra RAG Structured Output với câu hỏi ngoài phạm vi tài liệu...');
    const outDomainQuestion = 'Học phí ngành CNTT năm 2030 là bao nhiêu?';
    const response3B = await aiService.askAssistant(outDomainQuestion);
    tc3b.payload = response3B;

    // Assert requires_human_escalation === true
    if (response3B.requires_human_escalation !== true) {
      throw new Error(
        `'requires_human_escalation' phải là true cho câu hỏi ngoài phạm vi tài liệu. Nhận được: ${response3B.requires_human_escalation}`,
      );
    }

    // Assert confidence_score < 0.6
    if (typeof response3B.confidence_score !== 'number' || response3B.confidence_score >= 0.6) {
      throw new Error(
        `'confidence_score' phải < 0.6 cho câu hỏi ngoài phạm vi. Nhận được: ${response3B.confidence_score}`,
      );
    }

    tc3b.status = 'PASSED';
  } catch (err: any) {
    tc3b.status = 'FAILED';
    tc3b.errorDetails = err?.message || String(err);
    tc3b.expected = 'requires_human_escalation === true, confidence_score < 0.6';
  }
  testResults.push(tc3b);

  await app.close();

  // ============================================================================
  // Báo cáo kết quả
  // ============================================================================
  printReportTable(testResults);

  const hasFailed = testResults.some((t) => t.status === 'FAILED');

  if (hasFailed) {
    console.error('\x1b[31m[CHI TIẾT LỖI XÁC THỰC]:\x1b[0m');
    for (const t of testResults) {
      if (t.status === 'FAILED') {
        console.error(`\n❌ [${t.name}]:`);
        console.error(`   - Lỗi gặp phải : ${t.errorDetails}`);
        console.error(`   - Giá trị kỳ vọng: ${t.expected}`);
        if (t.payload) {
          console.error(`   - Payload nhận được: ${JSON.stringify(t.payload, null, 2)}`);
        }
      }
    }
    console.error('\n❌ VERIFICATION FAILED: Một hoặc nhiều test case không đạt yêu cầu.\n');
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ PHASE 2 VERIFICATION COMPLETE: Toàn bộ 4/4 kiểm thử đều PASSED thành công!\x1b[0m\n');
    process.exit(0);
  }
}

runVerificationSuite().catch((err) => {
  console.error('Lỗi nghiêm trọng khi chạy verification suite:', err);
  process.exit(1);
});
