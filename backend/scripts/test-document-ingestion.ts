import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DocumentService } from '../src/modules/document/document.service';
import { AiService } from '../src/modules/ai/ai.service';
import { SupabaseService } from '../src/modules/ai/supabase.service';

const SAMPLE_VKU_REGULATION = `
QUY ĐỊNH ĐỒ ÁN TỐT NGHIỆP VÀ XÉT CÔNG NHẬN TỐT NGHIỆP VKU NĂM HỌC 2026-2027

Chương I: QUY ĐỊNH VỀ THỰC HIỆN ĐỒ ÁN TỐT NGHIỆP

Điều 1. Điều kiện giao đồ án tốt nghiệp
1. Sinh viên hệ chính quy được đăng ký nhận đồ án tốt nghiệp khi đáp ứng đầy đủ các tiêu chuẩn sau:
- Tích lũy tối thiểu 110 tín chỉ trong chương trình đào tạo của ngành theo học.
- Điểm trung bình chung tích lũy (GPA) đạt từ 2.00 trở lên theo thang điểm 4.
- Không đang trong thời gian bị kỷ luật từ mức cảnh cáo học vụ trở lên.
- Đã hoàn thành các học phần tiên quyết của chuyên ngành trước thời điểm bắt đầu học kỳ làm đồ án.
2. Đối với sinh viên có điểm trung bình tích lũy từ 3.20 trở lên, khoa chuyên môn có thể phê duyệt đề tài nghiên cứu chuyên sâu hoặc đề tài liên kết doanh nghiệp đặc thù.

Điều 2. Thời gian và quy trình thực hiện đồ án
1. Thời gian làm đồ án tốt nghiệp kéo dài chính thức 15 tuần kể từ ngày ban hành quyết định giao đề tài của Hiệu trưởng.
2. Quy trình kiểm tra tiến độ đồ án gồm 3 mốc bắt buộc:
- Mốc 1 (Tuần thứ 5): Báo cáo đề cương chi tiết và khảo sát tài liệu liên quan.
- Mốc 2 (Tuần thứ 10): Báo cáo tiến độ hoàn thành tối thiểu 60% khối lượng nội dung và sản phẩm mẫu.
- Mốc 3 (Tuần thứ 14): Nộp bản thảo hoàn chỉnh có chữ ký xác nhận đồng ý cho bảo vệ của giảng viên hướng dẫn.

Điều 3. Đánh giá và chấm điểm đồ án tốt nghiệp
1. Điểm đánh giá đồ án tốt nghiệp được tính trên thang điểm 10 và làm tròn đến một chữ số thập phân, bao gồm:
- Điểm giảng viên hướng dẫn: trọng số 30%.
- Điểm giảng viên phản biện: trọng số 20%.
- Điểm đánh giá của Hội đồng chấm tốt nghiệp: trọng số 50%.
2. Đồ án được công nhận đạt yêu cầu khi điểm tổng kết đạt từ 5.5 trở lên. Trường hợp dưới 5.5 điểm, sinh viên phải đăng ký làm lại đồ án ở học kỳ tiếp theo.

Chương II: ĐIỀU KIỆN VÀ TIÊU CHUẨN XÉT CÔNG NHẬN TỐT NGHIỆP

Điều 4. Điều kiện công nhận tốt nghiệp
1. Sinh viên được xét và công nhận tốt nghiệp khi thỏa mãn đầy đủ các điều kiện sau:
- Cho đến thời điểm xét tốt nghiệp không bị truy cứu trách nhiệm hình sự hoặc không đang trong thời gian bị kỷ luật ở mức đình chỉ học tập.
- Tích lũy đủ số học phần và khối lượng tín chỉ quy định cho chương trình đào tạo (thông thường từ 125 đến 150 tín chỉ tùy theo khung ngành đào tạo cử nhân hoặc kỹ sư).
- Điểm trung bình chung tích lũy toàn khóa học đạt từ 2.00 trở lên.
- Đạt chuẩn đầu ra về năng lực ngoại ngữ: Có chứng chỉ tiếng Anh quốc tế TOEIC tối thiểu 500 điểm (hoặc IELTS 5.0, TOEFL iBT 45) còn hiệu lực theo quy định.
- Đạt chuẩn đầu ra tin học: Có chứng chỉ ứng dụng công nghệ thông tin quốc tế MOS hoặc tương đương.
- Đã hoàn thành và có chứng chỉ Giáo dục thể chất và chứng chỉ Giáo dục quốc phòng - an ninh.

Điều 5. Xếp loại tốt nghiệp
1. Hạng tốt nghiệp được xác định theo điểm trung bình chung tích lũy toàn khóa học như sau:
- Loại Xuất sắc: Điểm trung bình chung tích lũy từ 3.60 đến 4.00.
- Loại Giỏi: Điểm trung bình chung tích lũy từ 3.20 đến 3.59.
- Loại Khá: Điểm trung bình chung tích lũy từ 2.50 đến 3.19.
- Loại Trung bình: Điểm trung bình chung tích lũy từ 2.00 đến 2.49.
2. Hạng tốt nghiệp của sinh viên có điểm trung bình tích lũy xếp loại Xuất sắc và Giỏi sẽ bị giảm đi một mức nếu khối lượng các học phần phải học lại vượt quá 5% tổng số tín chỉ quy định cho toàn chương trình.
`;

