import type { UseFormRegister } from 'react-hook-form';
import { type StepFormData } from '@email-automation-engine/shared';
import { useEmailTemplates } from '../../../../pages/workflow/hooks/useEmailTemplates';

interface EmailProps {
  register: UseFormRegister<StepFormData>;
  isActive: boolean;
}

export default function Email({ register, isActive }: EmailProps) {
  const { data: templates = [] } = useEmailTemplates();

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
        Email template
      </label>
      <select
        {...register('config.templateId')}
        disabled={isActive}
        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
      >
        <option value="">Select a template</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
