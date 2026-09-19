import { FileText, Upload } from 'lucide-react';
import { useRef } from 'react';

export default function CsvFileDropzone({
  file,
  onSelect,
}: {
  file: File | null;
  onSelect: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) onSelect(dropped);
  };

  return (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onClick={() => void fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-16 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
      >
        {file ? (
          <div className="space-y-3">
            <FileText className="w-10 h-10 text-indigo-500 mx-auto" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Drag and drop a CSV file here, or{' '}
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
              CSV should have an "email" column. Optional: "subscribed", plus any metadata
              columns.
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onSelect(selected);
        }}
      />
    </>
  );
}