import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { PushSubscriptionDoc } from './push-subscription.schema';

export interface PushMessage {
  title: string;
  body: string;
  /** Đường dẫn mở khi bấm thông báo; luôn nằm trong /student/. */
  url: string;
  tag: string;
}

/** Token để test thay hàm gửi thật (web-push) bằng hàm giả. */
export const PUSH_SENDER = 'PUSH_SENDER';

export type Sender = (
  subscription: webpush.PushSubscription,
  payload: string,
  options: webpush.RequestOptions,
) => Promise<unknown>;

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** Kiểm tra đăng ký do trình duyệt tạo; endpoint phải là HTTPS. */
export function parseSubscription(input: any) {
  const endpoint = input?.endpoint;
  const p256dh = input?.keys?.p256dh;
  const auth = input?.keys?.auth;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequestException('endpoint không hợp lệ');
  }
  if (url.protocol !== 'https:' || endpoint.length > 1000)
    throw new BadRequestException('endpoint phải là URL HTTPS');
  for (const [name, value] of [
    ['keys.p256dh', p256dh],
    ['keys.auth', auth],
  ] as const) {
    if (typeof value !== 'string' || value.length > 200 || !B64URL.test(value))
      throw new BadRequestException(`${name} không hợp lệ`);
  }
  return { endpoint: endpoint as string, keys: { p256dh, auth } as { p256dh: string; auth: string } };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly vapid?: { publicKey: string; privateKey: string; subject: string };
  private readonly send: Sender;

  constructor(
    @InjectModel('PushSubscription')
    private readonly subscriptions: Model<PushSubscriptionDoc>,
    config: ConfigService,
    @Optional() @Inject(PUSH_SENDER) sender?: Sender,
  ) {
    const publicKey = config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = config.get<string>('VAPID_PRIVATE_KEY');
    const subject = config.get<string>('VAPID_SUBJECT');
    if (publicKey && privateKey && subject) {
      this.vapid = { publicKey, privateKey, subject };
    } else {
      this.logger.warn(
        'Web Push tắt: thiếu VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT',
      );
    }
    this.send = sender ?? ((s, p, o) => webpush.sendNotification(s, p, o));
  }

  get enabled() {
    return Boolean(this.vapid);
  }

  publicKey() {
    if (!this.vapid)
      throw new ServiceUnavailableException('Máy chủ chưa bật thông báo đẩy');
    return { publicKey: this.vapid.publicKey };
  }

  async subscribe(studentId: unknown, subscription: unknown) {
    const id = this.studentId(studentId);
    if (!this.vapid)
      throw new ServiceUnavailableException('Máy chủ chưa bật thông báo đẩy');
    const { endpoint, keys } = parseSubscription(subscription);
    // Một endpoint chỉ thuộc một tài khoản: đăng nhập tài khoản khác sẽ chuyển chủ.
    await this.subscriptions
      .updateOne({ _id: endpoint }, { $set: { studentId: id, keys } }, { upsert: true })
      .exec();
    return { success: true };
  }

  async unsubscribe(studentId: unknown, endpoint: unknown) {
    const id = this.studentId(studentId);
    if (typeof endpoint !== 'string' || !endpoint)
      throw new BadRequestException('endpoint không hợp lệ');
    await this.subscriptions.deleteOne({ _id: endpoint, studentId: id }).exec();
    return { success: true };
  }

  /**
   * Gửi tới mọi thiết bị của sinh viên. Không bao giờ ném lỗi: thông báo đẩy là
   * phụ, việc lưu kết quả chấm không được hỏng vì nó. Endpoint hết hạn bị xóa.
   */
  async notifyStudent(studentId: string, message: PushMessage) {
    if (!this.vapid) return { sent: 0, removed: 0 };
    let sent = 0;
    let removed = 0;
    try {
      const subs = await this.subscriptions.find({ studentId }).lean().exec();
      const payload = JSON.stringify(message);
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await this.send({ endpoint: sub._id, keys: sub.keys }, payload, {
              vapidDetails: this.vapid!,
              TTL: 24 * 60 * 60,
              urgency: 'normal',
            });
            sent++;
          } catch (error: any) {
            if (error?.statusCode === 404 || error?.statusCode === 410) {
              await this.subscriptions.deleteOne({ _id: sub._id }).exec();
              removed++;
            } else {
              this.logger.warn(`Gửi thông báo thất bại (${error?.statusCode ?? error?.message})`);
            }
          }
        }),
      );
    } catch (error: any) {
      this.logger.error(`Không đọc được đăng ký thông báo: ${error?.message}`);
    }
    return { sent, removed };
  }

  private studentId(value: unknown) {
    if (typeof value !== 'string' || !value.trim() || value.length > 100)
      throw new BadRequestException('studentId không hợp lệ');
    return value.trim();
  }
}
