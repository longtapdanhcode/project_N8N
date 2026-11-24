import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { N8nDeliverySchema } from './n8n-delivery.schema';

/** Chỉ để tạo chỉ mục cho n8n_deliveries khi khởi động; xem n8n-delivery.schema.ts. */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'N8nDelivery', schema: N8nDeliverySchema }]),
  ],
})
export class N8nDeliveryModule {}
