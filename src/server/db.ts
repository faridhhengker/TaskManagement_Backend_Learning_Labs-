import pg from 'pg';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const { Pool } = pg;

export interface Category {
  category_id: number;
  category_name: string;
  description: string | null;
}

export interface Priority {
  priority_id: number;
  priority_name: string;
  priority_level: number;
}

export interface TaskStatus {
  status_id: number;
  status_name: string;
}

export interface Task {
  task_id: number;
  category_id: number | null;
  priority_id: number;
  status_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  priority?: Priority | null;
  status?: TaskStatus | null;
}

export interface TaskHistory {
  history_id: number;
  task_id: number;
  old_status_id: number | null;
  new_status_id: number | null;
  changed_at: string;
  notes: string | null;
  old_status?: TaskStatus | null;
  new_status?: TaskStatus | null;
}

export interface TaskFilter {
  category_id?: number;
  priority_id?: number;
  status_id?: number;
  search?: string;
}

// -------------------------------------------------------------
// CONNECTION CONFIGURATION: Transaction Pooler & Supabase URL
// -------------------------------------------------------------
function getDatabaseConfig() {
  const transactionPooler =
    process.env.TRANSACTION_POOLER ||
    process.env.TRANSACTION_POOLER_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  // Cek apakah rawSupabaseUrl berupa connection string PostgreSQL (dimulai dengan postgres:// atau postgresql://)
  const isSupabaseUrlPostgres =
    Boolean(rawSupabaseUrl && (rawSupabaseUrl.startsWith('postgres://') || rawSupabaseUrl.startsWith('postgresql://')));

  // Prioritaskan PostgreSQL Transaction Pooler connection string
  const pgConnectionString = transactionPooler || (isSupabaseUrlPostgres ? rawSupabaseUrl : null);

  // Jika ada HTTPS Supabase REST URL
  const httpSupabaseUrl =
    !isSupabaseUrlPostgres && rawSupabaseUrl && rawSupabaseUrl.startsWith('http')
      ? rawSupabaseUrl
      : null;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  return {
    pgConnectionString,
    httpSupabaseUrl,
    supabaseKey,
    hasPooler: Boolean(pgConnectionString),
    hasHttpSupabase: Boolean(httpSupabaseUrl && supabaseKey),
  };
}

let pgPool: pg.Pool | null = null;
let supabaseClient: SupabaseClient | null = null;
let schemaInitialized = false;

export function getPgPool(): pg.Pool | null {
  const { pgConnectionString } = getDatabaseConfig();
  if (!pgConnectionString) return null;

  if (!pgPool) {
    pgPool = new Pool({
      connectionString: pgConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    pgPool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err);
    });
  }

  return pgPool;
}

