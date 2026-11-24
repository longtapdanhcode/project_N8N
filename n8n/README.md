# Nối ba workflow của sinh viên với NestJS

FAQ và mốc đồ án có 12 node; bài nộp có thêm bộ node chống trùng (24 node). Backend bổ sung API cho FAQ, bài nộp và mốc đồ án; ba luồng đăng ký học phần/điểm danh/cảnh báo của nhóm khác vẫn dùng API cũ.

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

## Chống trùng theo X-Delivery-Id

Backend gửi lại một sự kiện khi chắc n8n chưa xử lý xong (lỗi kết nối, HTTP 429/502/503/504), và PWA gửi lại lô điểm danh hoặc đăng ký với cùng `Idempotency-Key`. Mọi lần gửi lại giữ nguyên header `X-Delivery-Id`, nên workflow có tác dụng phụ phải bỏ qua mã đã xử lý.

### Cách hoạt động

Workflow ghi mã vào bộ sưu tập MongoDB `n8n_deliveries` (cùng database `vku-ai-support` với backend) trước khi làm việc thật:

| Tình huống | Trả về |
|---|---|
| Mã mới | Xử lý bình thường, ghi `status: done` kèm kết quả, giữ 7 ngày |
| Mã đã xử lý xong | HTTP 200 với đúng kết quả lần đầu, không chạy lại |
| Mã đang được xử lý (hai lần gửi cùng lúc) | HTTP 409 `delivery_in_progress`; bên gửi thử lại sau |
| Một bước xử lý lỗi | Xóa đánh dấu, trả 502 để bên gửi gửi lại an toàn |
| Không ghi hoặc đọc được MongoDB | HTTP 503, không xử lý (thà chậm còn hơn chạy trùng) |
| Thiếu `X-Delivery-Id` | Vẫn xử lý, nhưng không bỏ trùng được |

Bản ghi đang xử lý tự hết hạn sau 10 phút (TTL), nên một lần chạy bị bỏ dở không chặn mãi các lần gửi lại.

Việc chặn trùng dựa vào chỉ mục duy nhất trên `deliveryId`. Backend tự tạo chỉ mục này và chỉ mục TTL trên `expiresAt` khi khởi động (`backend/src/modules/n8n-delivery`). Nếu n8n ghi vào database khác, tạo thủ công:

```js
db.n8n_deliveries.createIndex({ deliveryId: 1 }, { unique: true })
db.n8n_deliveries.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

Thiếu chỉ mục duy nhất thì workflow vẫn chạy nhưng không chặn được trùng.

### Workflow trong repo

- **Bài nộp** đã có bộ node này. Backend gửi `X-Delivery-Id: assignment:<submissionId>` cho mọi lần BullMQ thử lại, nên lần thử lại sau khi n8n đã chấm xong chỉ nhận lại kết quả, không gọi Gemini lần nữa. Chọn MongoDB credential cho 5 node MongoDB mới.
- **Mốc đồ án** và **FAQ**: backend gửi mã ngẫu nhiên và không tự gửi lại, nên chưa cần.

### Ghép vào workflow điểm danh, đăng ký học phần, cảnh báo học vụ

1. Import `templates/delivery-dedupe.json` để xem mẫu, chọn MongoDB credential cho các node MongoDB.
2. Copy 8 node từ **Chuẩn bị chống trùng** đến các node trả 200/409/503, cùng **Chuẩn bị đánh dấu xong**, **Đánh dấu đã xử lý**, **Bỏ đánh dấu khi lỗi**, **Trả 502 cho gửi lại** vào workflow của bạn.
3. Trong **Chuẩn bị chống trùng**: đổi `SCOPE` thành tên riêng của workflow (ví dụ `attendance-offline-sync`) và đổi tên node webhook trong `$('Nhận sự kiện')` cho khớp.
4. Nối sau bước kiểm tra HMAC: chữ ký hợp lệ → **Chuẩn bị chống trùng**; nhánh "lần đầu" của **Lần đầu nhận?** → bước xử lý đầu tiên của bạn.
5. Bước cuối thành công → **Chuẩn bị đánh dấu xong** → **Đánh dấu đã xử lý** → node trả lời 200. Trong **Chuẩn bị đánh dấu xong**, đặt `response` bằng đúng nội dung workflow trả về (ví dụ `ack_token` của điểm danh) để lần gửi trùng nhận lại y nguyên.
6. Với mỗi bước có thể lỗi (HTTP, ghi dữ liệu, gửi email): Settings → On Error → *Continue (using error output)*, nối đầu ra lỗi vào **Bỏ đánh dấu khi lỗi**.

Kiểm tra chữ ký: backend gửi `x-signature: sha256=<hex>`. Mã kiểm tra HMAC trong mẫu chấp nhận cả dạng có và không có tiền tố `sha256=`.

