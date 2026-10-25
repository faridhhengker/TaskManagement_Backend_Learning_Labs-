import React, { useState, useEffect, useMemo } from 'react';
import {
  fetchTasks,
  fetchCategories,
  fetchPriorities,
  fetchStatuses,
  fetchStats,
  fetchHealth,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  fetchTaskHistory,
  createCategory,
} from './services/api.js';
import { Task, Category, Priority, TaskStatus, TaskHistory, TaskStats, DatabaseStatus } from './types.js';
import { TaskModal } from './components/TaskModal.js';
import { TaskHistoryModal } from './components/TaskHistoryModal.js';
import { CategoryModal } from './components/CategoryModal.js';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal.js';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  History,
  Calendar,
  FolderPlus,
  RefreshCw,
  Database,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  X,
} from 'lucide-react';

export default function App() {
  // Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [stats, setStats] = useState<TaskStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  // UI / Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [selectedPriorityId, setSelectedPriorityId] = useState<number | 'all'>('all');
  const [selectedStatusId, setSelectedStatusId] = useState<number | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed' | 'categories'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [taskHistoryLogs, setTaskHistoryLogs] = useState<TaskHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Initial Load
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [cats, prios, statsList, healthData, statsData] = await Promise.all([
        fetchCategories(),
        fetchPriorities(),
        fetchStatuses(),
        fetchHealth().catch(() => null),
        fetchStats().catch(() => ({ total: 0, pending: 0, inProgress: 0, completed: 0 })),
      ]);

      setCategories(cats);
      setPriorities(prios);
      setStatuses(statsList);
      if (healthData) setDbStatus(healthData.database);
      setStats(statsData);

      // Load tasks
      await refreshTasks();
    } catch (err: any) {
      console.error('Gagal memuat data awal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch tasks with current filters
  const refreshTasks = async () => {
    try {
      let statusFilter: number | undefined;
      if (activeTab === 'in_progress') statusFilter = 2;
      else if (activeTab === 'completed') statusFilter = 3;
      else if (selectedStatusId !== 'all') statusFilter = selectedStatusId;

      const data = await fetchTasks({
        category_id: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
        priority_id: selectedPriorityId === 'all' ? undefined : selectedPriorityId,
        status_id: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setTasks(data);

      // Update statistics
      const updatedStats = await fetchStats().catch(() => null);
      if (updatedStats) setStats(updatedStats);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [selectedCategoryId, selectedPriorityId, selectedStatusId, searchQuery, activeTab]);

  // Handler: Tambah Tugas Baru / Edit Detail Tugas
  const handleTaskSubmit = async (formData: {
    title: string;
    description?: string;
    due_date?: string | null;
    category_id?: number | null;
    priority_id: number;
    status_id?: number;
    notes?: string;
  }) => {
    if (taskToEdit) {
      // 4. editDetailTugas
      await updateTask(taskToEdit.task_id, formData);
      showToast('Detail tugas berhasil diperbarui');
    } else {
      // 2. tambahTugasBaru
      await createTask(formData);
      showToast('Tugas baru berhasil ditambahkan');
    }
    await refreshTasks();
  };

  // Handler: 3. updateStatusTugas
  const handleStatusChange = async (task: Task, newStatusId: number) => {
    try {
      await updateTaskStatus(task.task_id, newStatusId);
      const newStatusObj = statuses.find((s) => s.status_id === newStatusId);
      showToast(`Status tugas diubah ke "${newStatusObj?.status_name || newStatusId}"`);
      await refreshTasks();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status tugas');
    }
  };

  // Handler: 5. hapusTugas
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete.task_id);
      showToast(`Tugas #${taskToDelete.task_id} berhasil dihapus`);
      setTaskToDelete(null);
      await refreshTasks();
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus tugas');
    }
  };

  // Handler: Buka Riwayat Perubahan Tugas
  const handleOpenHistory = async (task: Task) => {
    setSelectedTaskForHistory(task);
    setIsHistoryModalOpen(true);
    setIsHistoryLoading(true);
    try {
      const logs = await fetchTaskHistory(task.task_id);
      setTaskHistoryLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Handler: Tambah Kategori
  const handleCreateCategory = async (name: string, description?: string) => {
    const newCat = await createCategory(name, description);
    setCategories((prev) => [...prev, newCat]);
    showToast(`Kategori "${newCat.category_name}" berhasil dibuat`);
  };

  const priorityColor = (level: number) => {
    switch (level) {
      case 5:
        return 'text-red-700 dark:text-red-400 font-semibold';
      case 4:
        return 'text-amber-700 dark:text-amber-400 font-medium';
      case 3:
        return 'text-blue-700 dark:text-blue-400 font-medium';
      case 2:
        return 'text-neutral-700 dark:text-neutral-300';
      default:
        return 'text-neutral-500';
    }
  };

  const statusDisplay = (statusId: number) => {
    switch (statusId) {
      case 3:
        return { label: 'Selesai', color: 'text-emerald-700 dark:text-emerald-400' };
      case 2:
        return { label: 'Sedang Dikerjakan', color: 'text-amber-700 dark:text-amber-400' };
      default:
        return { label: 'Belum Selesai', color: 'text-neutral-600 dark:text-neutral-400' };
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR CONTRACT: Zone 1 (Wordmark) — Zone 2 (Nav Links) — Zone 3 (1 Primary Action) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
              TaskFlow
            </span>
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Informasi database Supabase & API"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {dbStatus?.isSupabaseConfigured ? 'Supabase PostgreSQL' : 'Database Ready'}
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
            <button
              onClick={() => setActiveTab('all')}
              className={`hover:text-neutral-900 dark:hover:text-white transition-colors whitespace-nowrap ${
                activeTab === 'all' ? 'text-neutral-900 dark:text-white font-semibold underline underline-offset-8' : ''
              }`}
            >
              Semua Tugas
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`hover:text-neutral-900 dark:hover:text-white transition-colors whitespace-nowrap ${
                activeTab === 'in_progress' ? 'text-neutral-900 dark:text-white font-semibold underline underline-offset-8' : ''
              }`}
            >
              Sedang Dikerjakan
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`hover:text-neutral-900 dark:hover:text-white transition-colors whitespace-nowrap ${
                activeTab === 'completed' ? 'text-neutral-900 dark:text-white font-semibold underline underline-offset-8' : ''
              }`}
            >
              Selesai
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`hover:text-neutral-900 dark:hover:text-white transition-colors whitespace-nowrap ${
                activeTab === 'categories' ? 'text-neutral-900 dark:text-white font-semibold underline underline-offset-8' : ''
              }`}
            >
              Kelola Kategori
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsTaskModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Metric Strip (Tabular Figures) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-neutral-500">Total Tugas</span>
            <div className="text-2xl font-semibold mt-1 font-mono tabular-nums">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-neutral-500">Belum Selesai</span>
            <div className="text-2xl font-semibold mt-1 font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
              {stats.pending}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-neutral-500">Sedang Dikerjakan</span>
            <div className="text-2xl font-semibold mt-1 font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {stats.inProgress}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <span className="text-xs text-neutral-500">Selesai</span>
            <div className="text-2xl font-semibold mt-1 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {stats.completed}
            </div>
          </div>
        </section>

        {activeTab === 'categories' ? (
          /* Categories View */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Daftar Kategori Tugas
                </h1>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Tabel master kategori relasional (tabel <code className="font-mono text-xs">categories</code>)
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.category_id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                    <span className="font-mono tabular-nums">ID #{cat.category_id}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                    {cat.category_name}
                  </h3>
                  <p className="text-xs text-neutral-500 mb-4 min-h-8">
                    {cat.description || 'Tidak ada keterangan tambahan.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedCategoryId(cat.category_id);
                      setActiveTab('all');
                    }}
                    className="text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:underline"
                  >
                    Lihat tugas dalam kategori ini &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tasks View */
          <div className="space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari tugas berdasarkan judul atau isi deskripsi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                {/* Category Filter */}
                <select
                  value={selectedCategoryId}
                  onChange={(e) =>
                    setSelectedCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>

                {/* Priority Filter */}
                <select
                  value={selectedPriorityId}
                  onChange={(e) =>
                    setSelectedPriorityId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                >
                  <option value="all">Semua Prioritas</option>
                  {priorities.map((p) => (
                    <option key={p.priority_id} value={p.priority_id}>
                      Level {p.priority_level} - {p.priority_name}
                    </option>
                  ))}
                </select>

                {/* Status Filter (when on All tab) */}
                {activeTab === 'all' && (
                  <select
                    value={selectedStatusId}
                    onChange={(e) =>
                      setSelectedStatusId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none"
                  >
                    <option value="all">Semua Status</option>
                    {statuses.map((s) => (
                      <option key={s.status_id} value={s.status_id}>
                        {s.status_name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={refreshTasks}
                  title="Segarkan daftar tugas"
                  className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Task List / Data Grid */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              {isLoading ? (
                <div className="py-16 text-center text-xs text-neutral-500">
                  Memuat data tugas dari database...
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    Tidak ada tugas yang cocok dengan filter saat ini.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Silakan ubah kata kunci pencarian atau buat tugas baru.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId('all');
                      setSelectedPriorityId('all');
                      setSelectedStatusId('all');
                      setActiveTab('all');
                    }}
                    className="mt-4 px-3.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {tasks.map((task) => {
                    const statusInfo = statusDisplay(task.status_id);
                    const formattedDue = task.due_date
                      ? new Date(task.due_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : null;

                    return (
                      <div
                        key={task.task_id}
                        className="p-5 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Task Primary Information & Unboxed Metadata */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-neutral-400 tabular-nums">
                              #{task.task_id}
                            </span>
                            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {task.title}
                            </h3>
                          </div>

                          {task.description && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          {/* Zero-Pill Metadata Discipline: Clean unboxed metadata with separators */}
                          <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap pt-0.5">
                            <span>{task.category?.category_name || 'Tanpa Kategori'}</span>
                            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className={priorityColor(task.priority?.priority_level || 1)}>
                              Prioritas: {task.priority?.priority_name || 'Normal'}
                            </span>
                            {formattedDue && (
                              <>
                                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                                <span className="font-mono tabular-nums flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-neutral-400 inline" />
                                  Tenggat: {formattedDue}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Interactive Status & Action Buttons */}
                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          {/* Inline Status Selector */}
                          <div className="relative">
                            <select
                              value={task.status_id}
                              onChange={(e) => handleStatusChange(task, Number(e.target.value))}
                              className="text-xs font-medium py-1.5 pl-3 pr-7 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none cursor-pointer appearance-none"
                            >
                              {statuses.map((s) => (
                                <option key={s.status_id} value={s.status_id}>
                                  {s.status_name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* View History Button */}
                          <button
                            onClick={() => handleOpenHistory(task)}
                            title="Lihat riwayat perubahan status"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit Task Button */}
                          <button
                            onClick={() => {
                              setTaskToEdit(task);
                              setIsTaskModalOpen(true);
                            }}
                            title="Edit detail tugas"
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Task Button */}
                          <button
                            onClick={() => setTaskToDelete(task)}
                            title="Hapus tugas"
                            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            <span>TaskFlow &middot; Tugas Akhir Learning Labs Backend Development</span>
          </div>
          <div>
            <span>Faridh Adzan Al Arsy (NIM: 21114012610046)</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Task Create / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        taskToEdit={taskToEdit}
        categories={categories}
        priorities={priorities}
        statuses={statuses}
      />

      {/* Task History Modal */}
      <TaskHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        task={selectedTaskForHistory}
        history={taskHistoryLogs}
        isLoading={isHistoryLoading}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleCreateCategory}
      />

      {/* Database Connection Modal */}
      <DatabaseSettingsModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        status={dbStatus}
        onRefresh={loadInitialData}
      />

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Konfirmasi Penghapusan
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Apakah Anda yakin ingin menghapus tugas <strong>"{taskToDelete.title}"</strong>?
              Riwayat log terkait di database juga akan dihapus.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
