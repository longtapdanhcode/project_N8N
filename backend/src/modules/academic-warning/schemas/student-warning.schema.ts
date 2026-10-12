import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudentRecordDocument = HydratedDocument<StudentRecord>;

@Schema({ collection: 'students', timestamps: true })
export class StudentRecord {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ required: true })
  full_name: string;

  @Prop({ required: true })
  advisor_email: string;

  @Prop({ required: true })
  student_email: string;
}
export const StudentRecordSchema = SchemaFactory.createForClass(StudentRecord);

export type GradeRecordDocument = HydratedDocument<GradeRecord>;

@Schema({ collection: 'grades', timestamps: true })
export class GradeRecord {
  @Prop({ required: true, index: true })
  student_id: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true, type: Number })
  score: number;

  @Prop({ required: true, type: Number })
  credits: number;
}
export const GradeRecordSchema = SchemaFactory.createForClass(GradeRecord);

export type AttendanceRecordDocument = HydratedDocument<AttendanceRecord>;

@Schema({ collection: 'attendances', timestamps: true })
export class AttendanceRecord {
  @Prop({ required: true, index: true })
  student_id: string;

  @Prop({ required: true })
  session: string;

  @Prop({ required: true })
  status: string;
}
export const AttendanceRecordSchema = SchemaFactory.createForClass(AttendanceRecord);
