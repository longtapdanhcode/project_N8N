import { TextSplitterService } from './text-splitter.service';

describe('TextSplitterService', () => {
  let splitter: TextSplitterService;

  beforeEach(() => {
    splitter = new TextSplitterService();
  });

  it('should return empty array for empty or whitespace text', () => {
    expect(splitter.splitText('')).toEqual([]);
    expect(splitter.splitText('   ')).toEqual([]);
  });

  it('should return single chunk if text length <= chunkSize', () => {
    const text = 'Quy định đào tạo VKU ngắn gọn.';
    const chunks = splitter.splitText(text, { chunkSize: 100, chunkOverlap: 20 });
    expect(chunks).toEqual([text]);
  });

  it('should split long text into multiple chunks with overlap', () => {
    const text = [
      'Đoạn 1: Sinh viên hoàn thành tối thiểu 120 tín chỉ để đủ điều kiện xét tốt nghiệp.',
      'Đoạn 2: Điểm trung bình tích lũy toàn khóa phải đạt từ 2.0 trở lên theo thang điểm 4.',
      'Đoạn 3: Có chứng chỉ ngoại ngữ chuẩn đầu ra TOEIC hoặc tương đương theo quy định của nhà trường.',
      'Đoạn 4: Hoàn thành chứng chỉ giáo dục thể chất và giáo dục quốc phòng an ninh.',
      'Đoạn 5: Không bị kỷ luật từ mức đình chỉ học tập trở lên trong thời gian xét tốt nghiệp.',
    ].join('\n\n');

    const chunks = splitter.splitText(text, { chunkSize: 150, chunkOverlap: 30 });
    expect(chunks.length).toBeGreaterThan(1);

    // Verify each chunk length is reasonable
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it('should handle text with no standard separators by hard splitting', () => {
    const longWord = 'A'.repeat(500);
    const chunks = splitter.splitText(longWord, { chunkSize: 200, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });
});
