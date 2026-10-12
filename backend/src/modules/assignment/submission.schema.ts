import { Schema } from 'mongoose';

export interface Submission {
  _id: string;
  studentId: string;
  assignmentTitle: string;
  content: string;
  criteria: string[];
  status: string;
  readTokenHash: string;
  feedback?: {
    summary: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  };
  model?: string;
  notification?: { status: string; score: number; summary: string };
}

export const SubmissionSchema = new Schema<Submission>(
  {
    _id: { type: String, required: true },
    studentId: { type: String, required: true, index: true },
    assignmentTitle: { type: String, required: true },
    content: { type: String, required: true },
    criteria: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['QUEUED', 'COMPLETED', 'QUEUE_FAILED', 'FAILED'],
      default: 'QUEUED',
    },
    readTokenHash: { type: String, required: true, select: false },
    feedback: {
      summary: String,
      score: Number,
      strengths: [String],
      weaknesses: [String],
      suggestions: [String],
    },
    model: String,
    notification: { status: String, score: Number, summary: String },
  },
  { timestamps: true, collection: 'submissions' },
);
