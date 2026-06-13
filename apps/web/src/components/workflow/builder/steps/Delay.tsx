import type { UseFormRegister, UseFormWatch, FieldErrors } from 'react-hook-form';
import { type StepFormData, TIME_UNITS } from '@email-automation-engine/shared';

interface DelayProps {
  register: UseFormRegister<StepFormData>;
  watch: UseFormWatch<StepFormData>;
  errors: FieldErrors<StepFormData>;
  isActive: boolean;
}

export default function Delay({ register, watch, errors, isActive }: DelayProps) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
          Wait for
        </label>
        <input
          type="number"
          {...register('config.amount')}
          min={watch('config.unit') === TIME_UNITS.MINUTES ? 15 : 1}
          step={watch('config.unit') === TIME_UNITS.MINUTES ? 15 : 1}
          disabled={isActive}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50 ${
            errors.config?.amount
              ? 'border-red-300 dark:border-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-zinc-700'
          }`}
        />
        {errors.config?.amount && (
          <p className="mt-1 text-xs text-red-500">{errors.config.amount.message as string}</p>
        )}
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
          Time unit
        </label>
        <select
          {...register('config.unit')}
          disabled={isActive}
          className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white disabled:opacity-50"
        >
          <option value={TIME_UNITS.MINUTES}>Minutes</option>
          <option value={TIME_UNITS.HOURS}>Hours</option>
          <option value={TIME_UNITS.DAYS}>Days</option>
          <option value={TIME_UNITS.WEEKS}>Weeks</option>
        </select>
      </div>
    </div>
  );
}
