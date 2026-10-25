-- ==========================================================
-- TaskFlow Database Schema for Supabase (PostgreSQL)
-- Penulis: Faridh Adzan Al Arsy (NIM: 21114012610046)
-- Project: Tugas Akhir Learning Labs Backend Development
-- ==========================================================

BEGIN;

-- 1. Tabel Categories (Kategori Tugas)
CREATE TABLE IF NOT EXISTS categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- 2. Tabel Priorities (Tingkat Prioritas Tugas)
CREATE TABLE IF NOT EXISTS priorities (
    priority_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    priority_name VARCHAR(30) NOT NULL UNIQUE,
    priority_level SMALLINT NOT NULL UNIQUE CHECK (priority_level BETWEEN 1 AND 5)
);

-- 3. Tabel Task Statuses (Status Pengerjaan Tugas)
CREATE TABLE IF NOT EXISTS task_statuses (
    status_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name VARCHAR(30) NOT NULL UNIQUE
);

-- 4. Tabel Tasks (Tabel Utama Tugas)
CREATE TABLE IF NOT EXISTS tasks (
    task_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT REFERENCES categories(category_id) ON DELETE SET NULL,
    priority_id BIGINT NOT NULL REFERENCES priorities(priority_id),
    status_id BIGINT NOT NULL REFERENCES task_statuses(status_id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Task History (Log Riwayat Perubahan Status Tugas)
CREATE TABLE IF NOT EXISTS task_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    old_status_id BIGINT REFERENCES task_statuses(status_id),
    new_status_id BIGINT REFERENCES task_statuses(status_id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indexing untuk optimasi query pencarian dan join
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON tasks(priority_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(LOWER(title));

-- ==========================================================
-- SEED DATA AWAL
-- ==========================================================

INSERT INTO categories (category_name, description) VALUES
    ('Pekerjaan', 'Tugas yang berkaitan dengan pekerjaan'),
    ('Personal', 'Tugas pribadi'),
    ('Akademik', 'Tugas kuliah atau sekolah')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO priorities (priority_name, priority_level) VALUES
    ('Rendah', 1),
    ('Normal', 2),
    ('Tinggi', 3),
    ('Penting', 4),
    ('Darurat', 5)
ON CONFLICT (priority_name) DO NOTHING;

INSERT INTO task_statuses (status_name) VALUES
    ('Belum Selesai'),
    ('Sedang Dikerjakan'),
    ('Selesai')
ON CONFLICT (status_name) DO NOTHING;

-- Seed contoh tugas awal
INSERT INTO tasks (category_id, priority_id, status_id, title, description, due_date) VALUES
    (1, 4, 2, 'Menyiapkan Arsitektur REST API & Supabase', 'Implementasi 5 tabel relasional dan CRUD tasks lengkap', NOW() + INTERVAL '2 days'),
    (3, 3, 1, 'Menyelesaikan Laporan Tugas Akhir Backend', 'Dokumentasi pemanggilan endpoint dan bukti pengujian Thunder Client', NOW() + INTERVAL '3 days'),
    (2, 2, 3, 'Membayar Tagihan Listrik & Internet', 'Pembayaran rutin bulanan via mobile banking', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- Mengizinkan pembacaan dan penulisan untuk anon key & service role
-- ==========================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public categories read/write" ON categories;
    CREATE POLICY "Public categories read/write" ON categories FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public priorities read/write" ON priorities;
    CREATE POLICY "Public priorities read/write" ON priorities FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public task_statuses read/write" ON task_statuses;
    CREATE POLICY "Public task_statuses read/write" ON task_statuses FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public tasks read/write" ON tasks;
    CREATE POLICY "Public tasks read/write" ON tasks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public task_history read/write" ON task_history;
    CREATE POLICY "Public task_history read/write" ON task_history FOR ALL USING (true) WITH CHECK (true);
END $$;

COMMIT;
