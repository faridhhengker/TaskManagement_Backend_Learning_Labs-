import { Task, Category, Priority, TaskStatus, TaskHistory, TaskStats, DatabaseStatus } from '../types.js';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; database: DatabaseStatus }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Gagal memeriksa status koneksi backend');
  return res.json();
}

export async function fetchStats(): Promise<TaskStats> {
  const res = await fetch(`${BASE_URL}/stats`);
  if (!res.ok) throw new Error('Gagal mengambil statistik');
  const body = await res.json();
  return body.data;
}

export async function fetchTasks(params?: {
  category_id?: number;
  priority_id?: number;
  status_id?: number;
  search?: string;
}): Promise<Task[]> {
  const query = new URLSearchParams();
  if (params?.category_id) query.append('category_id', String(params.category_id));
  if (params?.priority_id) query.append('priority_id', String(params.priority_id));
  if (params?.status_id) query.append('status_id', String(params.status_id));
  if (params?.search) query.append('search', params.search);

  const url = `${BASE_URL}/tasks${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal mengambil daftar tugas');
  }
  const body = await res.json();
  return body.data;
}

export async function fetchTaskById(id: number): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Tugas tidak ditemukan');
  }
  const body = await res.json();
  return body.data;
}

export async function createTask(payload: {
  title: string;
  description?: string;
  due_date?: string | null;
  category_id?: number | null;
  priority_id: number;
  status_id?: number;
}): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal menambahkan tugas baru');
  }
  const body = await res.json();
  return body.data;
}

export async function updateTaskStatus(
  id: number,
  status_id: number,
  notes?: string
): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status_id, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal mengubah status tugas');
  }
  const body = await res.json();
  return body.data;
}

export async function updateTask(
  id: number,
  payload: {
    title?: string;
    description?: string;
    due_date?: string | null;
    category_id?: number | null;
    priority_id?: number;
    status_id?: number;
    notes?: string;
  }
): Promise<Task> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal memperbarui detail tugas');
  }
  const body = await res.json();
  return body.data;
}

export async function deleteTask(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal menghapus tugas');
  }
}

export async function fetchTaskHistory(taskId: number): Promise<TaskHistory[]> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/history`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal mengambil riwayat tugas');
  }
  const body = await res.json();
  return body.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE_URL}/categories`);
  if (!res.ok) throw new Error('Gagal mengambil kategori');
  const body = await res.json();
  return body.data;
}

export async function createCategory(name: string, description?: string): Promise<Category> {
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category_name: name, description }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Gagal membuat kategori');
  }
  const body = await res.json();
  return body.data;
}

export async function fetchPriorities(): Promise<Priority[]> {
  const res = await fetch(`${BASE_URL}/priorities`);
  if (!res.ok) throw new Error('Gagal mengambil tingkat prioritas');
  const body = await res.json();
  return body.data;
}

export async function fetchStatuses(): Promise<TaskStatus[]> {
  const res = await fetch(`${BASE_URL}/statuses`);
  if (!res.ok) throw new Error('Gagal mengambil daftar status');
  const body = await res.json();
  return body.data;
}
