'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';

interface ApiCall {
  id: string;
  method: string;
  url: string;
  responseStatus: number | null;
  duration: number | null;
  timestamp: Date;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  responseBody: string | null;
}

interface ApiCallListProps {
  endpointId: string;
}

export default function ApiCallList({ endpointId }: ApiCallListProps) {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApiCalls = async () => {
    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/api-calls`);
      if (!response.ok) {
        throw new Error('Failed to fetch API calls');
      }
      const data = await response.json();
      setApiCalls(data.apiCalls || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API calls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiCalls();
    // Poll for new API calls every 2 seconds
    const interval = setInterval(fetchApiCalls, 2000);
    return () => clearInterval(interval);
  }, [endpointId]);

  if (loading) {
    return (
      <Card title="API Calls">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Loading API calls...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="API Calls">
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </Card>
    );
  }

  if (apiCalls.length === 0) {
    return (
      <Card title="API Calls">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No API calls detected yet. Interact with the proxied site to see API calls appear here.
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: number | null) => {
    if (!status) return 'text-gray-500';
    if (status >= 200 && status < 300) return 'text-green-600 dark:text-green-400';
    if (status >= 300 && status < 400) return 'text-blue-600 dark:text-blue-400';
    if (status >= 400 && status < 500) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMethodColor = (method: string) => {
    const methodUpper = method.toUpperCase();
    switch (methodUpper) {
      case 'GET':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'POST':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
      case 'PUT':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
      case 'DELETE':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      case 'PATCH':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card title={`API Calls (${apiCalls.length})`}>
      <div className="space-y-4">
        {apiCalls.map((call) => (
          <div
            key={call.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(call.method)}`}
                >
                  {call.method}
                </span>
                <code className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                  {call.url}
                </code>
              </div>
              {call.responseStatus && (
                <span
                  className={`text-sm font-semibold ${getStatusColor(call.responseStatus)}`}
                >
                  {call.responseStatus}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>
                {new Date(call.timestamp).toLocaleString()}
              </span>
              {call.duration !== null && (
                <span>{call.duration}ms</span>
              )}
            </div>

            {(call.requestBody || call.responseBody) && (
              <details className="mt-3">
                <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                  View Details
                </summary>
                <div className="mt-2 space-y-2">
                  {call.requestBody && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Request Body:
                      </div>
                      <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                        {call.requestBody.length > 500
                          ? call.requestBody.substring(0, 500) + '... [truncated]'
                          : call.requestBody}
                      </pre>
                    </div>
                  )}
                  {call.responseBody && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                        Response Body:
                      </div>
                      <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                        {call.responseBody.length > 500
                          ? call.responseBody.substring(0, 500) + '... [truncated]'
                          : call.responseBody}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

