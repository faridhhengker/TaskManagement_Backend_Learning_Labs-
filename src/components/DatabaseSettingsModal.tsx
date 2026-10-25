import React, { useState } from 'react';
import { DatabaseStatus } from '../types.js';
import { X, Database, Check, Copy, Server, ExternalLink, ShieldCheck } from 'lucide-react';

interface DatabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DatabaseStatus | null;
  onRefresh: () => void;
}

export const DatabaseSettingsModal: React.FC<DatabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'sql' | 'vercel'>('status');

  if (!isOpen) return null;

  const sqlCode = `-- Skema Database TaskFlow (Supabase / PostgreSQL)
-- 5 Tabel Relasional: categories, priorities, task_statuses, tasks, task_history

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

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public priorities" ON priorities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public task_statuses" ON task_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public task_history" ON task_history FOR ALL USING (true) WITH CHECK (true);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Konfigurasi Database & Supabase
              </h2>
              <p className="text-xs text-neutral-500">
                Status penyimpanan relasional PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'status'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Status Koneksi
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'vercel'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Panduan Vercel Env
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Skema SQL Supabase
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Penyimpanan Aktif:</span>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                    {status?.engine?.includes('pooler') ? 'Supabase Transaction Pooler' : status?.engine === 'supabase_rest_api' ? 'Supabase REST API' : 'Local Fallback Engine'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Status Koneksi Supabase:</span>
                  <span className="text-xs font-medium">
                    {status?.isSupabaseConfigured ? (
                      <span className="text-emerald-600 dark:text-emerald-400">Terhubung Langsung (Port 6543)</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Menunggu Kredensial</span>
                    )}
                  </span>
                </div>
                {status?.host && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Pooler Host:</span>
                    <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300">
                      {status.host}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {status?.note}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  <ShieldCheck className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                  Struktur 5 Tabel Relasional Terverifikasi di PostgreSQL:
                </div>
                <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 list-disc pl-5">
                  <li><strong className="text-neutral-800 dark:text-neutral-200">categories</strong> (category_id, category_name, description)</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">priorities</strong> (priority_id, priority_name, priority_level 1-5)</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">task_statuses</strong> (status_id, status_name)</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">tasks</strong> (task_id, category_id FK, priority_id FK, status_id FK, title, description, due_date)</li>
                  <li><strong className="text-neutral-800 dark:text-neutral-200">task_history</strong> (history_id, task_id FK, old_status_id FK, new_status_id FK, changed_at, notes)</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Sistem ini dioptimasi khusus untuk <strong>Supabase Transaction Pooler (Port 6543)</strong>. Anda cukup menyetel <strong>SUPABASE_URL</strong> atau <strong>TRANSACTION_POOLER</strong> di dashboard Vercel.
              </p>
              <div className="space-y-2">
                <div className="p-3 bg-neutral-900 text-neutral-100 rounded-lg font-mono text-xs overflow-x-auto">
                  <div>SUPABASE_URL = "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"</div>
                  <div className="text-neutral-400 mt-1"># atau</div>
                  <div>TRANSACTION_POOLER = "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"</div>
                </div>
              </div>
              <div className="space-y-1.5 text-neutral-600 dark:text-neutral-400">
                <p><strong>Cara Ambil URL di Supabase:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Buka Dashboard Supabase -&gt; pilih project Anda.</li>
                  <li>Klik <strong>Project Settings</strong> (ikon gerigi) -&gt; <strong>Database</strong>.</li>
                  <li>Scroll ke bagian <strong>Connection string</strong> -&gt; pilih tab <strong>URI</strong>.</li>
                  <li>Pilih Mode <strong>Transaction (port 6543)</strong>.</li>
                  <li>Salin dan pasang ke Environment Variables Vercel sebagai <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">SUPABASE_URL</code> atau <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded">TRANSACTION_POOLER</code>.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-neutral-500">Live Production Endpoint:</div>
                <div className="font-mono text-xs text-neutral-800 dark:text-neutral-200 mt-0.5">
                  https://task-management-one-navy.vercel.app/api
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Salin dan jalankan di SQL Editor dashboard Supabase:
                </span>
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin!' : 'Salin SQL'}
                </button>
              </div>
              <pre className="p-3 bg-neutral-950 text-neutral-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-72">
                {sqlCode}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Periksa Ulang Status
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