export function getSupabase(): SupabaseClient | null {
  const { httpSupabaseUrl, supabaseKey } = getDatabaseConfig();
  if (!httpSupabaseUrl || !supabaseKey) return null;

  if (!supabaseClient) {
    supabaseClient = createClient(httpSupabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

/**
 * Otomatis memastikan kelima tabel relasional dan seed awal ada di Supabase
 */
async function ensureTablesExist(pool: pg.Pool) {
  if (schemaInitialized) return;
  try {
    const initSql = `
      BEGIN;

      CREATE TABLE IF NOT EXISTS categories (
          category_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          category_name VARCHAR(50) NOT NULL UNIQUE,
          description TEXT
      );

      CREATE TABLE IF NOT EXISTS priorities (
          priority_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          priority_name VARCHAR(30) NOT NULL UNIQUE,
          priority_level SMALLINT NOT NULL UNIQUE CHECK (priority_level BETWEEN 1 AND 5)
      );

      CREATE TABLE IF NOT EXISTS task_statuses (
          status_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          status_name VARCHAR(30) NOT NULL UNIQUE
      );

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

      CREATE TABLE IF NOT EXISTS task_history (
          history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          task_id BIGINT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
          old_status_id BIGINT REFERENCES task_statuses(status_id),
          new_status_id BIGINT REFERENCES task_statuses(status_id),
          changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority_id ON tasks(priority_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON tasks(status_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(LOWER(title));

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

      COMMIT;
    `;
    await pool.query(initSql);
    schemaInitialized = true;
    console.log('[Database] 5 relational tables verified on Supabase.');
  } catch (err) {
    console.error('[Database Init Error]', err);
  }
}

export function getDatabaseStatus() {
  const config = getDatabaseConfig();
  if (config.hasPooler && config.pgConnectionString) {
    try {
      const u = new URL(config.pgConnectionString);
      return {
        engine: 'supabase_transaction_pooler',
        isSupabaseConfigured: true,
        host: u.host,
        port: u.port || '6543',
        database: u.pathname.replace('/', '') || 'postgres',
        note: 'Terhubung langsung ke database Supabase PostgreSQL via Transaction Pooler',
      };
    } catch {
      return {
        engine: 'supabase_transaction_pooler',
        isSupabaseConfigured: true,
        note: 'Terhubung langsung ke Supabase PostgreSQL via connection string',
      };
    }
  }

  if (config.hasHttpSupabase && config.httpSupabaseUrl) {
    return {
      engine: 'supabase_rest_api',
      isSupabaseConfigured: true,
      supabaseUrl: config.httpSupabaseUrl,
      note: 'Terhubung ke Supabase REST API',
    };
  }

  return {
    engine: 'local_storage_fallback',
    isSupabaseConfigured: false,
    note: 'Berjalan dalam mode lokal fallback. Tambahkan SUPABASE_URL atau TRANSACTION_POOLER untuk menghubungkan ke live database Supabase.',
  };
}

// -------------------------------------------------------------
// LOCAL IN-MEMORY FALLBACK (Jika kedua env belum disetel)
// -------------------------------------------------------------
const localCategories: Category[] = [
  { category_id: 1, category_name: 'Pekerjaan', description: 'Tugas yang berkaitan dengan pekerjaan' },
  { category_id: 2, category_name: 'Personal', description: 'Tugas pribadi' },
  { category_id: 3, category_name: 'Akademik', description: 'Tugas kuliah atau sekolah' },
];

const localPriorities: Priority[] = [
  { priority_id: 1, priority_name: 'Rendah', priority_level: 1 },
  { priority_id: 2, priority_name: 'Normal', priority_level: 2 },
  { priority_id: 3, priority_name: 'Tinggi', priority_level: 3 },
  { priority_id: 4, priority_name: 'Penting', priority_level: 4 },
  { priority_id: 5, priority_name: 'Darurat', priority_level: 5 },
];

const localStatuses: TaskStatus[] = [
  { status_id: 1, status_name: 'Belum Selesai' },
  { status_id: 2, status_name: 'Sedang Dikerjakan' },
  { status_id: 3, status_name: 'Selesai' },
];

let localTasks: Task[] = [
  {
    task_id: 1,
    category_id: 1,
    priority_id: 4,
    status_id: 2,
    title: 'Menyiapkan Arsitektur REST API & Supabase',
    description: 'Implementasi 5 tabel relasional (categories, priorities, task_statuses, tasks, task_history) dan endpoint CRUD lengkap.',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    task_id: 2,
    category_id: 3,
    priority_id: 3,
    status_id: 1,
    title: 'Menyelesaikan Laporan Tugas Akhir Backend',
    description: 'Menyusun dokumentasi pemanggilan setiap endpoint dan bukti pengujian Thunder Client sesuai rubrik penilaian.',
    due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    task_id: 3,
    category_id: 2,
    priority_id: 2,
    status_id: 3,
    title: 'Membayar Tagihan Listrik & Internet',
    description: 'Melakukan pembayaran tagihan rutin bulanan melalui mobile banking.',
    due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let localHistory: TaskHistory[] = [
  {
    history_id: 1,
    task_id: 1,
    old_status_id: null,
    new_status_id: 1,
    changed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Tugas baru dibuat',
  },
  {
    history_id: 2,
    task_id: 1,
    old_status_id: 1,
    new_status_id: 2,
    changed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Pengerjaan dimulai',
  },
  {
    history_id: 3,
    task_id: 3,
    old_status_id: 1,
    new_status_id: 3,
    changed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Selesai',
  },
];

let nextTaskId = 4;
let nextHistoryId = 4;
let nextCategoryId = 4;

function attachRelationsLocal(task: Task): Task {
  const category = localCategories.find((c) => c.category_id === task.category_id) || null;
  const priority = localPriorities.find((p) => p.priority_id === task.priority_id) || null;
  const status = localStatuses.find((s) => s.status_id === task.status_id) || null;
  return { ...task, category, priority, status };
}

// -------------------------------------------------------------
// CRUD FUNCTIONS (Transaction Pooler PG Client)
// -------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const res = await pool.query('SELECT * FROM categories ORDER BY category_id ASC;');
    return res.rows.map((r) => ({
      category_id: Number(r.category_id),
      category_name: r.category_name,
      description: r.description,
    }));
  }

  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.from('categories').select('*').order('category_id', { ascending: true });
    if (data) return data;
  }

  return [...localCategories];
}

export async function createCategory(name: string, description?: string): Promise<Category> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const res = await pool.query(
      'INSERT INTO categories (category_name, description) VALUES ($1, $2) RETURNING *;',
      [name, description || null]
    );
    const r = res.rows[0];
    return {
      category_id: Number(r.category_id),
      category_name: r.category_name,
      description: r.description,
    };
  }

  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.from('categories').insert({ category_name: name, description: description || null }).select().single();
    if (data) return data;
  }

  const newCat: Category = {
    category_id: nextCategoryId++,
    category_name: name,
    description: description || null,
  };
  localCategories.push(newCat);
  return newCat;
}

