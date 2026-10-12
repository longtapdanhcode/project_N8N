# VKU AI Student Support System

## Cấu trúc
- backend/: do bạn khác viết, KHÔNG sửa. Đọc backend/, README.md, PROJECT_AUDIT.md để biết API và dạng dữ liệu thật.
- dashboard/: Next.js (App Router, TypeScript, Tailwind) cho Giảng viên/Admin, cổng 3001.
- student-pwa/: Vite + React + TypeScript, PWA offline-first cho Sinh viên, cổng 5173.
- Backend chưa chạy trên máy này: dùng dữ liệu giả trong lib/mock.ts; mọi lời gọi API đi qua MỘT file lib/api.ts để sau này đổi sang API thật.
- Giao diện tiếng Việt. Không commit file .env.

## Quy tắc thiết kế (bắt buộc)
Mục tiêu: trông như sản phẩm do con người thiết kế, tiết chế và đáng tin, không ra chất "AI template".
- Chữ: Be Vietnam Pro. Dùng thang cỡ chữ cố định, số liệu dùng tabular-nums.
- Màu: định nghĩa thành token (CSS variables / Tailwind theme), MỘT màu nhấn duy nhất.
  --primary: #203870 (navy); --primary-hover: #1A2D5A; --primary-soft: #E8ECF5
  --danger: #C02030 (CHỈ cho lỗi/cảnh báo/xóa)
  --bg: #F6F7F9; --surface: #FFFFFF; --border: #E3E6EB; --text: #1B2230; --muted: #5B6577
- Hình khối: bo góc nhỏ (6-8px), viền 1px thay cho đổ bóng, khoảng cách theo lưới 4/8px.
- Icon: lucide-react, nét mảnh, đồng nhất. KHÔNG dùng emoji làm icon hay trang trí.
- CẤM: gradient tím-xanh, glassmorphism, card lồng card, đổ bóng nặng, hero banner lớn,
  lời chào kiểu "Chào mừng trở lại", số liệu thống kê trang trí vô nghĩa, lorem ipsum.
- Nội dung: tiếng Việt tự nhiên, ngắn gọn. Dữ liệu giả phải giống thật (tên người Việt, MSSV, mã lớp, môn học).
- Luôn có đủ trạng thái: đang tải (skeleton), rỗng, lỗi.
- Mật độ thông tin hợp lý cho dashboard, không để trống thênh thang.
- Không dùng logo; chỗ cần nhận diện chỉ hiện tên hệ thống dạng chữ.