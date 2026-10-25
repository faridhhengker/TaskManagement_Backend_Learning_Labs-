import express, { Request, Response, NextFunction } from 'express';
import {
  getCategories,
  createCategory,
  getPriorities,
  getStatuses,
  getTasks,
  getTaskById,
  createTask,
  updateTaskStatus,
  editDetailTugas,
  deleteTask,
  getTaskHistory,
  getTaskStats,
  getDatabaseStatus,
} from './db.js';

export const app = express();

// Middleware: JSON Body Parser & CORS
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// --------------------------------------------------------------------------
// 0. HEALTH CHECK & DATABASE STATUS
// --------------------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getTaskStats();
    res.status(200).json({
      message: 'Statistik tugas berhasil diambil',
      data: stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil statistik tugas', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// 1. GET DAFTAR TUGAS & 6. CARI TUGAS BY KATEGORI
// GET /api/tasks
// Query Params: category_id, priority_id, status_id, search
// --------------------------------------------------------------------------
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const category_id = req.query.category_id ? Number(req.query.category_id) : undefined;
    const priority_id = req.query.priority_id ? Number(req.query.priority_id) : undefined;
    const status_id = req.query.status_id ? Number(req.query.status_id) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const tasks = await getTasks({ category_id, priority_id, status_id, search });
    res.status(200).json({
      message: 'Daftar tugas berhasil diambil',
      count: tasks.length,
      data: tasks,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil daftar tugas', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// DETAIL TUGAS & RIWAYAT PERUBAHAN
// GET /api/tasks/:id
// GET /api/tasks/:id/history
// --------------------------------------------------------------------------
app.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID tugas harus berupa angka yang valid' });
      return;
    }

    const task = await getTaskById(id);
    if (!task) {
      res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
      return;
    }

    res.status(200).json({
      message: 'Detail tugas berhasil ditemukan',
      data: task,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil detail tugas', details: err?.message });
  }
});

app.get('/api/tasks/:id/history', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID tugas harus berupa angka yang valid' });
      return;
    }

    const task = await getTaskById(id);
    if (!task) {
      res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
      return;
    }

    const history = await getTaskHistory(id);
    res.status(200).json({
      message: 'Riwayat perubahan tugas berhasil diambil',
      task_id: id,
      count: history.length,
      data: history,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil riwayat tugas', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// 2. TAMBAH TUGAS BARU
// POST /api/tasks
// Body: { title, description?, due_date?, category_id?, priority_id, status_id? }
// --------------------------------------------------------------------------
app.post('/api/tasks', async (req: Request, res: Response) => {
  try {
    const { title, description, due_date, category_id, priority_id, status_id } = req.body;

    // Validasi input
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Field title wajib diisi dan berupa teks' });
      return;
    }
    if (title.trim().length > 200) {
      res.status(400).json({ error: 'Field title maksimal 200 karakter' });
      return;
    }
    if (priority_id === undefined || priority_id === null || isNaN(Number(priority_id))) {
      res.status(400).json({ error: 'Field priority_id wajib diisi berupa angka (1-5)' });
      return;
    }

    const created = await createTask({
      title: title.trim(),
      description: description ? String(description).trim() : null,
      due_date: due_date || null,
      category_id: category_id ? Number(category_id) : null,
      priority_id: Number(priority_id),
      status_id: status_id ? Number(status_id) : 1,
    });

    res.status(201).json({
      message: 'Tugas baru berhasil ditambahkan',
      data: created,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan tugas baru', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// 3. UPDATE STATUS TUGAS
// PATCH /api/tasks/:id/status
// Body: { status_id, notes? }
// --------------------------------------------------------------------------
app.patch('/api/tasks/:id/status', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID tugas harus berupa angka yang valid' });
      return;
    }

    const { status_id, notes } = req.body;
    if (status_id === undefined || status_id === null || isNaN(Number(status_id))) {
      res.status(400).json({ error: 'Field status_id wajib diisi berupa angka (1-3)' });
      return;
    }

    const updated = await updateTaskStatus(id, Number(status_id), notes);
    if (!updated) {
      res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
      return;
    }

    res.status(200).json({
      message: 'Status tugas berhasil diperbarui dan dicatat ke riwayat',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui status tugas', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// 4. EDIT DETAIL TUGAS
// PUT /api/tasks/:id & PATCH /api/tasks/:id
// Body: { title?, description?, due_date?, category_id?, priority_id?, status_id?, notes? }
// --------------------------------------------------------------------------
const handleEditTask = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID tugas harus berupa angka yang valid' });
      return;
    }

    const { title, description, due_date, category_id, priority_id, status_id, notes } = req.body;

    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      res.status(400).json({ error: 'Field title tidak boleh kosong' });
      return;
    }

    const updated = await editDetailTugas(id, {
      title: title ? title.trim() : undefined,
      description: description !== undefined ? description : undefined,
      due_date: due_date !== undefined ? due_date : undefined,
      category_id: category_id !== undefined ? (category_id ? Number(category_id) : null) : undefined,
      priority_id: priority_id !== undefined ? Number(priority_id) : undefined,
      status_id: status_id !== undefined ? Number(status_id) : undefined,
      notes,
    });

    if (!updated) {
      res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
      return;
    }

    res.status(200).json({
      message: 'Detail tugas berhasil diperbarui',
      data: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memperbarui detail tugas', details: err?.message });
  }
};

app.put('/api/tasks/:id', handleEditTask);
app.patch('/api/tasks/:id', handleEditTask);

// --------------------------------------------------------------------------
// 5. HAPUS TUGAS
// DELETE /api/tasks/:id
// --------------------------------------------------------------------------
app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID tugas harus berupa angka yang valid' });
      return;
    }

    const success = await deleteTask(id);
    if (!success) {
      res.status(404).json({ error: `Tugas dengan ID ${id} tidak ditemukan` });
      return;
    }

    res.status(200).json({
      message: `Tugas dengan ID ${id} berhasil dihapus beserta log riwayatnya`,
      data: { deleted_id: id },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menghapus tugas', details: err?.message });
  }
});

// --------------------------------------------------------------------------
// MASTER DATA: CATEGORIES, PRIORITIES, STATUSES
// --------------------------------------------------------------------------
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await getCategories();
    res.status(200).json({
      message: 'Daftar kategori berhasil diambil',
      count: categories.length,
      data: categories,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil kategori', details: err?.message });
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name || typeof category_name !== 'string' || !category_name.trim()) {
      res.status(400).json({ error: 'Field category_name wajib diisi' });
      return;
    }

    const created = await createCategory(category_name.trim(), description);
    res.status(201).json({
      message: 'Kategori baru berhasil ditambahkan',
      data: created,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menambahkan kategori', details: err?.message });
  }
});

app.get('/api/categories/:id/tasks', async (req: Request, res: Response) => {
  try {
    const category_id = Number(req.params.id);
    if (isNaN(category_id)) {
      res.status(400).json({ error: 'ID kategori harus berupa angka yang valid' });
      return;
    }
    const tasks = await getTasks({ category_id });
    res.status(200).json({
      message: `Daftar tugas untuk kategori ID ${category_id} berhasil diambil`,
      category_id,
      count: tasks.length,
      data: tasks,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil tugas per kategori', details: err?.message });
  }
});

app.get('/api/priorities', async (req: Request, res: Response) => {
  try {
    const priorities = await getPriorities();
    res.status(200).json({
      message: 'Daftar prioritas berhasil diambil',
      count: priorities.length,
      data: priorities,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil prioritas', details: err?.message });
  }
});

app.get('/api/statuses', async (req: Request, res: Response) => {
  try {
    const statuses = await getStatuses();
    res.status(200).json({
      message: 'Daftar status tugas berhasil diambil',
      count: statuses.length,
      data: statuses,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mengambil status tugas', details: err?.message });
  }
});
