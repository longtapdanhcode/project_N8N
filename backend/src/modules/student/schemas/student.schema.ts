import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentDocument = HydratedDocument<Student>;

@Schema({ collection: 'students', timestamps: true })
export class Student {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true })
  full_name: string;

  @Prop({ default: 'MALE' })
  gender: string;

  @Prop({ required: true })
  student_email: string;

  @Prop({ required: true })
  advisor_email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  class_name: string;

  @Prop({ default: '' })
  major: string;

  @Prop({ default: '' })
  department: string;

  @Prop({ default: '2022-2026' })
  academic_year: string;

  @Prop({ default: 'ACTIVE' })
  status: string;

  @Prop({ default: 0 })
  gpa: number;

  @Prop({ default: 0 })
  credits_earned: number;

  @Prop({ default: 135 })
  total_credits: number;

  @Prop({ default: 20 })
  total_sessions: number;

  @Prop({ default: 0 })
  absent_sessions: number;

  @Prop({ default: 100 })
  attendance_rate: number;

  @Prop({ default: false })
  attendance_warning: boolean;

  @Prop({ default: false })
  exam_prohibited: boolean;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
