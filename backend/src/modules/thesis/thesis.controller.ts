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
import { SkipPortalKey } from '../auth/portal-key.guard';
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
// n8n gọi bằng khóa riêng (x-internal-api-key), không đi qua cổng 3000.
@SkipPortalKey()
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
