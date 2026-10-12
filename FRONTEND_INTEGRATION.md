# Giao diện và các luồng backend

## Đối chiếu API

| Nghiệp vụ | Giao diện | API sử dụng |
|---|---|---|
| Đăng ký học phần | PWA → Đăng ký học phần, lọc môn, xem sĩ số, gửi đăng ký | GET /courses, GET /class-sections, POST /course-registration/register |
| Điểm danh offline | PWA → Điểm danh, chọn lớp/ngày, lưu Dexie, tự gửi lại, xem lịch sử | POST /attendance/offline-sync, GET /attendance/history |
| Cảnh báo học vụ | Dashboard → Tổng quan → Xử lý cảnh báo, chọn giới hạn, xem bảng kết quả | POST /academic-warning/scan |
| FAQ qua n8n | PWA → Hỏi đáp, câu trả lời, tài liệu nguồn, chuyển cố vấn khi thiếu căn cứ | POST /faq/ask |
| Nhận xét bài tập | PWA → Bài tập, nộp văn bản, tự kiểm tra kết quả mỗi 5 giây khi đang chờ | POST /submissions, GET /submissions/:id với x-submission-token |
| Mốc đồ án qua n8n | Dashboard → Đồ án tốt nghiệp → mở chi tiết, đổi trạng thái, tải phản hồi | GET /theses, PATCH /theses/:id/milestones/:milestoneId |
| Kho tài liệu AI (bổ sung) | Dashboard → Kho tài liệu, nhập văn bản/.txt/.md, xem và phân trang | GET /documents, POST /documents/ingest-text, POST /documents/ingest-file |
| Điểm cá nhân | PWA → Điểm số (chế độ thật) | GET /students/:studentId, ánh xạ grades |
| Quản lý sinh viên/điểm danh/tổng quan | Các trang Dashboard đã có | /students, /students/classes, /students/top-violators, /students/:id, /attendance/records, /dashboard/kpis |
| AI trực tiếp (đã có) | Trợ lý ở Tổng quan Dashboard | POST /ai/ask |

Các callback `/api/internal/*`, `/internal/theses/*/feedback` chỉ cho n8n gọi. Frontend không chứa N8N_INTERNAL_API_KEY, WEBHOOK_SECRET hoặc Gemini API key. Endpoint kiểm thử `/test-*` và health `/` không cần màn hình nghiệp vụ.

## Chạy với backend của bạn trên Linux

Trong `student-pwa/.env.local` (không commit):

```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://IP_MAY_LINUX:3001
```

Trong `dashboard/.env.local` (không commit):

```dotenv
NEXT_PUBLIC_BACKEND_URL=http://IP_MAY_LINUX:3001
```

Thay IP_MAY_LINUX bằng IP truy cập được từ máy mở trình duyệt, không dùng tên Docker nội bộ. Khởi động lại frontend sau khi đổi biến môi trường. Các biến VITE/NEXT_PUBLIC được nhúng lúc build.

```powershell
cd student-pwa
npm run dev -- --port 5173
```

Mở terminal khác ở thư mục dự án:

```powershell
cd dashboard
npm run dev -- --port 3001
```

Dashboard cổng 3001 trên Windows và backend cổng 3001 trên Linux là hai máy khác nhau nên không xung đột. Nếu chạy chung một máy, đặt backend PORT=3000, đổi hai URL frontend sang http://localhost:3000 và NESTJS_BASE_URL của n8n cho đúng. Backend phải cho phép CORS từ địa chỉ frontend thực tế.

PWA → Thông tin sinh viên: nhập MSSV có thật trong CSDL, email và học kỳ đúng rồi Lưu thông tin. Đây là thông tin thử nghiệm, chưa phải đăng nhập/xác thực sinh viên.

## Xem thử không cần backend

PWA mặc định VITE_USE_MOCK=true, VITE_API_URL=/api. Mock ở `src/lib/mock.ts`, phục vụ qua Vite dev/preview. Các màn hình đăng ký, điểm danh, FAQ và bài tập đều có dữ liệu thử; footer ghi rõ Dữ liệu minh họa. Mock bài tập trả phản hồi sau vài giây; mock mất dữ liệu phía máy chủ khi restart.

Mock không được đóng gói thành backend khi chỉ đưa dist lên hosting tĩnh. Bản triển khai thật cần VITE_USE_MOCK=false và API đang chạy.

## Kiểm tra các luồng