export async function getPriorities(): Promise<Priority[]> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const res = await pool.query('SELECT * FROM priorities ORDER BY priority_level ASC;');
    return res.rows.map((r) => ({
      priority_id: Number(r.priority_id),
      priority_name: r.priority_name,
      priority_level: Number(r.priority_level),
    }));
  }

  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.from('priorities').select('*').order('priority_level', { ascending: true });
    if (data) return data;
  }

  return [...localPriorities];
}

export async function getStatuses(): Promise<TaskStatus[]> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const res = await pool.query('SELECT * FROM task_statuses ORDER BY status_id ASC;');
    return res.rows.map((r) => ({
      status_id: Number(r.status_id),
      status_name: r.status_name,
    }));
  }

  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.from('task_statuses').select('*').order('status_id', { ascending: true });
    if (data) return data;
  }

  return [...localStatuses];
}

/**
 * 1. getDaftarTugas & 6. cariTugasByKategori
 * Mengambil daftar tugas dengan filter (kategori, prioritas, status, search)
 */
export async function getTasks(filter: TaskFilter = {}): Promise<Task[]> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filter.category_id) {
      conditions.push(`t.category_id = $${paramIndex++}`);
      values.push(filter.category_id);
    }
    if (filter.priority_id) {
      conditions.push(`t.priority_id = $${paramIndex++}`);
      values.push(filter.priority_id);
    }
    if (filter.status_id) {
      conditions.push(`t.status_id = $${paramIndex++}`);
      values.push(filter.status_id);
    }
    if (filter.search && filter.search.trim()) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      values.push(`%${filter.search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        t.task_id,
        t.category_id,
        t.priority_id,
        t.status_id,
        t.title,
        t.description,
        t.due_date,
        t.created_at,
        t.updated_at,
        CASE WHEN c.category_id IS NOT NULL THEN
          json_build_object(
            'category_id', c.category_id,
            'category_name', c.category_name,
            'description', c.description
          )
        ELSE NULL END AS category,
        json_build_object(
          'priority_id', p.priority_id,
          'priority_name', p.priority_name,
          'priority_level', p.priority_level
        ) AS priority,
        json_build_object(
          'status_id', s.status_id,
          'status_name', s.status_name
        ) AS status
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.category_id
      INNER JOIN priorities p ON t.priority_id = p.priority_id
      INNER JOIN task_statuses s ON t.status_id = s.status_id
      ${whereClause}
      ORDER BY t.created_at DESC;
    `;

    const res = await pool.query(sql, values);
    return res.rows.map((r) => ({
      ...r,
      task_id: Number(r.task_id),
      category_id: r.category_id ? Number(r.category_id) : null,
      priority_id: Number(r.priority_id),
      status_id: Number(r.status_id),
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));
  }

  // Fallback to local
  let results = [...localTasks];
  if (filter.category_id) results = results.filter((t) => t.category_id === Number(filter.category_id));
  if (filter.priority_id) results = results.filter((t) => t.priority_id === Number(filter.priority_id));
  if (filter.status_id) results = results.filter((t) => t.status_id === Number(filter.status_id));
  if (filter.search && filter.search.trim()) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
    );
  }
  return results.map(attachRelationsLocal).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getTaskById(id: number): Promise<Task | null> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const sql = `
      SELECT 
        t.task_id,
        t.category_id,
        t.priority_id,
        t.status_id,
        t.title,
        t.description,
        t.due_date,
        t.created_at,
        t.updated_at,
        CASE WHEN c.category_id IS NOT NULL THEN
          json_build_object(
            'category_id', c.category_id,
            'category_name', c.category_name,
            'description', c.description
          )
        ELSE NULL END AS category,
        json_build_object(
          'priority_id', p.priority_id,
          'priority_name', p.priority_name,
          'priority_level', p.priority_level
        ) AS priority,
        json_build_object(
          'status_id', s.status_id,
          'status_name', s.status_name
        ) AS status
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.category_id
      INNER JOIN priorities p ON t.priority_id = p.priority_id
      INNER JOIN task_statuses s ON t.status_id = s.status_id
      WHERE t.task_id = $1;
    `;
    const res = await pool.query(sql, [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      ...r,
      task_id: Number(r.task_id),
      category_id: r.category_id ? Number(r.category_id) : null,
      priority_id: Number(r.priority_id),
      status_id: Number(r.status_id),
      due_date: r.due_date ? new Date(r.due_date).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    };
  }

  const found = localTasks.find((t) => t.task_id === id);
  return found ? attachRelationsLocal(found) : null;
}

