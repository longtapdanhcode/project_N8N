import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    const thesis = await this.thesisModel.findById(thesisId).exec();
    if (!thesis) {
      throw new NotFoundException(`Thesis "${thesisId}" not found`);
    }

    const milestone = thesis.milestones.find(
      (m: any) => m._id.toString() === milestoneId || m.id === milestoneId,
    );

    if (!milestone) {
      throw new NotFoundException(`Milestone "${milestoneId}" not found in thesis`);
    }

    milestone.status = status as any;
    if (aiFeedback !== undefined) {
      milestone.aiFeedback = aiFeedback;
    }

    const totalMilestones = thesis.milestones.length;
    const completedCount = thesis.milestones.filter(
      (m: any) => m.status === 'COMPLETED',
    ).length;

    const progressPercent = totalMilestones > 0
      ? Math.round((completedCount / totalMilestones) * 100)
      : 0;

    thesis.progressPercent = progressPercent;
    thesis.defenseStatus = progressPercent >= 75 ? 'ELIGIBLE' : 'NOT_ELIGIBLE';

    await thesis.save();
    return { success: true, thesis };
  }
}
