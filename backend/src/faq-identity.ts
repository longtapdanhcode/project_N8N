import { BadRequestException } from '@nestjs/common';

export type AskerRole = 'student' | 'teacher';

export interface AskerIdentity {
  role?: AskerRole;
  userId?: string;
  name?: string;
  department?: string;
}

function optionalText(value: unknown, field: string, max: number) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.trim().length > max)
    throw new BadRequestException(`${field} không hợp lệ`);
  return value.trim() || undefined;
}

/**
 * Đọc danh tính người hỏi do cổng frontend gắn từ phiên đăng nhập.
 * Không tự điền mã hay vai trò mẫu: thiếu thì để trống.
 */
export function readAskerIdentity(
  body: any,
  defaultRole?: AskerRole,
): AskerIdentity {
  const rawRole = body?.role;
  if (
    rawRole !== undefined &&
    rawRole !== null &&
    rawRole !== 'student' &&
    rawRole !== 'teacher'
  )
    throw new BadRequestException('role không hợp lệ');

  const identity: AskerIdentity = {
    role: (rawRole as AskerRole | undefined) ?? defaultRole,
    userId: optionalText(body?.userId ?? body?.studentId, 'userId', 100),
    name: optionalText(body?.name, 'name', 200),
    department: optionalText(body?.department, 'department', 200),
  };
  return Object.fromEntries(
    Object.entries(identity).filter(([, v]) => v !== undefined),
  ) as AskerIdentity;
}

/** Payload gửi workflow FAQ; studentId giữ để tương thích workflow hiện có. */
export function toFaqPayload(question: string, identity: AskerIdentity) {
  return {
    question,
    ...identity,
    ...(identity.userId ? { studentId: identity.userId } : {}),
  };
}
