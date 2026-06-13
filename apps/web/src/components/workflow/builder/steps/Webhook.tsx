import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import { type StepFormData } from '@email-automation-engine/shared';

interface WebhookProps {
  register: UseFormRegister<StepFormData>;
  errors: FieldErrors<StepFormData>;
  isActive: boolean;
}

export default function Webhook({ register, errors, isActive }: WebhookProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
        Configuration (JSON)
      </label>
      <textarea
        {...register('configString')}
        disabled={isActive}
        rows={10}
        className={`w-full font-mono text-sm px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 ${
          errors.configString
            ? 'border-red-300 dark:border-red-900 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 dark:border-zinc-700'
        }`}
        placeholder="{}"
      />
      {errors.configString && (
        <p className="mt-1 text-xs text-red-500">{errors.configString.message as string}</p>
      )}
    </div>
  );
}
