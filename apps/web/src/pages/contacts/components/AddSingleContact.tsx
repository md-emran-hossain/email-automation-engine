import { type ContactResponse } from '@email-automation-engine/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTenant } from '../../../contexts/TenantContext';
import api from '../../../lib/api';
import { toast } from '../../../lib/toast';

export default function AddSingleContact() {
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(true);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ContactResponse>(`/tenants/${currentTenant?.id}/contacts`, {
        email,
        subscribed,
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contacts', currentTenant?.id] });
      toast.success('A contact has been added');
      void navigate('/contacts');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const message = err.response?.data?.message ?? 'Failed to create contact';
      setError(message);
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 max-w-lg"
    >
      <div>
        <label
          htmlFor="new-contact-email"
          className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1"
        >
          Email *
        </label>
        <input
          id="new-contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contact@example.com"
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label
          htmlFor="new-contact-status"
          className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1"
        >
          Status
        </label>
        <select
          id="new-contact-status"
          value={String(subscribed)}
          onChange={(e) => setSubscribed(e.target.value === 'true')}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="true">Subscribed</option>
          <option value="false">Unsubscribed</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex justify-start gap-2 pt-2">
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {createMutation.isPending ? 'Adding...' : 'Add contact'}
        </button>
        <button
          type="button"
          onClick={() => void navigate('/contacts')}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
