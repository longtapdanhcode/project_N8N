export class SupabaseStudentRecord {
  id: string;
  full_name: string;
  status?: string;
  student_email?: string;
  email?: string;
  advisor_email?: string;
  gender?: string;
  academic_year?: string;
  class_name?: string;
  major?: string;
  department?: string;
  [key: string]: any;
}

export class SupabaseStudentWebhookDto {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  table: string;
  schema?: string;
  record?: SupabaseStudentRecord;
  old_record?: SupabaseStudentRecord;
}
