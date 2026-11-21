import { Schema } from 'mongoose';

export interface FaqTurn {
  question: string;
  answer: string;
  at: Date;
}

/**
 * Một cuộc hội thoại hỏi đáp, thuộc đúng một người dùng (vai trò + mã).
 * Tự xóa sau một thời gian không dùng (TTL theo expiresAt).
 */
export interface FaqConversationDoc {
  _id: string; // UUID do máy chủ sinh
  role: 'student' | 'teacher';
  userId: string;
  turns: FaqTurn[];
  expiresAt: Date;
}

const FaqTurnSchema = new Schema<FaqTurn>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
);

export const FaqConversationSchema = new Schema<FaqConversationDoc>(
  {
    _id: { type: String, required: true },
    role: { type: String, required: true, enum: ['student', 'teacher'] },
    userId: { type: String, required: true, index: true },
    turns: { type: [FaqTurnSchema], default: [] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, collection: 'faq_conversations' },
);
