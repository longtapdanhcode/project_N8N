import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from '../webhook/webhook.service';
import { SupabaseService } from '../ai/supabase.service';
import { CourseRegistrationDto } from './dto/course-registration.dto';

@Injectable()
export class CourseRegistrationService {
  private readonly logger = new Logger(CourseRegistrationService.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Forwards course registration request to n8n workflow with HMAC authentication,
   * returning registration outcome (enrolled / conflict / prerequisite error) to client.
   */
  async registerCourse(dto: CourseRegistrationDto) {
    this.logger.log(
      `Forwarding course registration for student "${dto.student_id}" -> section "${dto.class_section_id}"...`,
    );

    const n8nRegistrationUrl = this.configService.get<string>(
      'N8N_COURSE_REGISTRATION_URL',
      'http://localhost:5678/webhook/course-registration',
    );

    const deliveryResult = await this.webhookService.sendToN8n(
      dto,
      'COURSE_REGISTRATION',
      n8nRegistrationUrl,
    );

    if (deliveryResult.success && deliveryResult.data) {
      return deliveryResult.data;
    }

    return {
      success: deliveryResult.success,
      statusCode: deliveryResult.statusCode,
      message: deliveryResult.success
        ? 'Yêu cầu đăng ký học phần đã được chuyển tiếp thành công.'
        : 'Không thể kết nối đến workflow xử lý đăng ký học phần n8n.',
      data: deliveryResult.data,
    };
  }

  /**
   * Retrieves all courses from Supabase public.courses
   */
  async getCourses() {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('courses').select('*').order('id');
    if (error) {
      this.logger.error(`Failed to fetch courses: ${error.message}`);
      throw new Error(error.message);
    }
    return data || [];
  }

  /**
   * Retrieves all class sections with live enrollment count
   */
  async getClassSections() {
    const client = this.supabaseService.getClient();
    const [sectionsRes, enrollmentsRes] = await Promise.all([
      client.from('class_sections').select('*').order('id'),
      client.from('enrollments').select('class_section_id'),
    ]);

    if (sectionsRes.error) {
      this.logger.error(`Failed to fetch class sections: ${sectionsRes.error.message}`);
      throw new Error(sectionsRes.error.message);
    }

    const counts: Record<string, number> = {};
    if (enrollmentsRes.data) {
      for (const e of enrollmentsRes.data) {
        counts[e.class_section_id] = (counts[e.class_section_id] || 0) + 1;
      }
    }

    return (sectionsRes.data || []).map((sec: any) => ({
      ...sec,
      current_enrolled: counts[sec.id] ?? sec.current_enrolled ?? 0,
    }));
  }
}
