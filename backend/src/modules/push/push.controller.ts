import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import { PushService } from './push.service';

/**
 * Đăng ký Web Push cho sinh viên. Cổng frontend gắn studentId từ phiên đăng nhập;
 * trình duyệt không gọi thẳng backend.
 */
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  publicKey() {
    return this.push.publicKey();
  }

  @Post('subscriptions')
  @HttpCode(200)
  subscribe(@Body() body: any) {
    return this.push.subscribe(body?.studentId, body?.subscription);
  }

  @Delete('subscriptions')
  unsubscribe(@Body() body: any) {
    return this.push.unsubscribe(body?.studentId, body?.endpoint);
  }
}
