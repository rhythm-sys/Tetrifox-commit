import { useState } from 'react';
import { ParcelForm } from '../components/parcel/ParcelForm';
import { ParcelResult } from '../components/parcel/ParcelResult';
import { api, type ParcelInput, type RoutingResult } from '../api/client';

export function RoutePage() {
  const [result, setResult] = useState<RoutingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(parcel: ParcelInput) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.routeParcel(parcel);
      setResult(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to route parcel');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Route a Parcel</h2>
        <p className="text-gray-600 mt-1">Enter parcel details to determine the routing department</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <ParcelForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && <ParcelResult result={result} />}
    </div>
  );
}
