import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="py-16 text-center border border-dashed border-gray-200 dark:border-zinc-800 rounded-xl w-full col-span-full">
      <div className="mx-auto w-12 h-12 text-gray-400 bg-gray-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}
