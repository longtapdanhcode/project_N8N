import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type MilestoneDocument = HydratedDocument<Milestone>;

/**
 * Embedded Milestone subdocument schema representing specific checkpoints
 * along the thesis lifecycle with AI feedback integration.
 */
@Schema({ _id: true, timestamps: true })
export class Milestone {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, type: Date })
  deadline: Date;

  @Prop({
    type: String,
    enum: Object.values(MilestoneStatus),
    default: MilestoneStatus.PENDING,
    required: true,
  })
  status: MilestoneStatus;

  @Prop({ type: String, default: null })
  aiFeedback?: string;
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);

export type ThesisDocument = HydratedDocument<Thesis>;

/**
 * Main Thesis schema utilizing the Subdocument pattern to embed milestones.
 */
@Schema({ timestamps: true, collection: 'theses' })
export class Thesis {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, index: true })
  studentId: string;

  @Prop({ index: true })
  advisorId?: string;

  @Prop({
    type: [MilestoneSchema],
    default: [],
  })
  milestones: Types.DocumentArray<Milestone>;
}

export const ThesisSchema = SchemaFactory.createForClass(Thesis);
