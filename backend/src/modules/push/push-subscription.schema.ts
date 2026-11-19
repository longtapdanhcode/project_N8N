import { Schema } from 'mongoose';

/** Một đăng ký Web Push của trình duyệt, gắn với MSSV đang đăng nhập trên thiết bị đó. */
export interface PushSubscriptionDoc {
  _id: string; // endpoint, mỗi trình duyệt/thiết bị có một endpoint riêng
  studentId: string;
  keys: { p256dh: string; auth: string };
}

export const PushSubscriptionSchema = new Schema<PushSubscriptionDoc>(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { timestamps: true, collection: 'push_subscriptions' },
);
