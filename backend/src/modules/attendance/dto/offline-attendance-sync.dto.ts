export class AttendanceRecordDto {
  student_id: string;
  class_section_id: string;
  session_date: string;
  status: string;
  timestamp: string;
}

export class OfflineAttendanceSyncDto {
  device_id: string;
  records: AttendanceRecordDto[];
}
