import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { OfflineAttendanceSyncDto } from './dto/offline-attendance-sync.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Endpoint: POST /attendance/offline-sync
   * Receives offline attendance records from client devices, attaches synced_at,
   * dispatches to n8n webhook, and returns sync receipt to client.
   */
  @Post('offline-sync')
  async syncOfflineAttendance(@Body() body: OfflineAttendanceSyncDto) {
    return await this.attendanceService.syncOfflineAttendance(body);
  }

  /**
   * Endpoint: GET /attendance/history?class_section_id=...&student_id=...
   * Fetches attendance history from Supabase
   */
  @Get('history')
  async getAttendanceHistory(
    @Query('class_section_id') classSectionId?: string,
    @Query('student_id') studentId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.attendanceService.getAttendanceHistory({
      class_section_id: classSectionId,
      student_id: studentId,
      page,
      limit,
    });
  }

  /**
   * Endpoint: GET /attendance/records
   * Fetches paginated attendance records formatted for dashboard
   */
  @Get('records')
  async getAttendanceRecords(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('classId') classId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return await this.attendanceService.getAttendanceRecords({
      search,
      status,
      classId,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });
  }
}
