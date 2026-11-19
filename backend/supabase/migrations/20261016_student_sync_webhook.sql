-- ============================================================================
-- MIGRATION: 20261016_student_sync_webhook.sql
-- MỤC ĐÍCH: ĐỒNG BỘ DỮ LIỆU SINH VIÊN TỪ SUPABASE (SSOT) SANG MONGODB
-- ============================================================================
-- Hệ thống sử dụng Supabase (PostgreSQL) làm Single Source of Truth (SSOT).
-- Khi có sinh viên mới được thêm (INSERT) hoặc cập nhật (UPDATE) trên bảng public.students,
-- sự kiện sẽ tự động gửi webhook sang NestJS Backend:
--   Endpoint: POST /api/v1/internal/sync/supabase-student
--   Header:   x-webhook-secret: <giá trị SUPABASE_WEBHOOK_SECRET của backend>
--
-- KHÔNG ghi secret hay URL thật vào file này. Cả hai được đọc từ Supabase Vault.
-- Chạy một lần trên từng môi trường (SQL Editor), thay giá trị trong <...>:
--
--   SELECT vault.create_secret('<chuỗi ngẫu nhiên >= 32 ký tự>', 'student_sync_webhook_secret');
--   SELECT vault.create_secret('<URL backend>/api/v1/internal/sync/supabase-student',
--                              'student_sync_webhook_url');
--
-- Đổi giá trị về sau: SELECT vault.update_secret(id, '<giá trị mới>') với id lấy từ vault.secrets.
-- ============================================================================

-- CÁCH 1: CẤU HÌNH TỰ ĐỘNG BẰNG SQL VỚI PG_NET + SUPABASE VAULT
-- ----------------------------------------------------------------------------
-- 1. Bật extension pg_net (hàm nằm trong schema `net`)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Tạo function trigger gửi HTTP POST payload sang NestJS Backend
CREATE OR REPLACE FUNCTION public.sync_student_to_backend()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  request_id BIGINT;
  endpoint_url TEXT;
  secret_key TEXT;
BEGIN
  SELECT decrypted_secret INTO secret_key
  FROM vault.decrypted_secrets
  WHERE name = 'student_sync_webhook_secret';

  SELECT decrypted_secret INTO endpoint_url
  FROM vault.decrypted_secrets
  WHERE name = 'student_sync_webhook_url';

  IF secret_key IS NULL OR endpoint_url IS NULL THEN
    RAISE WARNING 'Bỏ qua sync student [%]: thiếu student_sync_webhook_secret hoặc student_sync_webhook_url trong Vault', NEW.id;
    RETURN NEW;
  END IF;

  -- Đóng gói payload đúng định dạng Supabase Webhook chuẩn
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
  );

  -- Gọi HTTP POST bất đồng bộ qua pg_net
  SELECT net.http_post(
    url := endpoint_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', secret_key
    ),
    timeout_milliseconds := 5000
  ) INTO request_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ghi nhận log cảnh báo, không làm gián đoạn transaction chính của PostgreSQL
    RAISE WARNING 'Lỗi khi kích hoạt pg_net webhook sync student [%]: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Chỉ trigger được gọi function này
REVOKE EXECUTE ON FUNCTION public.sync_student_to_backend() FROM PUBLIC, anon, authenticated;

-- 3. Gắn Trigger vào bảng public.students
DROP TRIGGER IF EXISTS trg_sync_student_to_backend ON public.students;
CREATE TRIGGER trg_sync_student_to_backend
AFTER INSERT OR UPDATE
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_to_backend();

-- ============================================================================
-- CÁCH 2: CẤU HÌNH QUA GIAO DIỆN SUPABASE DASHBOARD (thay cho Cách 1, không dùng cả hai)
-- ============================================================================
-- 1. Supabase Dashboard -> chọn project -> "Database" -> "Webhooks".
-- 2. "Create Webhook":
--    - Name: `sync_students_to_mongodb`
--    - Table: `students` (Schema `public`), Events: Insert + Update
--    - Type: `HTTP Request`, Method: `POST`
--    - URL: `<URL backend>/api/v1/internal/sync/supabase-student`
--    - Headers: `Content-Type` = `application/json`,
--               `x-webhook-secret` = giá trị SUPABASE_WEBHOOK_SECRET (nhập tay, không lưu vào repo)
--    - Timeout: 5000 ms
-- ============================================================================
