## Cổng frontend chung — cổng 3000

Đăng nhập dùng tài khoản từ backend/database. Xem cách cấu hình và kiểm tra tại [PORTAL_3000.md](PORTAL_3000.md).

Chạy `npm run dev` tại thư mục gốc, mở http://localhost:3000 và đăng nhập bằng tài khoản mẫu. Xem [hướng dẫn cổng chung](PORTAL_3000.md). Hướng dẫn này thay thế cách chạy hai cổng frontend riêng bên dưới.

# VKU AI Student Support System (Project N8N)

> Hệ thống Trợ lý AI và Tự động hóa Quy trình Học vụ dành cho Trường Đại học Công nghệ Thông tin và Truyền thông Việt - Hàn (VKU), kết hợp **NestJS**, **Google Gemini**, **Supabase pgvector**, **Redis BullMQ** và **n8n Automation**.

---

## 📑 Mục lục
- [1. Kiến trúc & Công nghệ](#1-kiến-trúc--công-nghệ)
- [2. Các Tính năng Chính](#2-các-tính-năng-chính)
- [3. Cấu trúc Dự án](#3-cấu-trúc-dự-án)
- [4. Hướng dẫn Khởi chạy](#4-hướng-dẫn-khởi-chạy)
  - [4.1. Khởi chạy Hạ tầng Docker](#41-khởi-chạy-hạ-tầng-docker)
  - [4.2. Thiết lập Biến Môi trường](#42-thiết-lập-biến-môi-trường)
  - [4.3. Cài đặt và Chạy Backend](#43-cài-đặt-và-chạy-backend)
- [5. Danh sách API Endpoints](#5-danh-sách-api-endpoints)
- [6. Bộ Scripts Kiểm thử & Tự động hóa](#6-bộ-scripts-kiểm-thử--tự-động-hóa)
- [7. Tài liệu & Kiểm toán Kiến trúc](#7-tài-liệu--kiểm-toán-kiến-trúc)

---

## 1. Kiến trúc & Công nghệ

### Sơ đồ luồng hệ thống
```mermaid
flowchart TD
    Client["Sinh viên / Client / n8n Webhook"] -->|HTTP REST| API["AppController (NestJS API Port 3001)"]

    subgraph CoreBackend ["NestJS Backend Architecture"]
        API --> AiService["AiService (RAG Pipeline Orchestrator)"]
        API --> WebhookService["WebhookService (HMAC-SHA256 Sign & Verify)"]

        AiService --> GeminiService["GeminiService (Google Gen AI)"]
        AiService --> SupabaseService["SupabaseService (pgvector & RPC)"]

        AssignmentProcessor["AssignmentProcessor (BullMQ Worker)"] -->|Async Job| WebhookService
    end

    subgraph DataAndAI ["AI & CSDL & Tự động hóa"]
        GeminiService --> GoogleAI["Google Gemini 2.5 Flash / Embeddings"]
        SupabaseService --> SupabaseCloud["Supabase PostgreSQL (Hybrid Search RRF)"]
        WebhookService --> N8N["n8n Workflow Automation (Port 5679)"]
        AssignmentProcessor --> Redis["Redis 7.0 Queue (Port 6380)"]
        CoreBackend --> Mongo["MongoDB 6.0 Nghiệp vụ (Port 27017)"]
    end
```

### Bảng công nghệ chính
| Phân hệ | Công nghệ / Thư viện | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Backend Core** | NestJS 12, TypeScript | Framework chính xây dựng REST API và điều phối dịch vụ |
| **LLM & Embeddings** | `@google/genai` (Gemini 2.5 Flash, 768-dim) | Mô hình ngôn ngữ lớn và vector embedding tri thức học vụ |
| **Vector DB & Search** | Supabase (`pgvector`, Full-text Search) | Lưu trữ tài liệu, tìm kiếm kết hợp Hybrid Search (RRF) |
| **Automation** | n8n Workflow Automation | Điều phối workflow phản hồi, thông báo và tác vụ tự động |
| **Async Queue** | BullMQ, Redis 7.0 (`ioredis`) | Hàng đợi tác vụ bất đồng bộ xử lý bài tập, tác vụ dài hạn |
| **CSDL Nghiệp vụ** | MongoDB 6.0 (`@nestjs/mongoose`) | Quản lý đề tài đồ án tốt nghiệp và dữ liệu sinh viên |
| **Bảo mật** | HMAC-SHA256 (`crypto.timingSafeEqual`) | Ký số và xác thực webhook 2 chiều giữa NestJS & n8n |

---

## 2. Các Tính năng Chính

1. **RAG Pipeline Thông minh (Retrieval-Augmented Generation)**:
   - Tự động trích xuất ngữ cảnh liên quan từ cơ sở tri thức quy chế học vụ VKU.
   - Định dạng đầu ra có cấu trúc nghiêm ngặt (**Structured Outputs**) theo chuẩn JSON Schema.
   - Tự động đánh giá độ tin cậy (`confidence_score`), trích dẫn nguồn (`citations`) và tự kích hoạt cờ chuyển giao chuyên viên tư vấn (`requires_human_escalation: true`) khi câu hỏi ngoài phạm vi hoặc độ tin cậy < 0.6.

2. **Tìm kiếm Kết hợp (Hybrid Search RRF)**:
   - Thuật toán **Reciprocal Rank Fusion (RRF)** kết hợp song song giữa tìm kiếm từ khóa toàn văn (Full-Text Search) và tìm kiếm ngữ nghĩa vector (Cosine Similarity).
   - Tối ưu hóa độ chính xác xếp hạng tài liệu tham khảo cho LLM.

3. **Webhook Bảo mật 2 chiều với n8n**:
   - Tự động ký số payload bằng HMAC-SHA256 trước khi gửi sang n8n.
   - Endpoint tiếp nhận callback xác thực chữ ký an toàn với kỹ thuật so sánh hằng số thời gian chống timing attacks.

4. **Xử lý Tác vụ Nền Bất đồng bộ (Async Queue)**:
   - Tích hợp BullMQ để xử lý các luồng tính toán nặng (chấm bài, thẩm định đề tài) trong nền mà không làm nghẽn luồng HTTP chính.

---

## 3. Cấu trúc Dự án

```
vku-ai-system/
├── docker-compose.yml              # Hạ tầng Docker: n8n, MongoDB, Redis, PGVector
├── PROJECT_AUDIT.md                # Báo cáo kiểm toán toàn diện hệ thống
├── README.md                       # Tài liệu hướng dẫn dự án
└── backend/
    ├── src/
    │   ├── app.controller.ts       # Router endpoints chính (AI, Webhooks, Test)
    │   ├── app.module.ts           # Root module khai báo DI và cấu hình
    │   ├── main.ts                 # Entrypoint NestJS (Raw body, CORS, Body parsers)
    │   └── modules/
    │       ├── ai/                 # Phân hệ RAG, Gemini AI và Supabase pgvector
    │       │   ├── ai.service.ts
    │       │   ├── gemini.service.ts
    │       │   └── supabase.service.ts
    │       ├── assignment/         # Hàng đợi BullMQ xử lý tác vụ nền
    │       ├── thesis/             # Module quản lý đồ án tốt nghiệp trên MongoDB
    │       └── webhook/            # Module ký số và xác thực HMAC với n8n
    ├── scripts/
    │   ├── test-ask-assistant.ts   # Script test hỏi đáp RAG trên console
    │   ├── test-hybrid-search.ts   # Script test tìm kiếm Hybrid Search RRF
    │   ├── verify-phase2-suite.ts  # Bộ kiểm thử tự động toàn diện Phase 2
    │   └── hybrid_search_rrf.sql   # SQL khởi tạo RPC hàm RRF trên PostgreSQL
    ├── supabase/
    │   └── migrations/             # SQL Migrations cho Supabase
    ├── .env.example                # File mẫu biến môi trường
    └── package.json
```

---

## 4. Hướng dẫn Khởi chạy

### 4.1. Khởi chạy Hạ tầng Docker

Khởi động các dịch vụ phụ trợ nền tảng:
```bash
docker compose up -d
```

Các cổng dịch vụ mặc định:
- **n8n Workflow**: `http://localhost:5679`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6380` (container port 6379)
- **Local pgvector**: `localhost:5432`

### 4.2. Thiết lập Biến Môi trường

Vào thư mục `backend`, sao chép file mẫu:
```bash
cd backend
cp .env.example .env
```

Điền các thông số cần thiết trong `.env`:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/vku-ai-support
REDIS_HOST=localhost
REDIS_PORT=6379
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/test-event
WEBHOOK_SECRET=vku_super_secret_key_2026
DATABASE_URL=postgresql://postgres:supersecretpassword@localhost:5432/vku_ai_rag

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# Supabase (pgvector & Hybrid Search)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### 4.3. Cài đặt và Chạy Backend

```bash
# Cài đặt thư viện
npm install

# Chạy ở chế độ phát triển (Hot reload)
npm run start:dev
```

Backend sẽ khởi chạy tại: `http://localhost:3001`.

---

## 5. Danh sách API Endpoints

| Method | Endpoint | Mô tả | Payload mẫu |
| :--- | :--- | :--- | :--- |
| **POST** | `/ai/ask` | **Hỏi đáp học vụ thông minh qua AI RAG** (trả về JSON chuẩn Structured Output) | `{"question": "Sinh viên vắng quá 20% số tiết có được thi không?"}` |
| **GET** | `/test-hybrid-search` | Test truy vấn Hybrid Search qua Query Params | Query: `?query=Quy chế học vụ` |
| **POST** | `/test-hybrid-search` | Test truy vấn Hybrid Search qua Request Body | `{"query": "Quy chế học vụ VKU"}` |
| **POST** | `/test-webhook` | Gửi dữ liệu test ký HMAC-SHA256 sang webhook n8n | _(Không bắt buộc body)_ |
| **POST** | `/webhook/n8n-response` | Webhook tiếp nhận callback từ n8n (kèm HMAC header) | `{"event": "TASK_DONE", "data": {...}}` |

### Ví dụ Response `/ai/ask` (Structured Output):
```json
{
  "answer": "Theo Quy chế đào tạo và quản lý học vụ VKU, sinh viên vắng quá 20% tổng số tiết của học phần sẽ không đủ điều kiện dự thi kết thúc học phần và nhận điểm F.",
  "confidence_score": 0.95,
  "citations": [
    "Quy chế học vụ VKU - Điều 14 về điều kiện dự thi"
  ],
  "requires_human_escalation": false,
  "suggested_actions": [
    "Liên hệ phòng Đào tạo nếu có lý do chính đáng kèm đơn xin phép",
    "Đăng ký học lại học phần trong học kỳ tiếp theo"
  ]
}
```

---

## 6. Bộ Scripts Kiểm thử & Tự động hóa

Dự án tích hợp sẵn các kịch bản kiểm thử độc lập:

1. **Chạy toàn bộ Verification Suite Phase 2**:
   ```bash
   cd backend
   npx ts-node scripts/verify-phase2-suite.ts
   ```
   *Kiểm tra: 768-dim Embedding $\rightarrow$ Supabase Vector Connection $\rightarrow$ Hybrid Search RRF Ranking $\rightarrow$ Structured Output in-domain & out-domain escalation.*

2. **Chạy thử nghiệm RAG Console**:
   ```bash
   npx ts-node scripts/test-ask-assistant.ts
   ```

3. **Chạy Unit Tests**:
   ```bash
   npm test
   ```

---

## 7. Tài liệu & Kiểm toán Kiến trúc

Để biết thêm thông tin chi tiết về kiến trúc phân tầng, phân tích bảo mật, sơ đồ lớp và đánh giá vận hành chi tiết, vui lòng xem:
👉 **[PROJECT_AUDIT.md](./PROJECT_AUDIT.md)**: *Báo cáo toàn diện về kiến trúc, kho mã nguồn và kiểm toán hệ thống VKU AI System.*

