import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Submission } from './submission.schema';

export function requiredText(
  value: unknown,
  field: string,
  max = 30000,
): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new BadRequestException(
      `${field} phải là chuỗi không rỗng, tối đa ${max} ký tự`,
    );
  }
  return value.trim();
}

@Injectable()
export class SubmissionService {
  constructor(
    @InjectModel('Submission') private readonly model: Model<Submission>,
    @InjectQueue('submission-queue') private readonly queue: Queue,
  ) {}

  async submit(body: any) {
    const studentId = requiredText(body?.studentId, 'studentId', 100);
    const assignmentTitle = requiredText(
      body?.assignmentTitle,
      'assignmentTitle',
      300,
    );
    const content = requiredText(body?.content, 'content');
    const criteria = body.criteria ?? [];
    if (
      !Array.isArray(criteria) ||
      criteria.length > 20 ||
      criteria.some((c) => typeof c !== 'string' || c.length > 1000)
    ) {
      throw new BadRequestException(
        'criteria phải là danh sách tối đa 20 tiêu chí',
      );
    }
    const submissionId = randomUUID();
    const readToken = randomBytes(32).toString('hex');
    const readTokenHash = createHash('sha256').update(readToken).digest('hex');
    await this.model.create({
      _id: submissionId,
      studentId,
      assignmentTitle,
      content,
      criteria,
      readTokenHash,
    });
    try {
      await this.queue.add(
        'evaluate-submission',
        { submissionId, studentId, assignmentTitle },
        {
          jobId: submissionId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch (error) {
      await this.model.updateOne(
        { _id: submissionId },
        { $set: { status: 'QUEUE_FAILED' } },
      );
      throw error;
    }
    return { submissionId, status: 'QUEUED', readToken };
  }

  async result(id: string, token: unknown) {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token))
      throw new UnauthorizedException();
    const readTokenHash = createHash('sha256').update(token).digest('hex');
    const doc = await this.model
      .findOne({ _id: id, readTokenHash })
      .lean()
      .exec();
    if (!doc) throw new UnauthorizedException();
    return {
      submissionId: id,
      status: doc.status,
      feedback: doc.feedback,
      notification: doc.notification,
    };
  }

  async find(id: string) {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Không tìm thấy bài nộp');
    return { ...doc, submissionId: doc._id };
  }

  async saveFeedback(id: string, body: any) {
    const feedback = body?.feedback;
    const summary = requiredText(feedback?.summary, 'feedback.summary');
    if (
      typeof feedback?.score !== 'number' ||
      !Number.isFinite(feedback.score) ||
      feedback.score < 0 ||
      feedback.score > 10
    ) {
      throw new BadRequestException('Điểm phải nằm trong khoảng 0 đến 10');
    }
    for (const key of ['strengths', 'weaknesses', 'suggestions']) {
      if (
        !Array.isArray(feedback[key]) ||
        feedback[key].length > 50 ||
        feedback[key].some(
          (v: unknown) => typeof v !== 'string' || v.length > 3000,
        )
      ) {
        throw new BadRequestException(`feedback.${key} không hợp lệ`);
      }
    }
    const studentId = requiredText(body?.studentId, 'studentId', 100);
    const model = requiredText(body?.model, 'model', 100);
    const doc = await this.find(id);
    if (body.submissionId !== id || doc.studentId !== studentId)
      throw new BadRequestException('ID bài nộp/sinh viên không khớp');
    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          status: 'COMPLETED',
          model,
          feedback: {
            summary,
            score: feedback.score,
            strengths: feedback.strengths,
            weaknesses: feedback.weaknesses,
            suggestions: feedback.suggestions,
          },
        },
      },
    );
    return { success: true, submissionId: id };
  }

  async notify(body: any) {
    const id = requiredText(body?.submissionId, 'submissionId', 100);
    const doc = await this.find(id);
    if (body.studentId !== doc.studentId)
      throw new BadRequestException('studentId không khớp');
    if (doc.status !== 'COMPLETED' || !doc.feedback)
      throw new ConflictException('Chưa lưu nhận xét bài nộp');
    // Persist one notification per submission so repeated n8n calls do not create duplicates.
    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          notification: {
            status: 'COMPLETED',
            score: doc.feedback.score,
            summary: doc.feedback.summary,
          },
        },
      },
    );
    return { success: true, submissionId: id, notificationSaved: true };
  }
}
