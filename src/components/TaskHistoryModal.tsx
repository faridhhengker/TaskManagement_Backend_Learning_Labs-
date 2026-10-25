import React from 'react';
import { Task, TaskHistory } from '../types.js';
import { X, Clock, ArrowRight, FileText } from 'lucide-react';

interface TaskHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  history: TaskHistory[];
  isLoading: boolean;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  isOpen,
  onClose,
  task,
  history,
  isLoading,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              Riwayat Perubahan Status
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-md">
              Tugas #{task.task_id}: {task.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Memuat data riwayat...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Belum ada rekaman riwayat untuk tugas ini.
            </div>
          ) : (
            <div className="relative border-l border-neutral-200 dark:border-neutral-800 ml-3 space-y-6">
              {history.map((item) => {
                const dateStr = new Date(item.changed_at).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={item.history_id} className="relative pl-6">
                    {/* Timeline bullet */}
                    <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-neutral-900 dark:bg-neutral-100 ring-4 ring-white dark:ring-neutral-900" />

                    <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                        <span className="font-mono tabular-nums">{dateStr}</span>
                        <span className="font-mono text-[11px] text-neutral-400">
                          ID: #{item.history_id}
                        </span>
                      </div>

                      {/* Status Transition */}
                      <div className="flex items-center gap-2 text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-1.5">
                        {item.old_status ? (
                          <>
                            <span className="text-neutral-500">{item.old_status.status_name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                          </>
                        ) : (
                          <span className="text-neutral-400 italic">Dibuat:</span>
                        )}
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.new_status ? item.new_status.status_name : `Status #${item.new_status_id}`}
                        </span>
                      </div>

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60 mt-1.5">
                          <FileText className="w-3 h-3 text-neutral-400 shrink-0 mt-0.5" />
                          <span>{item.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 flex justify-end shrink-0">
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
