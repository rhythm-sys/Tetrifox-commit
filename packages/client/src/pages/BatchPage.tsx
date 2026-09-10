import { useState, useEffect, useCallback } from 'react';
import { BatchUpload } from '../components/batch/BatchUpload';
import { BatchResults } from '../components/batch/BatchResults';
import { api, type BatchJob } from '../api/client';

export function BatchPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const res = await api.getBatchStatus(jobId);
      setJob(res.data);
      if (res.data.status === 'processing') {
        setTimeout(() => pollStatus(jobId), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch batch status');
    }
  }, []);

  async function handleUpload(file: File) {
    setIsUploading(true);
    setError(null);
    setJob(null);

    try {
      const res = await api.uploadBatch(file);
      pollStatus(res.data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Batch Upload</h2>
        <p className="text-gray-600 mt-1">Upload a JSON file to route multiple parcels at once</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <BatchUpload onUpload={handleUpload} isLoading={isUploading} />
      </div>

      {/* Sample format */}
      <details className="bg-white border border-gray-200 rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
          Expected JSON format
        </summary>
        <pre className="px-4 pb-4 text-xs text-gray-600 overflow-x-auto">
{`[
  {
    "weight": 2.5,
    "value": 150,
    "destination": { "country": "DE", "city": "Berlin", "postalCode": "10115" },
    "sender": { "name": "John Doe", "address": "123 Main St" },
    "description": "Electronics"
  },
  {
    "weight": 0.3,
    "value": 2000,
    "destination": { "country": "NL", "city": "Amsterdam", "postalCode": "1012" },
    "sender": { "name": "Jane Smith", "address": "456 Oak Ave" }
  }
]`}
        </pre>
      </details>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {job && <BatchResults job={job} />}
    </div>
  );
}
