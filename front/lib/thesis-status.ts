/** Nhãn trạng thái bảo vệ đồ án, dùng chung cho bảng và hộp thoại chi tiết. */
export const DEFENSE_STATUS = {
  ELIGIBLE: { label: 'Đủ điều kiện bảo vệ', variant: 'primary' },
  DEFENDED: { label: 'Đã bảo vệ', variant: 'neutral' },
  NOT_ELIGIBLE: { label: 'Đang thực hiện', variant: 'neutral' },
} as const;
