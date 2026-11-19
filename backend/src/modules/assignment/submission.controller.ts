import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InternalApiGuard } from '../webhook/internal-api.guard';
import { SubmissionService } from './submission.service';
import { SubmissionListService } from './submission-list.service';
import type { SubmissionListQuery } from './submission-list.service';

@Controller('submissions')
export class SubmissionController {
  constructor(
    private readonly service: SubmissionService,
    private readonly listService: SubmissionListService,
  ) {}

  /** Danh sách cho giảng viên; cổng frontend chỉ mở route này cho phiên giảng viên. */
  @Get()
  list(@Query() query: SubmissionListQuery) {
    return this.listService.list(query);
  }

  @Post()
  submit(@Body() body: unknown) {
    return this.service.submit(body);
  }

  @Get(':id')
  result(
    @Param('id') id: string,
    @Headers('x-submission-token') token: string,
  ) {
    return this.service.result(id, token);
  }
}

@Controller('api/internal')
@UseGuards(InternalApiGuard)
export class SubmissionCallbackController {
  constructor(private readonly service: SubmissionService) {}

  @Get('submissions/:id')
  find(@Param('id') id: string) {
    return this.service.find(id);
  }

  @Post('submissions/:id/ai-feedback')
  save(@Param('id') id: string, @Body() body: unknown) {
    return this.service.saveFeedback(id, body);
  }

  @Post('notifications/assignment-analyzed')
  notify(@Body() body: unknown) {
    return this.service.notify(body);
  }
}
