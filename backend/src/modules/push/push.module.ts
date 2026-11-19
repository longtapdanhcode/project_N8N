import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import { PushSubscriptionSchema } from './push-subscription.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'PushSubscription', schema: PushSubscriptionSchema },
    ]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
