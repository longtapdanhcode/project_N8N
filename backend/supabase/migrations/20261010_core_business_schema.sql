-- ============================================================================
-- MIGRATION: 20261010_core_business_schema.sql
-- CORE BUSINESS TABLES: Course Registration, Offline Attendance, Academic Warnings
-- ============================================================================

-- 1. Bảng sinh viên (public.students)
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 2. Bảng môn học (public.courses)
CREATE TABLE IF NOT EXISTS public.courses (
    id VARCHAR(50) PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    prerequisite_course_id VARCHAR(50) REFERENCES public.courses(id)
);

-- 3. Bảng lớp học phần (public.class_sections)
CREATE TABLE IF NOT EXISTS public.class_sections (
    id VARCHAR(50) PRIMARY KEY,
    course_id VARCHAR(50) NOT NULL REFERENCES public.courses(id),
    course_name VARCHAR(255) NOT NULL,
    max_capacity INT NOT NULL DEFAULT 50,
    current_enrolled INT NOT NULL DEFAULT 0,
    schedule_day INT NOT NULL,
    start_period INT NOT NULL,
    end_period INT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bảng đăng ký học phần (public.enrollments)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL REFERENCES public.students(id),
    course_id VARCHAR(50) NOT NULL REFERENCES public.courses(id),
    class_section_id VARCHAR(50) NOT NULL REFERENCES public.class_sections(id),
    semester VARCHAR(50) NOT NULL,
    grade NUMERIC(3,2),
    status VARCHAR(50) DEFAULT 'ENROLLED',
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_section UNIQUE (student_id, class_section_id)
);

-- 5. Bảng điểm danh (public.attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL,
    class_section_id VARCHAR(50) NOT NULL,
    session_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    device_timestamp TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_student_id_class_section_id_session_date_key UNIQUE (student_id, class_section_id, session_date)
);

-- 6. Bảng kiểm toán đồng bộ điểm danh (public.attendance_sync_audit)
CREATE TABLE IF NOT EXISTS public.attendance_sync_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(100) NOT NULL,
    accepted_records INT NOT NULL DEFAULT 0,
    discarded_records INT NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bảng cảnh báo học vụ (public.academic_warnings)
CREATE TABLE IF NOT EXISTS public.academic_warnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL,
    gpa NUMERIC(4,2) NOT NULL,
    absent_rate NUMERIC(5,2) NOT NULL,
    warning_tier VARCHAR(50) NOT NULL,
    advisor_email VARCHAR(255) NOT NULL,
    notified_at TIMESTAMPTZ DEFAULT NOW()
);
