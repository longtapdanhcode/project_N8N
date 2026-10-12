import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Thesis, ThesisSchema } from './schemas/thesis.schema';
import { ThesisService } from './thesis.service';
import {
  ThesisController,
  ThesisFeedbackController,
} from './thesis.controller';
import { WebhookModule } from '../webhook/webhook.module';
import { InternalApiGuard } from '../webhook/internal-api.guard';

@Module({
  imports: [
    WebhookModule,
    MongooseModule.forFeature([{ name: Thesis.name, schema: ThesisSchema }]),
  ],
  controllers: [ThesisController, ThesisFeedbackController],
  providers: [ThesisService, InternalApiGuard],
  exports: [MongooseModule, ThesisService],
})
export class ThesisModule {}
