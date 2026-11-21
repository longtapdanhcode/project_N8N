import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import type { AskerIdentity } from '../../faq-identity';
import { FaqConversationDoc } from './faq-conversation.schema';

/** Số lượt gần nhất đưa vào ngữ cảnh khi trả lời. */
export const CONTEXT_TURNS = 4;
/** Số lượt tối đa lưu cho mỗi cuộc hội thoại. */
export const MAX_STORED_TURNS = 20;
/** Hội thoại không dùng quá thời gian này thì tự xóa. */
export const CONVERSATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_STORED_TEXT = 4000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HistoryTurn {
  question: string;
  answer: string;
}

export interface FaqSession {
  conversationId: string;
  history: HistoryTurn[];
}

/**
 * Câu hỏi nối tiếp thường thiếu chủ ngữ ("còn học kỳ hè thì sao?").
 * Ghép thêm câu hỏi trước để tìm tài liệu đúng chủ đề.
 */
export function searchQueryFor(question: string, history: HistoryTurn[]) {
  const previous = history.at(-1)?.question;
  return previous ? `${previous}\n${question}` : question;
}

@Injectable()
export class FaqMemoryService {
  private readonly logger = new Logger(FaqMemoryService.name);

  constructor(
    @InjectModel('FaqConversation')
    private readonly conversations: Model<FaqConversationDoc>,
  ) {}

  /**
   * Mở lại hội thoại của chính người hỏi, hoặc tạo mã mới.
   * Mã không hợp lệ, hết hạn hay của người khác đều coi như hội thoại mới.
   * Trả null khi không biết người hỏi: không lưu lịch sử ẩn danh.
   */
  async open(
    identity: AskerIdentity,
    conversationId?: unknown,
  ): Promise<FaqSession | null> {
    const { role, userId } = identity;
    if (!role || !userId) return null;

    if (typeof conversationId === 'string' && UUID.test(conversationId)) {
      try {
        const found = await this.conversations
          .findOne(
            { _id: conversationId, role, userId },
            { turns: { $slice: -CONTEXT_TURNS } },
          )
          .lean();
        if (found)
          return {
            conversationId,
            history: found.turns.map(({ question, answer }) => ({
              question,
              answer,
            })),
          };
      } catch (error) {
        // Lỗi lưu trữ không được chặn việc trả lời: trả lời như câu đầu tiên.
        this.logger.warn(`Không đọc được lịch sử hỏi đáp: ${String(error)}`);
      }
    }
    return { conversationId: randomUUID(), history: [] };
  }

  /** Lưu lượt hỏi đáp; lỗi chỉ ghi log. */
  async record(
    session: FaqSession | null,
    identity: AskerIdentity,
    question: string,
    answer: string,
  ) {
    if (!session || !identity.role || !identity.userId || !answer.trim()) return;
    const now = new Date();
    try {
      await this.conversations.updateOne(
        {
          _id: session.conversationId,
          role: identity.role,
          userId: identity.userId,
        },
        {
          $push: {
            turns: {
              $each: [
                {
                  question: question.slice(0, MAX_STORED_TEXT),
                  answer: answer.slice(0, MAX_STORED_TEXT),
                  at: now,
                },
              ],
              $slice: -MAX_STORED_TURNS,
            },
          },
          $set: { expiresAt: new Date(now.getTime() + CONVERSATION_TTL_MS) },
        },
        { upsert: true },
      );
    } catch (error) {
      this.logger.warn(`Không lưu được lịch sử hỏi đáp: ${String(error)}`);
    }
  }
}
