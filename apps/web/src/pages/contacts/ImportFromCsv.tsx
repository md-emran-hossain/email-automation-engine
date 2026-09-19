import { type ImportContactsResult } from '@email-automation-engine/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTenant } from '../../contexts/TenantContext';
import api from '../../lib/api';
import CsvFileDropzone from './components/CsvFileDropzone';
import CsvImportResult from './components/CsvImportResult';
import CsvPreviewTable, { type CsvPreview } from './components/CsvPreviewTable';

const primaryButtonClasses =
  'px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
const secondaryButtonClasses =
  'px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors';

export default function ImportFromCsv() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [results, setResults] = useState<ImportContactsResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<CsvPreview>(
        `/tenants/${currentTenant?.id}/contacts/import/preview`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setPreview(data);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file');
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.post<ImportContactsResult>(
        `/tenants/${currentTenant?.id}/contacts/import`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setResults(data);
      void queryClient.invalidateQueries({ queryKey: ['contacts', currentTenant?.id] });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    setResults(null);
  }, []);

  const shouldPreview = () => selectedFile && previewMutation.mutate(selectedFile);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
  }, []);

  if (results) {
    return (
      <div className="space-y-4">
        <CsvImportResult result={results} />
        <div className="flex justify-start gap-2">
          <button onClick={() => void navigate('/contacts')} className={primaryButtonClasses}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="space-y-4">
        {previewMutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to process CSV. Please check the file format.
          </p>
        )}
        <CsvPreviewTable preview={preview} />
        <div className="flex justify-start gap-2">
          <button
            onClick={() => void importMutation.mutate()}
            disabled={importMutation.isPending}
            className={primaryButtonClasses}
          >
            {importMutation.isPending ? 'Importing...' : 'Import contacts'}
          </button>
          <button onClick={reset} className={secondaryButtonClasses}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CsvFileDropzone file={selectedFile} onSelect={handleFileSelect} />

      {previewMutation.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to process CSV. Please check the file format.
        </p>
      )}

      {selectedFile && (
        <div className="flex justify-start gap-2">
          <button
            onClick={shouldPreview}
            disabled={previewMutation.isPending}
            className={primaryButtonClasses}
          >
            {previewMutation.isPending ? 'Processing...' : 'Continue'}
          </button>
          <button onClick={() => setSelectedFile(null)} className={secondaryButtonClasses}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