/**
 * 2. tambahTugasBaru
 * Menambahkan tugas ke tabel tasks dan mencatat log di task_history
 */
export async function createTask(payload: {
  title: string;
  description?: string | null;
  due_date?: string | null;
  category_id?: number | null;
  priority_id: number;
  status_id?: number;
}): Promise<Task> {
  const status_id = payload.status_id || 1;

  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const insertSql = `
      INSERT INTO tasks (title, description, due_date, category_id, priority_id, status_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING task_id;
    `;
    const res = await pool.query(insertSql, [
      payload.title,
      payload.description || null,
      payload.due_date ? new Date(payload.due_date) : null,
      payload.category_id || null,
      payload.priority_id,
      status_id,
    ]);

    const taskId = Number(res.rows[0].task_id);

    // Otomatis catat log di task_history
    await pool.query(
      `INSERT INTO task_history (task_id, old_status_id, new_status_id, notes)
       VALUES ($1, NULL, $2, 'Tugas baru dibuat');`,
      [taskId, status_id]
    );

    const task = await getTaskById(taskId);
    if (task) return task;
  }

  // Fallback
  const now = new Date().toISOString();
  const newTask: Task = {
    task_id: nextTaskId++,
    title: payload.title,
    description: payload.description || null,
    due_date: payload.due_date || null,
    category_id: payload.category_id || null,
    priority_id: payload.priority_id,
    status_id: status_id,
    created_at: now,
    updated_at: now,
  };
  localTasks.unshift(newTask);

  localHistory.unshift({
    history_id: nextHistoryId++,
    task_id: newTask.task_id,
    old_status_id: null,
    new_status_id: status_id,
    changed_at: now,
    notes: 'Tugas baru dibuat',
  });

  return attachRelationsLocal(newTask);
}

