# VKU AI Student Support System

## Cấu trúc
- backend/: do bạn khác viết, KHÔNG sửa. Đọc backend/, README.md, PROJECT_AUDIT.md để biết API và dạng dữ liệu thật.
- front/: Next.js cho Giảng viên/Admin; cổng chung 3000, đường dẫn /teacher.
- student-pwa/: Vite + React + TypeScript, PWA offline-first, phục vụ tại /student/ trên cổng 3000.
- Giữ cấu hình API hiện có; mock trong lib/mock.ts chỉ khi bật chế độ mock. Không đưa secret vào frontend.
- Giao diện tiếng Việt. Không commit file .env.

## Quy tắc thiết kế (bắt buộc)
Phong cách chung: cyber/terminal tối, đồng bộ đăng nhập, giảng viên và sinh viên.
- Font Be Vietnam Pro cho nội dung tiếng Việt; monospace cho MSSV, mã môn và nhãn nhỏ.
- Token: --primary: #67E8F9; --primary-hover: #A5F3FC; --primary-soft: #102C34;
  --danger: #FDA4AF; --bg: #0B0F14; --surface: #121920; --border: #283540;
  --text: #E6EDF3; --muted: #9AAAB8. Cyan là màu nhấn chính, đỏ cho lỗi/cấm thi/xóa.
- Riêng ô Cảnh báo điểm danh dùng vàng nhạt: --warning: #FDE68A; --warning-soft: #29251A; --warning-border: #5B4C2C.
- Đăng nhập giữ hình nền cyber; màn hình làm việc dùng nền phẳng tối, không hình nền lớn.
- Sidebar trên máy tính, điều hướng gọn trên điện thoại; cùng kiểu header, nút, bảng và hộp thoại.
- Viền 1px, bo góc 6–8px, khoảng cách theo lưới 4/8px. Chỉ sáng nhẹ khi tương tác.
- Không glassmorphism trong màn hình làm việc, không bóng nặng, card lồng card hay số liệu trang trí.
- Icon lucide-react nét mảnh; không emoji hoặc logo, nhận diện bằng tên hệ thống.
- Tiếng Việt ngắn gọn; dữ liệu mẫu giống thật, ghi rõ minh họa.
- Đủ trạng thái tải (skeleton), rỗng, lỗi; focus bàn phím rõ, hỗ trợ reduced-motion.
- Số liệu tabular-nums; đảm bảo tương phản trên nền tối, không chỉ dùng màu báo trạng thái.
