import { useState } from 'react';
import type { ParcelInput } from '../../api/client';

interface Props {
  onSubmit: (parcel: ParcelInput) => void;
  isLoading: boolean;
}

const initialForm: ParcelInput = {
  weight: 0,
  value: 0,
  destination: { country: '', city: '', postalCode: '' },
  description: '',
  sender: { name: '', address: '' },
};

export function ParcelForm({ onSubmit, isLoading }: Props) {
  const [form, setForm] = useState<ParcelInput>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (form.weight <= 0) errs.weight = 'Weight must be positive';
    if (form.value < 0) errs.value = 'Value cannot be negative';
    if (!form.destination.country) errs.country = 'Country is required';
    if (!/^[A-Z]{2,3}$/.test(form.destination.country)) errs.country = 'Use ISO code (e.g., DE, NL)';
    if (!form.destination.city) errs.city = 'City is required';
    if (!form.destination.postalCode) errs.postalCode = 'Postal code is required';
    if (!form.sender.name) errs.senderName = 'Sender name is required';
    if (!form.sender.address) errs.senderAddress = 'Sender address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.weight || ''}
            onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.weight ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="e.g., 2.5"
          />
          {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Value (EUR)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.value || ''}
            onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.value ? 'border-red-300' : 'border-gray-300'}`}
            placeholder="e.g., 150.00"
          />
          {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value}</p>}
        </div>
      </div>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">Destination</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Country Code</label>
            <input
              type="text"
              maxLength={3}
              value={form.destination.country}
              onChange={(e) => setForm({ ...form, destination: { ...form.destination, country: e.target.value.toUpperCase() } })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.country ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="DE"
            />
            {errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">City</label>
            <input
              type="text"
              value={form.destination.city}
              onChange={(e) => setForm({ ...form, destination: { ...form.destination, city: e.target.value } })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.city ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="Berlin"
            />
            {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Postal Code</label>
            <input
              type="text"
              value={form.destination.postalCode}
              onChange={(e) => setForm({ ...form, destination: { ...form.destination, postalCode: e.target.value } })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.postalCode ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="10115"
            />
            {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>}
          </div>
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-medium text-gray-700 px-2">Sender</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              type="text"
              value={form.sender.name}
              onChange={(e) => setForm({ ...form, sender: { ...form.sender, name: e.target.value } })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.senderName ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="John Doe"
            />
            {errors.senderName && <p className="mt-1 text-sm text-red-600">{errors.senderName}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <input
              type="text"
              value={form.sender.address}
              onChange={(e) => setForm({ ...form, sender: { ...form.sender, address: e.target.value } })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${errors.senderAddress ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="123 Main St"
            />
            {errors.senderAddress && <p className="mt-1 text-sm text-red-600">{errors.senderAddress}</p>}
          </div>
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input
          type="text"
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="e.g., Electronics, Fragile"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Routing...' : 'Route Parcel'}
      </button>
    </form>
  );
}
