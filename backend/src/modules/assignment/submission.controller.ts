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
import { PushService } from '../push/push.service';
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
  constructor(
    private readonly service: SubmissionService,
    private readonly push: PushService,
  ) {}

  @Get('submissions/:id')
  find(@Param('id') id: string) {
    return this.service.find(id);
  }

  @Post('submissions/:id/ai-feedback')
  save(@Param('id') id: string, @Body() body: unknown) {
    return this.service.saveFeedback(id, body);
  }

  @Post('notifications/assignment-analyzed')
  async notify(@Body() body: unknown) {
    const result = await this.service.recordNotification(body);
    if (result.firstTime) {
      const score = Number.isInteger(result.score)
        ? String(result.score)
        : result.score.toFixed(1);
      // Không await: gửi thông báo đẩy chậm hay lỗi không được làm n8n chờ hoặc thử lại.
      void this.push.notifyStudent(result.studentId, {
        title: 'Đã có nhận xét bài nộp',
        body: `${result.assignmentTitle.slice(0, 120)} · ${score}/10`,
        url: '/student/index.html#assignments',
        tag: `submission-${result.response.submissionId}`,
      });
    }
    return result.response;
  }
}
