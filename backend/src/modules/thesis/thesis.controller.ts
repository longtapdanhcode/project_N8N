import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiGuard } from '../webhook/internal-api.guard';
import { ThesisService, ThesisFilterDto } from './thesis.service';

@Controller('theses')
export class ThesisController {
  constructor(private readonly thesisService: ThesisService) {}

  @Get()
  async getTheses(@Query() query: ThesisFilterDto) {
    return await this.thesisService.findAll(query);
  }

  @Patch(':id/milestones/:milestoneId')
  async updateMilestone(
    @Param('id') thesisId: string,
    @Param('milestoneId') milestoneId: string,
    @Body() body: { status: string; aiFeedback?: string },
  ) {
    return await this.thesisService.updateMilestone(
      thesisId,
      milestoneId,
      body.status,
      body.aiFeedback,
    );
  }
}

@Controller('internal/theses')
@UseGuards(InternalApiGuard)
export class ThesisFeedbackController {
  constructor(private readonly service: ThesisService) {}

  @Post(':id/milestones/:milestoneId/feedback')
  save(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() body: any,
  ) {
    return this.service.saveFeedback(id, milestoneId, body?.aiFeedback);
  }
}
