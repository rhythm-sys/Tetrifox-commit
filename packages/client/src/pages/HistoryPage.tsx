import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ department: '', status: '' });

  const params: Record<string, string> = { page: String(page), pageSize: '20' };
  if (filters.department) params.department = filters.department;
  if (filters.status) params.status = filters.status;

  const { data, isLoading, error } = useQuery({
    queryKey: ['history', page, filters],
    queryFn: () => api.getRoutingHistory(params),
  });

  const departmentColors: Record<string, string> = {
    Mail: 'bg-blue-100 text-blue-700',
    Regular: 'bg-green-100 text-green-700',
    Heavy: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Routing History</h2>
        <p className="text-gray-600 mt-1">View all routed parcels</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.department}
          onChange={(e) => { setFilters({ ...filters, department: e.target.value }); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          <option value="Mail">Mail</option>
          <option value="Regular">Regular</option>
          <option value="Heavy">Heavy</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error instanceof Error ? error.message : 'Failed to load history'}
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Parcel ID</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Weight</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Value</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Destination</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{entry.parcelId}</td>
                      <td className="px-4 py-3">{entry.weight} kg</td>
                      <td className="px-4 py-3">{entry.value.toLocaleString('en', { style: 'currency', currency: 'EUR' })}</td>
                      <td className="px-4 py-3">{entry.destination.city}, {entry.destination.country}</td>
                      <td className="px-4 py-3">
                        {entry.department && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${departmentColors[entry.department] || 'bg-gray-100 text-gray-700'}`}>
                            {entry.department}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${entry.status === 'completed' ? 'text-green-600' : entry.status === 'pending_approval' ? 'text-amber-600' : 'text-red-600'}`}>
                          {entry.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No routing records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {data.pagination.totalCount} total records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