/**
 * 3. updateStatusTugas
 * Mengubah status tugas dan mencatat riwayat perubahan ke task_history
 */
export async function updateTaskStatus(
  task_id: number,
  new_status_id: number,
  notes?: string
): Promise<Task | null> {
  const currentTask = await getTaskById(task_id);
  if (!currentTask) return null;

  const old_status_id = currentTask.status_id;

  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    await pool.query(
      `UPDATE tasks SET status_id = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2;`,
      [new_status_id, task_id]
    );

    await pool.query(
      `INSERT INTO task_history (task_id, old_status_id, new_status_id, notes)
       VALUES ($1, $2, $3, $4);`,
      [
        task_id,
        old_status_id,
        new_status_id,
        notes || `Status diubah dari ${currentTask.status?.status_name || old_status_id} ke status #${new_status_id}`,
      ]
    );

    return await getTaskById(task_id);
  }

  // Fallback
  const now = new Date().toISOString();
  const idx = localTasks.findIndex((t) => t.task_id === task_id);
  if (idx === -1) return null;

  localTasks[idx].status_id = new_status_id;
  localTasks[idx].updated_at = now;

  localHistory.unshift({
    history_id: nextHistoryId++,
    task_id,
    old_status_id,
    new_status_id,
    changed_at: now,
    notes: notes || `Status diubah ke status #${new_status_id}`,
  });

  return attachRelationsLocal(localTasks[idx]);
}

/**
 * 4. editDetailTugas
 * Memperbarui data tugas (judul, deskripsi, tenggat waktu, kategori, prioritas, status)
 */
export async function editDetailTugas(
  task_id: number,
  payload: {
    title?: string;
    description?: string | null;
    due_date?: string | null;
    category_id?: number | null;
    priority_id?: number;
    status_id?: number;
    notes?: string;
  }
): Promise<Task | null> {
  const currentTask = await getTaskById(task_id);
  if (!currentTask) return null;

  const statusChanged =
    payload.status_id !== undefined && payload.status_id !== currentTask.status_id;
  const old_status_id = currentTask.status_id;

  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);

    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: any[] = [];
    let paramIndex = 1;

    if (payload.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(payload.title);
    }
    if (payload.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(payload.description);
    }
    if (payload.due_date !== undefined) {
      setClauses.push(`due_date = $${paramIndex++}`);
      values.push(payload.due_date ? new Date(payload.due_date) : null);
    }
    if (payload.category_id !== undefined) {
      setClauses.push(`category_id = $${paramIndex++}`);
      values.push(payload.category_id);
    }
    if (payload.priority_id !== undefined) {
      setClauses.push(`priority_id = $${paramIndex++}`);
      values.push(payload.priority_id);
    }
    if (payload.status_id !== undefined) {
      setClauses.push(`status_id = $${paramIndex++}`);
      values.push(payload.status_id);
    }

    values.push(task_id);
    const sql = `UPDATE tasks SET ${setClauses.join(', ')} WHERE task_id = $${paramIndex};`;
    await pool.query(sql, values);

    if (statusChanged && payload.status_id !== undefined) {
      await pool.query(
        `INSERT INTO task_history (task_id, old_status_id, new_status_id, notes)
         VALUES ($1, $2, $3, $4);`,
        [task_id, old_status_id, payload.status_id, payload.notes || 'Status diperbarui bersamaan dengan detail tugas']
      );
    }

    return await getTaskById(task_id);
  }

  // Fallback
  const now = new Date().toISOString();
  const idx = localTasks.findIndex((t) => t.task_id === task_id);
  if (idx === -1) return null;

  if (payload.title !== undefined) localTasks[idx].title = payload.title;
  if (payload.description !== undefined) localTasks[idx].description = payload.description;
  if (payload.due_date !== undefined) localTasks[idx].due_date = payload.due_date;
  if (payload.category_id !== undefined) localTasks[idx].category_id = payload.category_id;
  if (payload.priority_id !== undefined) localTasks[idx].priority_id = payload.priority_id;
  if (payload.status_id !== undefined) localTasks[idx].status_id = payload.status_id;
  localTasks[idx].updated_at = now;

  if (statusChanged && payload.status_id !== undefined) {
    localHistory.unshift({
      history_id: nextHistoryId++,
      task_id,
      old_status_id,
      new_status_id: payload.status_id,
      changed_at: now,
      notes: payload.notes || 'Status diperbarui saat edit detail tugas',
    });
  }

  return attachRelationsLocal(localTasks[idx]);
}

