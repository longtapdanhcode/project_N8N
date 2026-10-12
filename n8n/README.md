# Nối ba workflow của sinh viên với NestJS

Các JSON đều có 12 node. Backend bổ sung API cho FAQ, bài nộp và mốc đồ án; ba luồng đăng ký học phần/điểm danh/cảnh báo của nhóm khác vẫn dùng API cũ.

## Chạy backend

Trong `backend/`, dùng Node.js 24.9 trở lên để chạy được bộ test Jest với NestJS ESM:

```sh
npm ci
npm run build
npm test -- --runInBand
npm run start:dev
```

Giữ cấu hình MongoDB, Redis, Supabase và Gemini trong `.env` riêng của bạn. Đối chiếu `.env.example`, bổ sung:

```dotenv
PORT=3001
N8N_FAQ_URL=http://DIA_CHI_N8N:5679/webhook/student-faq
N8N_ASSIGNMENT_URL=http://DIA_CHI_N8N:5679/webhook/assignment-analyzed
N8N_THESIS_URL=http://DIA_CHI_N8N:5679/webhook/thesis-milestone-updated
WEBHOOK_SECRET=KHOA_HMAC_CHUNG
N8N_INTERNAL_API_KEY=KHOA_NOI_BO_RIENG
```

Thay địa chỉ và khóa; không commit `.env`. Sinh mỗi khóa bằng `openssl rand -hex 32`. Backend và n8n phải dùng cùng `WEBHOOK_SECRET`; khóa nội bộ phải khác API key Gemini. Nếu dashboard cũng dùng cổng 3001, chạy dashboard ở cổng khác hoặc đổi PORT và địa chỉ callback cho khớp.

## Cấu hình n8n trên Linux

Import lại các JSON đã cập nhật. Đặt biến môi trường của n8n:

```dotenv
WEBHOOK_SECRET=KHOA_HMAC_CHUNG
NESTJS_BASE_URL=http://DIA_CHI_BACKEND:3001
NODE_FUNCTION_ALLOW_BUILTIN=crypto
```

Nếu sử dụng task runner riêng, cho phép module `crypto` ở runner. Code node phải được phép đọc biến môi trường; nếu bị chặn hãy nhờ người quản lý n8n cấu hình quyền phù hợp.

`DIA_CHI_BACKEND` phải truy cập được từ n8n: tên service khi cùng Docker network hoặc IP máy chạy backend. `localhost` chỉ đúng khi backend chạy trong cùng môi trường mạng với tiến trình n8n. Docker trên Linux cần ánh xạ `host.docker.internal:host-gateway` nếu dùng tên đó để truy cập host.

Tạo hai Header Auth credential độc lập:

| Dùng cho | Name | Value |
|---|---|---|
| Gemini | `x-goog-api-key` | API key Gemini |
| Đọc bài/lưu nhận xét/lưu thông báo/lưu phản hồi đồ án | `x-internal-api-key` | Giá trị `N8N_INTERNAL_API_KEY` ở backend |

FAQ: thay `YOUR_PROJECT` trong node Supabase bằng địa chỉ dự án, chọn Custom Auth với hai header `apikey` và `Authorization: Bearer ...`. Cần có RPC `hybrid_search_rrf`, tài liệu và vector 768 chiều. Chọn model Gemini mà tài khoản của bạn được phép dùng trong URL node Gemini (và trường `model` ở node Lưu kết quả). Backend chỉ lưu model do workflow gửi, không tự chọn model.

Đồ án: chọn MongoDB credential, database `vku-ai-support`, collection `theses`. `thesisId` và `milestoneId` là các Mongo ObjectId 24 ký tự hex.

Publish/activate các workflow trước khi gọi production webhook. Backend gửi `X-Signature` HMAC-SHA256 trên body gốc. Workflow bài nộp nhận body có `event: ASSIGNMENT_ANALYZED`; workflow đồ án nhận header `X-Event-Type: THESIS_MILESTONE_UPDATED`.

## API và dữ liệu kiểm thử

| API | Mục đích |
|---|---|
| `POST /faq/ask` | Gửi `{question, studentId?}` sang FAQ n8n, trả câu trả lời |
| `POST /submissions` | Lưu `{studentId, assignmentTitle, content, criteria?}` vào MongoDB rồi đưa vào BullMQ |
| `GET /submissions/:id` | PWA đọc trạng thái/nhận xét/thông báo bằng header `x-submission-token` |
| `GET /api/internal/submissions/:id` | n8n đọc nội dung bài nộp |
| `POST /api/internal/submissions/:id/ai-feedback` | n8n lưu `{submissionId, studentId, model, feedback}`; feedback gồm summary, score 0–10, strengths, weaknesses, suggestions |
| `POST /api/internal/notifications/assignment-analyzed` | Lưu thông báo từ nhận xét đã lưu, không tạo thêm thông báo khi gọi lại |
| `PATCH /theses/:id/milestones/:milestoneId` | Gửi `{status}` để cập nhật mốc và gọi n8n |
| `POST /internal/theses/:id/milestones/:milestoneId/feedback` | n8n gửi `{aiFeedback}`; lưu khi mốc còn COMPLETED, không gọi lại webhook |

Các API `/api/internal/...` và `/internal/...` yêu cầu Header Auth nội bộ. Không đưa khóa nội bộ vào PWA. `POST /submissions` trả `submissionId` và `readToken`; PWA giữ token riêng cho bài nộp để gọi GET. Backend lưu hash của token. API nhận bài/FAQ/cập nhật mốc hiện theo cơ chế truy cập của dự án (chưa có đăng nhập sinh viên); cần tích hợp xác thực người dùng trước khi triển khai công khai.

Ví dụ nộp bài:

```sh
curl -X POST http://localhost:3001/submissions \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"23IT123","assignmentTitle":"Bài 1 - Danh sách liên kết","content":"Danh sách liên kết đơn gồm các nút chứa dữ liệu và con trỏ next.","criteria":["Đúng kiến thức","Trình bày rõ"]}'
```

Đọc kết quả:

```sh
curl http://localhost:3001/submissions/ID_TRA_VE \
  -H 'x-submission-token: TOKEN_TRA_VE'
```

Chờ trạng thái COMPLETED hoặc FAILED. BullMQ thử tối đa ba lần khi n8n lỗi; callback lưu cùng record nên không nhân bản thông báo. Nếu Redis lỗi khi nhận bài, trạng thái lưu là QUEUE_FAILED.

Thông báo hiện được lưu bền và có thể đọc bằng GET; giao diện PWA chưa nối các API mới, chưa có Socket.io push. Kiểm thử cục bộ mock MongoDB/Redis/n8n; chưa chứng minh kết nối thật tới n8n của nhóm trên Linux.
