import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
