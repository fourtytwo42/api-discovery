'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/card';

interface ApiCall {
  id: string;
  method: string;
  url: string;
  responseStatus: number | null;
  duration: number | null;
  timestamp: string;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  responseBody: string | null;
}

interface ApiCallGroup {
  pattern: string;
  count: number;
  calls: ApiCall[];
  avgDuration: number | null;
  mostCommonStatus: number | null;
  lastCall: string;
}

interface ApiCallListProps {
  endpointId: string;
  onSelectionChange?: (selectedPatterns: string[]) => void;
}

export default function ApiCallList({ endpointId, onSelectionChange }: ApiCallListProps) {
  const [grouped, setGrouped] = useState<ApiCallGroup[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());

  const fetchApiCalls = async () => {
    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/api-calls`);
      if (!response.ok) {
        throw new Error('Failed to fetch API calls');
      }
      const data = await response.json();
      setGrouped(data.grouped || []);
      setTotalCalls(data.totalCalls || 0);
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

  const toggleGroup = (pattern: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(pattern)) {
      newExpanded.delete(pattern);
    } else {
      newExpanded.add(pattern);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSelection = (pattern: string) => {
    const newSelected = new Set(selectedPatterns);
    if (newSelected.has(pattern)) {
      newSelected.delete(pattern);
    } else {
      newSelected.add(pattern);
    }
    setSelectedPatterns(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected));
    }
  };

  const selectAll = () => {
    const allPatterns = grouped.map(g => g.pattern);
    const newSelected = new Set(allPatterns);
    setSelectedPatterns(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected));
    }
  };

  const selectNone = () => {
    setSelectedPatterns(new Set());
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedPatterns));
    }
  }, [selectedPatterns, onSelectionChange]);

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

  if (grouped.length === 0) {
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

  const allSelected = grouped.length > 0 && selectedPatterns.size === grouped.length;
  const someSelected = selectedPatterns.size > 0 && selectedPatterns.size < grouped.length;

  return (
    <Card title={`API Endpoints (${grouped.length} unique, ${totalCalls} total calls)`}>
      {/* Selection Controls */}
      {grouped.length > 0 && (
        <div className="mb-4 flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={allSelected ? selectNone : selectAll}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedPatterns.size > 0 && `(${selectedPatterns.size} selected)`}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {grouped.map((group) => {
          const isExpanded = expandedGroups.has(group.pattern);
          const isSelected = selectedPatterns.has(group.pattern);
          const [method, ...pathParts] = group.pattern.split(' ');
          const path = pathParts.join(' ');

          return (
            <div
              key={group.pattern}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isSelected
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Group Header */}
              <div className="flex items-center gap-2">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(group.pattern)}
                  onClick={(e) => e.stopPropagation()}
                  className="ml-3 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
                {/* Expand/Collapse Button */}
                <button
                  onClick={() => toggleGroup(group.pattern)}
                  className="flex-1 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-gray-500 flex-shrink-0 text-lg">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(method)}`}
                      >
                        {method}
                      </span>
                      <code className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                        {path}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                      <span className="font-semibold">{group.count} calls</span>
                      {group.mostCommonStatus && (
                        <span className={getStatusColor(group.mostCommonStatus)}>
                          {group.mostCommonStatus}
                        </span>
                      )}
                      {group.avgDuration !== null && (
                        <span>~{group.avgDuration}ms avg</span>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Expanded Calls List */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                    {group.calls.map((call) => (
                      <div
                        key={call.id}
                        className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${getMethodColor(call.method)}`}
                            >
                              {call.method}
                            </span>
                            <code className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
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
                            <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
