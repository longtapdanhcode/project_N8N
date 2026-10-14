# Cổng chung VKU — localhost:3000

## Chạy ứng dụng

Tại thư mục gốc `D:\projectN8N\project_N8N`:

```powershell
npm run dev
```

Mở http://localhost:3000. Chỉ có một server web ở cổng 3000; không cần chạy riêng PWA ở 5173 hoặc giảng viên ở 3001.

Nếu chưa có dependencies, chạy `npm --prefix front install` và `npm --prefix student-pwa install` trước. Dùng Node.js 22.23 trở lên.

Chạy bản đã build:

```powershell
npm run build
npm start
```

`dev` và `build` kiểm tra TypeScript, build PWA tại `/student/` rồi sao chép tài nguyên sinh viên vào thư mục public của Next.js. Khi sửa mã nguồn sinh viên, dừng và chạy lại lệnh gốc để tạo bản PWA mới. Giao diện giảng viên có hot reload trong chế độ dev.

## Tài khoản mẫu

| Vai trò | Tài khoản | Mật khẩu demo | Trang đến |
|---|---|---|---|
| Giảng viên | gv.demo | DemoGV2026! | /teacher |
| Sinh viên | 23IT112 | DemoSV2026! | /student/index.html |

Đây là tài khoản công khai cho bản thử nghiệm, không phải thông tin đăng nhập thật. Backend chưa có API xác thực của trường. Vai trò lấy từ danh sách tài khoản phía server; người dùng không tự chọn quyền trong form đăng nhập.

Phiên dùng cookie HttpOnly/SameSite, ký HMAC, hết hạn sau 8 giờ. Script chạy tạo khóa ngẫu nhiên trong bộ nhớ; khởi động lại server có thể yêu cầu đăng nhập lại. Đăng xuất xóa cookie và bản ghi phiên offline trong tab sinh viên. Cơ chế này chưa có kho thu hồi phiên hoặc quản lý tài khoản production.

## Cấu trúc

- `front/app/page.tsx`: đăng nhập chung.
- `front/app/teacher/`: các trang giảng viên, giữ bảng sinh viên, điểm danh, đồ án, tài liệu, cài đặt.
- `front/components/layout/DashboardShell.tsx`: header chữ, tab ngang, khoảng cách và màu navy giống khu vực sinh viên.
- `front/proxy.ts`: kiểm tra phiên và vai trò trước khi mở trang.
- `front/app/api/session/route.ts`: đăng nhập, đọc phiên, đăng xuất.
- `student-pwa/`: giữ chức năng học tập/offline; `PortalGate` xác nhận phiên trước khi hiển thị.
- `front/app/api/student-data/`: phục vụ mock sinh viên qua cùng cổng, kiểm tra cookie sinh viên.
- `front/lib/portal-mock.ts`: dữ liệu mẫu cho giao diện giảng viên.

Service worker chỉ kiểm soát `/student/`, không kiểm soát trang đăng nhập hoặc khu vực giảng viên. Offline cho phép tiếp tục phiên sinh viên đã xác nhận trong cùng tab và chưa hết hạn; lần đăng nhập đầu tiên cần mạng. Hàng đợi vẫn được giữ nếu hết phiên hoặc API từ chối xác nhận.

## Kiểm tra

```powershell
npm run test:portal
node scripts/portal-smoke.mjs
npm --prefix student-pwa test
```

Chạy smoke test khi `npm start` đang chạy trên 3000. Nó kiểm tra đăng nhập, sai mật khẩu/Origin, role guard, cả 6 trang giảng viên, PWA và API mẫu cùng cổng, manifest/service worker và đăng xuất. Không dùng thông tin thật, không gọi n8n hay gửi email.

## Phạm vi

Lệnh chạy chung hiện mặc định dùng dữ liệu minh họa. Backend/n8n không bị sửa hoặc gọi để thực hiện nghiệp vụ thật. Muốn triển khai thật cần API đăng nhập, tài khoản, quyền dữ liệu, thu hồi phiên và nối gateway API với backend. Chưa kiểm tra bố cục bằng trình duyệt theo yêu cầu trước đó để bạn tự xem.

Nếu backend cũng đang chiếm cổng 3000 trên cùng máy, chuyển backend sang cổng riêng trước; chỉ frontend dành cổng 3000.
