import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'users', timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, enum: ['STUDENT', 'TEACHER'] })
  role: 'STUDENT' | 'TEACHER';

  @Prop()
  studentId?: string;

  @Prop()
  department?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