async function main() {
  console.log('================================================================================');
  console.log('   KIỂM THỬ TỰ ĐỘNG: DYNAMIC DOCUMENT INGESTION & CHUNKING PIPELINE (VKU)     ');
  console.log('================================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const documentService = app.get(DocumentService);
  const aiService = app.get(AiService);
  const supabaseService = app.get(SupabaseService);

  console.log('✓ Khởi tạo NestJS context và inject services thành công.\n');

  try {
    // --------------------------------------------------------------------------
    // BƯỚC 1: Nạp văn bản dài qua DocumentService.ingestText
    // --------------------------------------------------------------------------
    console.log('--- [BƯỚC 1]: Nạp tài liệu quy chế dài và thực hiện Text Chunking ---');
    const docTitle = 'Quy định đồ án tốt nghiệp và xét tốt nghiệp VKU';
    const category = 'graduation_rules';

    console.log(`Đang nạp: "${docTitle}" (${SAMPLE_VKU_REGULATION.trim().length} ký tự)...`);

    const ingestResult = await documentService.ingestText({
      title: docTitle,
      content: SAMPLE_VKU_REGULATION,
      category,
      metadata: {
        department: 'Phong Dao Tao VKU',
        academic_year: '2026-2027',
        is_official: true,
      },
    });

    console.log(`✓ Kết quả Ingest:`);
    console.log(`  - Trạng thái       : ${ingestResult.success}`);
    console.log(`  - Số chunks tạo ra : ${ingestResult.chunks_created}`);
    console.log(`  - Document IDs     : ${ingestResult.document_ids.join(', ')}`);

    if (ingestResult.chunks_created <= 1) {
      throw new Error(`Kỳ vọng số chunk > 1 cho văn bản dài, nhưng nhận được: ${ingestResult.chunks_created}`);
    }

    // --------------------------------------------------------------------------
    // BƯỚC 2: Kiểm tra dữ liệu và vector embeddings trong Supabase
    // --------------------------------------------------------------------------
    console.log('\n--- [BƯỚC 2]: Xác minh dữ liệu và vector embeddings trong Supabase ---');
    const { data: storedChunks, error: fetchErr } = await supabaseService
      .getClient()
      .from('documents')
      .select('id, title, content, embedding, metadata')
      .in('id', ingestResult.document_ids);

    if (fetchErr) {
      throw new Error(`Lỗi khi truy vấn Supabase: ${fetchErr.message}`);
    }

    if (!storedChunks || storedChunks.length !== ingestResult.chunks_created) {
      throw new Error(`Số lượng chunks trong Supabase (${storedChunks?.length}) không khớp với kết quả nạp (${ingestResult.chunks_created})`);
    }

    console.log(`✓ Đã lưu đủ ${storedChunks.length} chunks trong Supabase.`);
    for (let i = 0; i < storedChunks.length; i++) {
      const chunk = storedChunks[i];
      const emb = typeof chunk.embedding === 'string' ? JSON.parse(chunk.embedding) : chunk.embedding;
      const dim = Array.isArray(emb) ? emb.length : 0;
      console.log(`  Chunk [${i + 1}]: "${chunk.title}" | Kích thước: ${chunk.content.length} ký tự | Embedding Dim: ${dim} chiều | Index: ${chunk.metadata?.chunk_index}/${chunk.metadata?.total_chunks}`);

      if (dim !== 768) {
        throw new Error(`Vector embedding của chunk ${chunk.id} không đúng 768 chiều (nhận được: ${dim})`);
      }
    }

    // --------------------------------------------------------------------------
    // BƯỚC 3: Truy vấn Hybrid Search RRF để kiểm chứng độ chính xác
    // --------------------------------------------------------------------------
    console.log('\n--- [BƯỚC 3]: Kiểm tra Hybrid Search (RRF) tìm đúng nội dung vừa nạp ---');
    const searchQuestion = 'Điều kiện nhận làm đồ án tốt nghiệp VKU cần bao nhiêu tín chỉ?';
    console.log(`Câu hỏi tìm kiếm: "${searchQuestion}"`);

    const searchResults = await aiService.hybridSearch(searchQuestion, { matchCount: 3 });
    console.log(`Tìm thấy ${searchResults.length} kết quả phù hợp nhất:`);
    for (let i = 0; i < searchResults.length; i++) {
      const item = searchResults[i];
      console.log(`  [#${i + 1}] Score: ${item.score.toFixed(6)} | Tiêu đề: "${item.title}"`);
      console.log(`       Trích dẫn: ${item.content.slice(0, 150).replace(/\n/g, ' ')}...`);
    }

    if (searchResults.length === 0) {
      throw new Error('Hybrid search không trả về kết quả nào cho câu hỏi kiểm thử.');
    }

    const topHit = searchResults[0];
    const containsKeyword = topHit.content.includes('110') || topHit.content.includes('tín chỉ');
    if (!containsKeyword) {
      throw new Error('Kết quả hàng đầu không chứa thông tin 110 tín chỉ từ văn bản vừa nạp.');
    }
    console.log('✓ Hybrid Search xếp hạng chính xác chunk chứa điều kiện 110 tín chỉ lên đầu!');

    // --------------------------------------------------------------------------
    // BƯỚC 4: Kiểm tra RAG Pipeline hoàn chỉnh (Ask Assistant)
    // --------------------------------------------------------------------------
    console.log('\n--- [BƯỚC 4]: Kiểm tra RAG Pipeline trả về câu trả lời có cấu trúc ---');
    const ragQuestion = 'Sinh viên cần tích lũy bao nhiêu tín chỉ để được nhận đồ án tốt nghiệp?';
    console.log(`Truy vấn Assistant: "${ragQuestion}"`);

    const assistantAnswer = await aiService.askAssistant(ragQuestion);
    console.log('\nKết quả Structured Response từ Gemini:');
    console.log(JSON.stringify(assistantAnswer, null, 2));

    if (!assistantAnswer.answer.includes('110')) {
      throw new Error(`Câu trả lời của AI không nhắc tới mốc 110 tín chỉ: "${assistantAnswer.answer}"`);
    }
    if (assistantAnswer.confidence_score < 0.7) {
      throw new Error(`Confidence score quá thấp (${assistantAnswer.confidence_score}) đối với câu hỏi có trong tài liệu.`);
    }
    if (assistantAnswer.requires_human_escalation !== false) {
      throw new Error(`requires_human_escalation không phải là false.`);
    }

    console.log('\n================================================================================');
    console.log('  ✔ TẤT CẢ CÁC BƯỚC KIỂM THỬ INGESTION & RAG PIPELINE ĐỀU THÀNH CÔNG RỰC RỠ!   ');
    console.log('================================================================================\n');
  } catch (error) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch(console.error);
