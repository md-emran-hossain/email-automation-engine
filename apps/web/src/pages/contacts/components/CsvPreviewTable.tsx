export interface CsvPreview {
  headers: string[];
  rows: string[][];
}

export default function CsvPreviewTable({ preview }: { preview: CsvPreview }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
            <tr>
              {preview.headers.map((cell, i) => (
                <th key={i} className="px-4 py-3 font-medium text-gray-500 dark:text-zinc-400">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
            {preview.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
