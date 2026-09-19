import { type SignupDto, signupSchema } from '@email-automation-engine/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AuthLayout } from '../../components/auth/AuthLayout';
import { CredentialsForm } from '../../components/auth/CredentialsForm';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../lib/errors';

export default function Signup() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupDto>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupDto) => {
    if (isSubmitting) {
      return;
    }

    try {
      setError(null);
      await registerUser(data);
      void navigate('/workflows');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to sign up. Please try again.'));
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Start automating your emails today"
      error={error}
    >
      <CredentialsForm
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        register={register}
        errors={errors}
        isSubmitting={isSubmitting}
        idleLabel="Sign up"
        submittingLabel="Creating account..."
      />

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-zinc-400">
        Already have an account?{' '}
        <Link
          to="/signin"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
