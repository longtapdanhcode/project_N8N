import { Body, Controller, Post, Query } from '@nestjs/common';
import { AcademicWarningService } from './academic-warning.service';

export class ScanWarningDto {
  limit?: number;
}

@Controller('academic-warning')
export class AcademicWarningController {
  constructor(private readonly warningService: AcademicWarningService) {}

  /**
   * Endpoint to trigger academic risk scan across all students in MongoDB
   * and dispatch alerts to n8n webhook.
   *
   * Accepts optional limit via request body or query parameter:
   * e.g. POST /academic-warning/scan with body { limit: 1 } or ?limit=1
   */
  @Post('scan')
  async scanAndDispatchWarnings(
    @Body() body?: ScanWarningDto,
    @Query('limit') queryLimit?: string,
  ) {
    const rawLimit = body?.limit !== undefined ? body.limit : queryLimit;
    const parsedLimit = rawLimit !== undefined ? Number(rawLimit) : undefined;
    const limit =
      parsedLimit !== undefined && !isNaN(parsedLimit)
        ? parsedLimit
        : undefined;

    return await this.warningService.scanAndDispatchWarnings(limit);
  }
}
