import { useQuery } from '@tanstack/react-query';
import { Package, AlertTriangle, Activity, Clock } from 'lucide-react';
import { api } from '../api/client';

export function DashboardPage() {
  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: api.getMetrics,
    refetchInterval: 10_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['recent'],
    queryFn: api.getRecentActivity,
    refetchInterval: 10_000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30_000,
  });

  const m = metrics?.data;

  const departmentColors: Record<string, string> = {
    Mail: 'bg-blue-500',
    Regular: 'bg-green-500',
    Heavy: 'bg-orange-500',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600 mt-1">System overview and routing metrics</p>
        </div>
        {health && (
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            health.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
            {health.status}
          </span>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package size={20} className="text-primary-500" />}
          label="Total Processed"
          value={m?.totalProcessed ?? 0}
        />
        <StatCard
          icon={<Clock size={20} className="text-gray-400" />}
          label="Avg Latency"
          value={`${m?.avgLatencyMs?.toFixed(1) ?? 0}ms`}
        />
        <StatCard
          icon={<Activity size={20} className="text-green-500" />}
          label="P95 Latency"
          value={`${m?.p95LatencyMs?.toFixed(1) ?? 0}ms`}
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-amber-500" />}
          label="Error Rate"
          value={`${((m?.errorRate ?? 0) * 100).toFixed(2)}%`}
        />
      </div>

      {/* Route Distribution */}
      {m && Object.keys(m.routeCounts).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Route Distribution</h3>
          <div className="space-y-3">
            {Object.entries(m.routeCounts).map(([dept, count]) => {
              const total = m.totalProcessed || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={dept}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{dept}</span>
                    <span className="text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${departmentColors[dept] || 'bg-gray-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {m && m.anomalies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
            <AlertTriangle size={16} />
            Active Anomalies
          </h3>
          <div className="space-y-2">
            {m.anomalies.map((a, i) => (
              <div key={i} className="text-sm text-amber-700">
                <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                  a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {a.severity}
                </span>
                {a.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recent && recent.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {recent.data.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    entry.department ? (
                      entry.department === 'Mail' ? 'bg-blue-100 text-blue-700' :
                      entry.department === 'Regular' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    ) : 'bg-gray-100 text-gray-700'
                  }`}>
                    {entry.department || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-700">{entry.weight}kg, {entry.destination.country}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uptime */}
      {m && (
        <p className="text-xs text-gray-400 text-right">
          Uptime: {formatUptime(m.uptimeSeconds)}
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}
