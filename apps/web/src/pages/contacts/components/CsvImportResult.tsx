import { type ImportContactsResult } from '@email-automation-engine/shared';
import { AlertCircle, CheckCircle } from 'lucide-react';
import pluralize from 'pluralize';

export default function CsvImportResult({ result }: { result: ImportContactsResult }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {result.created}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">Created</p>
        </div>
        <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-gray-700 dark:text-zinc-300">
            {result.skipped}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400">Skipped (duplicates)</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div>
          <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {pluralize('error', result.errors.length, true)}
          </p>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {result.errors.map((err) => (
              <div
                key={err.row}
                className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-3 py-1.5"
              >
                <span className="font-medium">Row {err.row}:</span> {err.reason}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}