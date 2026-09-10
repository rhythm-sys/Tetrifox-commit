import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { BatchJob } from '../../api/client';

interface Props {
  job: BatchJob;
}

export function BatchResults({ job }: Props) {
  const progress = job.totalCount > 0 ? Math.round((job.processed / job.totalCount) * 100) : 0;
  const isProcessing = job.status === 'processing';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Batch Results</h3>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{job.processed} / {job.totalCount} processed</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              job.status === 'failed' ? 'bg-red-500' : 'bg-primary-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle size={18} className="text-green-500" />}
          label="Success"
          value={job.successCount}
        />
        <StatCard
          icon={<XCircle size={18} className="text-red-500" />}
          label="Errors"
          value={job.errorCount}
        />
        <StatCard
          icon={<Clock size={18} className="text-gray-400" />}
          label="Total"
          value={job.totalCount}
        />
      </div>

      {/* Error Details */}
      {job.errors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <AlertTriangle size={14} className="text-red-500" />
            Errors ({job.errors.length})
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {job.errors.slice(0, 20).map((err) => (
              <div key={err.index} className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded">
                Row {err.index + 1}: {err.error}
              </div>
            ))}
            {job.errors.length > 20 && (
              <p className="text-xs text-gray-500">... and {job.errors.length - 20} more errors</p>
            )}
          </div>
        </div>
      )}

      {isProcessing && (
        <p className="text-sm text-gray-500 animate-pulse">Processing parcels...</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
