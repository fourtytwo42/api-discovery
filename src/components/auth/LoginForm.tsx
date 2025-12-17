'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/input';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

interface SeedAccount {
  email: string;
  password: string;
  label: string;
  type: 'admin' | 'user' | 'demo';
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: 'admin@api-discovery.com',
    password: 'admin123',
    label: '👑 Admin',
    type: 'admin',
  },
  {
    email: 'user@example.com',
    password: 'user123',
    label: '👤 Regular User',
    type: 'user',
  },
  {
    email: 'demo1@example.com',
    password: 'demo123',
    label: '🎮 Demo 1',
    type: 'demo',
  },
  {
    email: 'demo2@example.com',
    password: 'demo123',
    label: '🎮 Demo 2',
    type: 'demo',
  },
  {
    email: 'demo3@example.com',
    password: 'demo123',
    label: '🎮 Demo 3',
    type: 'demo',
  },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAccountClick = (account: SeedAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <Card title="Sign In">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error/10 text-error p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Login (Click to fill)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {SEED_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleSeedAccountClick(account)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                  email === account.email
                    ? 'bg-primary text-white'
                    : account.type === 'admin'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800'
                    : account.type === 'demo'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </Card>
  );
}
