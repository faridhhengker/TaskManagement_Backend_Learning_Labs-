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

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

export interface DatabaseStatus {
  engine: string;
  isSupabaseConfigured: boolean;
  supabaseUrl?: string | null;
  host?: string;
  port?: string;
  database?: string;
  note: string;
}
