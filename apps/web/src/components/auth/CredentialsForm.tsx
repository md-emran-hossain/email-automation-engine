import { type SigninDto, type SignupDto } from '@email-automation-engine/shared';
import { type FormEventHandler, type InputHTMLAttributes } from 'react';
import { type FieldErrors, type UseFormRegister } from 'react-hook-form';

interface CredentialsFormProps {
  onSubmit: FormEventHandler<HTMLFormElement>;
  register: UseFormRegister<SigninDto> | UseFormRegister<SignupDto>;
  errors: FieldErrors<SigninDto> | FieldErrors<SignupDto>;
  isSubmitting: boolean;
  idleLabel: string;
  submittingLabel: string;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function Field({ label, error, id, ...inputProps }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function CredentialsForm({
  onSubmit,
  register,
  errors,
  isSubmitting,
  idleLabel,
  submittingLabel,
}: CredentialsFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field
        {...register('email')}
        id="email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
      />
      <Field
        {...register('password')}
        id="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
      />

      <button
        type="submit"
        className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? submittingLabel : idleLabel}
      </button>
    </form>
  );
}
