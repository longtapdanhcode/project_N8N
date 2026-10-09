# VKU AI System (Project N8N)

Hệ thống hỗ trợ sinh viên thông minh tích hợp AI & n8n workflow automation.

## 🛠 Kiến trúc hệ thống & Công nghệ

- **Backend**: NestJS (TypeScript)
- **Workflow Automation**: n8n
- **Database**:
  - MongoDB (CSDL nghiệp vụ)
  - PostgreSQL + pgvector (Vector Database cho RAG)
  - Redis (Message Queue & Caching)
- **Containerization**: Docker Compose

## 🚀 Hướng dẫn khởi chạy

### 1. Khởi chạy hạ tầng dịch vụ (Docker Compose)

```bash
docker compose up -d
```

Các dịch vụ sẽ chạy tại các cổng:
- **n8n**: `http://localhost:5679`
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6380` (container 6379)
- **pgvector**: `localhost:5432`

### 2. Cài đặt và khởi chạy Backend

```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

Backend mặc định chạy trên cổng `http://localhost:3001` (hoặc cấu hình trong `.env`).
