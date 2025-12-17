'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';
import Link from 'next/link';

interface Endpoint {
  id: string;
  name: string | null;
  destinationUrl: string;
  proxyUrl: string;
  status: string;
  creditsUsed: number;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function EndpointList() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchEndpoints = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/endpoints');
      if (!response.ok) {
        throw new Error('Failed to load endpoints');
      }
      const data = await response.json();
      setEndpoints(data.endpoints || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load endpoints');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/endpoints/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete endpoint');
      }
      fetchEndpoints();
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">Loading endpoints...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8 text-error">{error}</div>
      </Card>
    );
  }

  if (endpoints.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No endpoints yet</p>
          <Link href="/endpoints/new">
            <Button>Create Endpoint</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Destination URL</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Credits Used</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => (
              <tr key={endpoint.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 px-4">{endpoint.name || endpoint.id}</td>
                <td className="py-3 px-4">
                  <code className="text-sm">{endpoint.destinationUrl}</code>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      endpoint.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : endpoint.status === 'PROCESSING'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {endpoint.status}
                  </span>
                </td>
                <td className="py-3 px-4">{endpoint.creditsUsed}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <Link href={`/endpoints/${endpoint.id}`}>
                      <Button size="sm" variant="ghost">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(endpoint.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

