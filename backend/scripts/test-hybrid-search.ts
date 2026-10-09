import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';
import { SupabaseService } from '../src/modules/ai/supabase.service';

async function main() {
  console.log('--- KIỂM TRA HYBRID SEARCH (RRF) TRÊN NESTJS & SUPABASE ---');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error', 'log'] });
  const aiService = app.get(AiService);
  const supabaseService = app.get(SupabaseService);

  console.log('✓ Injected AiService và SupabaseService thành công.');

  const testQuery = 'Quy chế học vụ vắng học quá 20% số tiết';
  console.log(`\nĐang thực hiện Hybrid Search với từ khóa: "${testQuery}"...`);

  try {
    const results = await aiService.hybridSearch(testQuery, {
      matchCount: 5,
      rrfK: 60,
      fullTextWeight: 1.0,
      semanticWeight: 1.0,
    });

    console.log(`\n✓ Tìm thấy ${results.length} kết quả phù hợp:`);
    results.forEach((item, index) => {
      console.log(`\n[#${index + 1}] Điểm RRF Score: ${item.score}`);
      console.log(` Tiêu đề: ${item.title}`);
      console.log(` Nội dung: ${item.content}`);
      console.log(` Metadata: ${JSON.stringify(item.metadata)}`);
    });
  } catch (error: any) {
    if (error?.message?.includes('hybrid_search_rrf') || error?.code === 'PGRST202') {
      console.warn('\n[LƯU Ý]: Hàm RPC `hybrid_search_rrf` chưa được tạo trên Supabase Project.');
      console.warn('Vui lòng mở Supabase Dashboard -> SQL Editor và chạy nội dung file:');
      console.warn('backend/scripts/hybrid_search_rrf.sql');
    } else {
      console.error('Lỗi khi thực hiện Hybrid Search:', error);
    }
  }

  await app.close();
}

main().catch(console.error);
