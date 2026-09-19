import { type SigninDto, signinSchema } from '@email-automation-engine/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/auth/AuthLayout';
import { CredentialsForm } from '../../components/auth/CredentialsForm';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../lib/errors';

export default function Signin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninDto>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninDto) => {
    if (isSubmitting) {
      return;
    }

    try {
      setError(null);
      await login(data);
      void navigate('/workflows');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign in. Please try again.'));
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account" error={error}>
      <CredentialsForm
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        idleLabel="Sign in"
        submittingLabel="Signing in..."
      />

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-zinc-400">
        Don't have an account?{' '}
        <Link
          to="/signup"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
