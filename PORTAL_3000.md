# Cổng chung VKU — localhost:3000

## Chạy frontend

Từ thư mục gốc:

```powershell
npm run dev
```

Mở http://localhost:3000. Giảng viên tại /teacher; sinh viên tại /student/index.html. Không có chế độ demo hoặc tài khoản mẫu trong ứng dụng. Đăng nhập cần backend và tài khoản trong database.

Backend dùng cổng riêng, thường là 3001. Nếu backend chạy trực tiếp trên máy:

```powershell
npm --prefix backend run start:dev
```

Backend cần MongoDB, Redis và các cấu hình dịch vụ thật. Docker Compose của repo mở Redis trên host cổng 6380; cấu hình backend phải khớp địa chỉ Redis thực tế. Không commit .env.

## Cấu hình frontend

Xem front/.env.example. Các API trung gian dùng BACKEND_INTERNAL_URL, rồi BACKEND_URL, NEXT_PUBLIC_BACKEND_URL; mặc định http://127.0.0.1:3001. Địa chỉ nội bộ dùng ở server, không đưa khóa nội bộ vào trình duyệt.

Danh sách bài nộp giảng viên hiện đọc MongoDB trực tiếp phía server qua MONGODB_URI; chưa có API backend tương đương cho danh sách này. Không kết nối được database sẽ báo lỗi, không giả thành danh sách rỗng.

Script chạy gốc tạo khóa phiên ngẫu nhiên nếu chưa có AUTH_SESSION_SECRET. Khởi động lại có thể yêu cầu đăng nhập lại. Triển khai lâu dài nên cấu hình khóa ngẫu nhiên riêng ít nhất 32 ký tự. Không dùng khóa mẫu công khai. Vai trò lấy từ backend; không tự chọn trên form.

## Build

```powershell
npm run build
npm start
```

Lệnh dev/build kiểm tra TypeScript, build PWA và sao chép sang front/public/student. Khi sửa mã sinh viên, chạy lại lệnh gốc để tạo bản mới. Giảng viên có hot reload khi chạy dev.

Service Worker chỉ kiểm soát /student/. Bản mới tự kích hoạt; tab đang mở cần tải lại để dùng mã giao diện mới. Dữ liệu Dexie và hàng đợi không bị xóa khi cập nhật.

## Phạm vi API

- /api/student-data/class-sections được xử lý bởi frontend rồi chuyển thành /class-sections tại backend. Proxy chung chỉ chạy sau các route của ứng dụng.
- API bài nộp, FAQ và điểm yêu cầu phiên sinh viên; danh sách bài nộp yêu cầu phiên giảng viên.
- Điểm lấy từ backend, không trả điểm mẫu khi dịch vụ lỗi. Không có điểm thật sẽ trả danh sách rỗng.
- Backend hiện chưa có API lịch học cá nhân: API lịch học trả 501 với thông báo rõ, không dựng thời khóa biểu giả.
- Mốc đồ án sinh viên chỉ được cập nhật khi backend xác nhận đồ án thuộc MSSV trong phiên.
- Lỗi backend giữ mã trạng thái tương ứng; không kết nối được trả 502/503.

## Kiểm tra không cần database thật

```powershell
npm run test:portal
npm --prefix student-pwa test
node scripts/portal-smoke.mjs
```

Smoke test tự mở một HTTP backend fixture trong bộ nhớ và một frontend tạm trên cổng 3099; nó không thêm tài khoản hay chế độ đăng nhập thử vào ứng dụng, không gọi n8n/email/database thật. Nó kiểm tra đăng nhập qua backend, role guard, proxy lớp học phần, các trường dữ liệu bắt buộc và lỗi dịch vụ. Đây là kiểm thử hợp đồng API, không thay cho kiểm thử tích hợp với backend/n8n thật.

Chưa có database thì đăng nhập ứng dụng thật vẫn báo lỗi xác thực/kết nối. Không tự fallback sang dữ liệu minh họa.
