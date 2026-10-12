import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Thesis, ThesisSchema } from './schemas/thesis.schema';
import { ThesisService } from './thesis.service';
import { ThesisController } from './thesis.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Thesis.name, schema: ThesisSchema }]),
  ],
  controllers: [ThesisController],
  providers: [ThesisService],
  exports: [MongooseModule, ThesisService],
})
export class ThesisModule {}
