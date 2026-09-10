import { useState, useCallback } from 'react';
import { Upload, FileJson, AlertCircle } from 'lucide-react';

interface Props {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export function BatchUpload({ onUpload, isLoading }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);
    if (!file.name.endsWith('.json')) {
      setError('Only JSON files are supported');
      return false;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size cannot exceed 50MB');
      return false;
    }
    return true;
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }

  function handleSubmit() {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <Upload className="mx-auto text-gray-400 mb-3" size={32} />
        <p className="text-sm text-gray-600 mb-2">
          Drag and drop a JSON file here, or{' '}
          <label className="text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
            browse
            <input type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
          </label>
        </p>
        <p className="text-xs text-gray-400">JSON array of parcels, max 50MB</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-primary-500" />
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Uploading...' : 'Process Batch'}
          </button>
        </div>
      )}
    </div>
  );
}
