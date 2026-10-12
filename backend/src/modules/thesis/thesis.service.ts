import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../webhook/webhook.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Thesis } from './schemas/thesis.schema';

export class ThesisFilterDto {
  search?: string;
  advisorId?: string;
  defenseStatus?: string;
  page?: number | string;
  pageSize?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ThesisService {
  constructor(
    @InjectModel(Thesis.name)
    private readonly thesisModel: Model<Thesis>,
    private readonly webhook: WebhookService,
    private readonly config: ConfigService,
  ) {}

  async findAll(options: ThesisFilterDto = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = Math.max(1, Number(options.pageSize || 20));
    const query: Record<string, any> = {};

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { title: regex },
        { studentId: regex },
        { studentName: regex },
        { advisorName: regex },
      ];
    }

    if (options.advisorId) {
      query.advisorId = options.advisorId.trim();
    }

    if (options.defenseStatus) {
      query.defenseStatus = options.defenseStatus.trim();
    }

    const sortField = options.sortBy || 'createdAt';
    const sortDirection = options.sortOrder === 'desc' ? -1 : 1;
    const sortOptions: Record<string, any> = { [sortField]: sortDirection };

    const total = await this.thesisModel.countDocuments(query);
    const skip = (page - 1) * pageSize;

    const docs = await this.thesisModel
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();

    return {
      data: docs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateMilestone(
    thesisId: string,
    milestoneId: string,
    status: string,
    aiFeedback?: string,
  ) {
    if (
      !isValidObjectId(thesisId) ||
      !isValidObjectId(milestoneId) ||
      !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)
    ) {
      throw new BadRequestException('ID hoặc trạng thái mốc không hợp lệ');
    }
    const thesis = await this.thesisModel.findById(thesisId).exec();
    if (!thesis) {
      throw new NotFoundException(`Thesis "${thesisId}" not found`);
    }

    const milestone = thesis.milestones.find(
      (m: any) => m._id.toString() === milestoneId || m.id === milestoneId,
    );

    if (!milestone) {
      throw new NotFoundException(
        `Milestone "${milestoneId}" not found in thesis`,
      );
    }

    milestone.status = status as any;
    if (aiFeedback !== undefined) {
      milestone.aiFeedback = aiFeedback;
    }

    const totalMilestones = thesis.milestones.length;
    const completedCount = thesis.milestones.filter(
      (m: any) => m.status === 'COMPLETED',
    ).length;

    const progressPercent =
      totalMilestones > 0
        ? Math.round((completedCount / totalMilestones) * 100)
        : 0;

    thesis.progressPercent = progressPercent;
    thesis.defenseStatus = progressPercent >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE';

    await thesis.save();
    if (aiFeedback === undefined) {
      const url = this.config.get<string>('N8N_THESIS_URL');
      if (!url)
        throw new BadGatewayException('Mốc đã lưu nhưng thiếu N8N_THESIS_URL');
      const result = await this.webhook.sendToN8n(
        { thesisId, milestoneId, status },
        'THESIS_MILESTONE_UPDATED',
        url,
        0,
        120000,
      );
      if (!result.success)
        throw new BadGatewayException(
          'Mốc đã lưu nhưng workflow phản hồi thất bại; có thể gửi lại yêu cầu',
        );
    }
    return { success: true, thesis };
  }

  async saveFeedback(
    thesisId: string,
    milestoneId: string,
    aiFeedback: unknown,
  ) {
    if (
      !isValidObjectId(thesisId) ||
      !isValidObjectId(milestoneId) ||
      typeof aiFeedback !== 'string' ||
      !aiFeedback.trim() ||
      aiFeedback.length > 30000
    ) {
      throw new BadRequestException('ID hoặc phản hồi không hợp lệ');
    }
    // Only write feedback while this exact milestone is still completed; callbacks must not emit another webhook.
    const thesis = await this.thesisModel
      .findOneAndUpdate(
        {
          _id: thesisId,
          milestones: { $elemMatch: { _id: milestoneId, status: 'COMPLETED' } },
        },
        { $set: { 'milestones.$.aiFeedback': aiFeedback.trim() } },
        { new: true },
      )
      .exec();
    if (!thesis) {
      const current = await this.thesisModel.findById(thesisId).exec();
      if (
        !current ||
        !current.milestones.some((m: any) => String(m._id) === milestoneId)
      )
        throw new NotFoundException('Không tìm thấy đồ án hoặc mốc');
      throw new ConflictException('Mốc không còn ở trạng thái COMPLETED');
    }
    return { success: true, thesisId, milestoneId };
  }
}
