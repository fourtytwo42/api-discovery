'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/card';
import Link from 'next/link';
import Button from '@/components/ui/button';

interface DashboardStats {
  totalEndpoints: number;
  activeEndpoints: number;
  totalCredits: number;
  totalApiCalls: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user info for credits
      const userResponse = await fetch('/api/v1/auth/me');
      const userData = await userResponse.json();

      // Fetch endpoints
      const endpointsResponse = await fetch('/api/v1/endpoints');
      const endpointsData = await endpointsResponse.json();

      // Calculate stats
      const totalEndpoints = endpointsData.endpoints?.length || 0;
      const activeEndpoints = endpointsData.endpoints?.filter((e: { status: string }) => e.status === 'ACTIVE').length || 0;

      setStats({
        totalEndpoints,
        activeEndpoints,
        totalCredits: userData.user?.credits || 0,
        totalApiCalls: 0, // TODO: Calculate from API calls
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Total Endpoints
            </h3>
            <p className="text-2xl font-bold">{stats?.totalEndpoints || 0}</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Active Endpoints
            </h3>
            <p className="text-2xl font-bold">{stats?.activeEndpoints || 0}</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Credits
            </h3>
            <p className="text-2xl font-bold">{stats?.totalCredits || 0}</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              API Calls
            </h3>
            <p className="text-2xl font-bold">{stats?.totalApiCalls || 0}</p>
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex gap-4">
              <Link href="/endpoints/new">
                <Button>Create New Endpoint</Button>
              </Link>
              <Link href="/endpoints">
                <Button variant="secondary">View All Endpoints</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

