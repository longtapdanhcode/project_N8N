import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Thesis, ThesisSchema } from './schemas/thesis.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Thesis.name, schema: ThesisSchema }]),
  ],
  exports: [MongooseModule],
})
export class ThesisModule {}
