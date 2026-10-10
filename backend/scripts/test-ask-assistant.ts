import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';

async function main() {
  console.log('--- KIỂM TRA RAG PIPELINE VỚI STRUCTURED OUTPUTS (CARD 2.3) ---\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error', 'log'],
  });
  const aiService = app.get(AiService);

  console.log('✓ Injected AiService thành công.\n');

  // Test Case 1: Câu hỏi trong phạm vi tài liệu (Quy chế học vụ VKU)
  const questionInScope = 'Sinh viên nghỉ học quá 20% số buổi thì có được dự thi không?';
  console.log(`[TEST 1] Câu hỏi trong phạm vi tài liệu:\n"${questionInScope}"\n`);
  try {
    const res1 = await aiService.askAssistant(questionInScope);
    console.log('Kết quả Structured Output (Test 1):');
    console.log(JSON.stringify(res1, null, 2));
  } catch (error) {
    console.error('Lỗi Test 1:', error);
  }

  console.log('\n------------------------------------------------------------\n');

  // Test Case 2: Câu hỏi ngoài phạm vi tài liệu (Học phí, tài chính)
  const questionOutOfScope = 'Học phí kỳ 1 năm học 2026-2027 ngành Khoa học dữ liệu là bao nhiêu?';
  console.log(`[TEST 2] Câu hỏi ngoài phạm vi tài liệu:\n"${questionOutOfScope}"\n`);
  try {
    const res2 = await aiService.askAssistant(questionOutOfScope);
    console.log('Kết quả Structured Output (Test 2):');
    console.log(JSON.stringify(res2, null, 2));
  } catch (error) {
    console.error('Lỗi Test 2:', error);
  }

  await app.close();
}

main().catch(console.error);
