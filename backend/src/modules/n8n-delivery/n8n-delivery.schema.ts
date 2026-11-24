import { Schema } from 'mongoose';

/**
 * Sổ ghi các lần n8n đã nhận một sự kiện, theo X-Delivery-Id.
 *
 * Backend không đọc hay ghi bộ sưu tập này; n8n ghi qua node MongoDB (xem
 * n8n/templates/delivery-dedupe.json). Backend chỉ khai báo để Mongoose tạo
 * hai chỉ mục khi khởi động:
 * - deliveryId duy nhất: hai lần gửi cùng mã thì lần sau bị từ chối khi ghi,
 *   kể cả khi hai lần tới cùng lúc;
 * - TTL theo expiresAt: bản ghi "processing" bị bỏ dở tự hết hạn (cho xử lý lại),
 *   bản ghi "done" giữ trong thời gian workflow đặt rồi tự xóa.
 */
export interface N8nDeliveryDoc {
  deliveryId: string;
  scope: string;
  status: 'processing' | 'done';
  claimedAt: Date;
  expiresAt: Date;
  /** Kết quả lần đầu, trả lại nguyên văn cho các lần gửi trùng. */
  response?: unknown;
}

export const N8N_DELIVERY_COLLECTION = 'n8n_deliveries';

export const N8nDeliverySchema = new Schema<N8nDeliveryDoc>(
  {
    deliveryId: { type: String, required: true, unique: true },
    scope: { type: String, required: true },
    status: { type: String, required: true, enum: ['processing', 'done'] },
    claimedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    response: { type: Schema.Types.Mixed },
  },
  { collection: N8N_DELIVERY_COLLECTION, versionKey: false },
);
