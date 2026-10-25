BEGIN;

CREATE TABLE categories (
    category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE priorities (
    priority_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    priority_name VARCHAR(30) NOT NULL UNIQUE,
    priority_level SMALLINT NOT NULL UNIQUE CHECK (priority_level BETWEEN 1 AND 5)
);

CREATE TABLE task_statuses (
    status_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE tasks (
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

CREATE TABLE task_history (
    history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    old_status_id BIGINT REFERENCES task_statuses(status_id),
    new_status_id BIGINT REFERENCES task_statuses(status_id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_tasks_category_id ON tasks(category_id);
CREATE INDEX idx_tasks_priority_id ON tasks(priority_id);
CREATE INDEX idx_tasks_status_id ON tasks(status_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_title ON tasks(LOWER(title));

INSERT INTO categories (category_name, description) VALUES
    ('Pekerjaan', 'Tugas yang berkaitan dengan pekerjaan'),
    ('Personal', 'Tugas pribadi'),
    ('Akademik', 'Tugas kuliah atau sekolah');

INSERT INTO priorities (priority_name, priority_level) VALUES
    ('Rendah', 1),
    ('Normal', 2),
    ('Tinggi', 3),
    ('Penting', 4),
    ('Darurat', 5);

INSERT INTO task_statuses (status_name) VALUES
    ('Belum Selesai'),
    ('Sedang Dikerjakan'),
    ('Selesai');

COMMIT;