1. Đăng ký: chọn lớp còn chỗ, gửi và kiểm tra phản hồi/sĩ số. Thử lớp đầy hoặc đăng ký trùng; giao diện phải giữ lỗi từ backend/n8n.
2. FAQ: hỏi câu có tài liệu rồi câu ngoài phạm vi. Xem nguồn và thông báo liên hệ cố vấn. Backend dùng N8N_FAQ_URL đã publish.
3. Bài tập: nộp tiêu đề, văn bản, tiêu chí. Chờ trạng thái Đã có nhận xét, điểm và các mục góp ý. Reload trang vẫn thấy bài trên thiết bị. Khi mất kết nối, bấm Kiểm tra kết quả để thử lại. Kết quả dùng polling, chưa có Socket.io. Nộp bài cần mạng; không tự gửi lại POST vì backend chưa hỗ trợ idempotency cho tạo bài.
4. Đồ án: mở chi tiết, đổi mốc sang hoàn thành. Kiểm tra phản hồi AI sau khi workflow lưu; bấm Tải phản hồi mới nếu cần. Khi workflow lỗi, giao diện hiển thị lỗi; mốc có thể đã lưu ở backend nên tải lại trước khi quyết định gửi lại.
5. Cảnh báo: mặc định Chỉ quét, chưa gửi thông báo. Chọn giới hạn 1/5/20 nếu cần gửi qua n8n rồi bấm Xử lý cảnh báo. So sánh số đã chuyển với số dự kiến, xem bảng sinh viên vi phạm. Frontend không tự gửi email khi tải trang.
6. Tài liệu: nhập văn bản hoặc tệp .txt/.md dưới 5 MB, chờ tạo các đoạn dữ liệu, xem danh sách và thử hỏi FAQ bằng nội dung vừa nhập.

### Điểm danh offline

Service worker hoạt động trên localhost hoặc HTTPS. Dùng bản production để kiểm tra:

```powershell
cd student-pwa
npm run build
npm run preview -- --port 4173
```

1. Mở http://localhost:4173 khi có mạng. Chọn Điểm danh, chờ tải lớp; chọn lớp và ngày học.
2. DevTools → Application → Service Workers, đợi worker activated rồi bật Offline. Nếu trình duyệt không chặn request ở chế độ này, chọn Network → Offline.
3. Bấm Xác nhận có mặt. Phiếu hiển thị Chờ đồng bộ; header có N mục chờ. Application → IndexedDB → vku-student → syncQueue có bản ghi với timestamp ban đầu.
4. Tắt Offline, chờ header hoặc bấm Thử lại. Worker Background Sync hoặc sự kiện online phía trang xả FIFO. Safari dùng online và cơ chế thử lại phía trang.
5. Chỉ khi nhận ACK và không có success:false, hàng đợi mới xóa và phiếu chuyển Đã đồng bộ. Bấm Tải lại để kiểm tra lịch sử máy chủ. Nếu n8n lỗi, bản ghi phải còn trong hàng đợi, retries tăng.
6. Bấm điểm danh lại cùng MSSV/lớp/ngày: không tạo thêm bản ghi trên cùng thiết bị. Thử lại giữ nguyên timestamp để backend xử lý LWW.

## Phần backend chưa có

- Chưa có API thời khóa biểu cá nhân. Tab Lịch học giữ ở chế độ mock; chế độ thật dùng Điểm danh chọn lớp/ngày, không tự nhận danh sách tất cả lớp là thời khóa biểu của sinh viên.
- Chưa có API danh sách bài nộp theo sinh viên; PWA hiển thị các bài đã nộp trên thiết bị này. Xóa dữ liệu trình duyệt sẽ mất mã đọc bài nộp.
- Chưa có đăng nhập/phân quyền đầy đủ. Không đưa bản thử nghiệm có thao tác học vụ và nhập tài liệu lên internet công khai trước khi hoàn thiện xác thực.
- Cài đặt Dashboard cũ chưa có API lưu cấu hình; việc này cần backend riêng, không nằm trong các endpoint hiện có.

## Kiểm tra kỹ thuật

- PWA: `npm run build`, `npm test` (FIFO, lỗi HTTP 200, ACK, thử lại timestamp, không trùng, DTO đăng ký, token bài nộp, FAQ).
- Dashboard: `npm run build`.
- Chưa chạy các luồng thật trên Linux/n8n/CSDL của bạn, chưa kiểm tra giao diện bằng trình duyệt theo yêu cầu để bạn tự thử.