/**
 * 5. hapusTugas
 * Menghapus tugas dari database (dan otomatis cascade riwayat)
 */
export async function deleteTask(task_id: number): Promise<boolean> {
  const currentTask = await getTaskById(task_id);
  if (!currentTask) return false;

  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    // ON DELETE CASCADE on task_history ensures logs are cleaned up
    const res = await pool.query('DELETE FROM tasks WHERE task_id = $1;', [task_id]);
    return (res.rowCount ?? 0) > 0;
  }

  localTasks = localTasks.filter((t) => t.task_id !== task_id);
  localHistory = localHistory.filter((h) => h.task_id !== task_id);
  return true;
}

/**
 * Mengambil log riwayat perubahan status tugas dari tabel task_history
 */
export async function getTaskHistory(task_id: number): Promise<TaskHistory[]> {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const sql = `
      SELECT 
        h.history_id,
        h.task_id,
        h.old_status_id,
        h.new_status_id,
        h.changed_at,
        h.notes,
        CASE WHEN os.status_id IS NOT NULL THEN
          json_build_object('status_id', os.status_id, 'status_name', os.status_name)
        ELSE NULL END AS old_status,
        CASE WHEN ns.status_id IS NOT NULL THEN
          json_build_object('status_id', ns.status_id, 'status_name', ns.status_name)
        ELSE NULL END AS new_status
      FROM task_history h
      LEFT JOIN task_statuses os ON h.old_status_id = os.status_id
      LEFT JOIN task_statuses ns ON h.new_status_id = ns.status_id
      WHERE h.task_id = $1
      ORDER BY h.changed_at DESC;
    `;
    const res = await pool.query(sql, [task_id]);
    return res.rows.map((r) => ({
      history_id: Number(r.history_id),
      task_id: Number(r.task_id),
      old_status_id: r.old_status_id ? Number(r.old_status_id) : null,
      new_status_id: r.new_status_id ? Number(r.new_status_id) : null,
      changed_at: new Date(r.changed_at).toISOString(),
      notes: r.notes,
      old_status: r.old_status,
      new_status: r.new_status,
    }));
  }

  return localHistory
    .filter((h) => h.task_id === task_id)
    .map((h) => ({
      ...h,
      old_status: localStatuses.find((s) => s.status_id === h.old_status_id) || null,
      new_status: localStatuses.find((s) => s.status_id === h.new_status_id) || null,
    }))
    .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
}

/**
 * Menghitung ringkasan statistik tugas
 */
export async function getTaskStats() {
  const pool = getPgPool();
  if (pool) {
    await ensureTablesExist(pool);
    const sql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status_id = 1 THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status_id = 2 THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status_id = 3 THEN 1 END)::int AS completed
      FROM tasks;
    `;
    const res = await pool.query(sql);
    const r = res.rows[0];
    return {
      total: Number(r.total || 0),
      pending: Number(r.pending || 0),
      inProgress: Number(r.in_progress || 0),
      completed: Number(r.completed || 0),
    };
  }

  const tasks = await getTasks();
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status_id === 1).length,
    inProgress: tasks.filter((t) => t.status_id === 2).length,
    completed: tasks.filter((t) => t.status_id === 3).length,
  };
}
