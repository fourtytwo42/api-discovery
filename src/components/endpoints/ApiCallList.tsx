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

interface UrlParameterVariation {
  parameter: string;
  position: number;
  values: Array<{
    value: string;
    count: number;
    exampleUrl: string;
  }>;
}

interface QueryParameterVariation {
  name: string;
  values: Array<{
    value: string;
    count: number;
    exampleUrl: string;
  }>;
}

interface PayloadVariation {
  payload: string;
  count: number;
  exampleUrl: string;
  exampleTimestamp: string;
}

interface JwtInfo {
  token: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  expiresAt: string | null;
  issuedAt: string | null;
  algorithm: string | null;
  isValid: boolean;
  error?: string;
}

interface SecurityHeaders {
  authorization?: {
    type: string;
    value: string;
    isJwt: boolean;
    jwtInfo?: JwtInfo;
  };
  cors?: {
    allowOrigin: string[];
    allowMethods: string[];
    allowHeaders: string[];
    allowCredentials: boolean;
    maxAge?: number;
  };
  security?: {
    contentTypeOptions?: string;
    frameOptions?: string;
    xssProtection?: string;
    strictTransportSecurity?: string;
    referrerPolicy?: string;
    permissionsPolicy?: string;
  };
  custom?: Record<string, string>;
}

interface ApiCallGroup {
  pattern: string;
  method: string;
  patternPath: string;
  count: number;
  calls: ApiCall[];
  avgDuration: number | null;
  mostCommonStatus: number | null;
  lastCall: string;
  urlParameterVariations?: UrlParameterVariation[];
  queryParameterVariations?: QueryParameterVariation[];
  payloadVariations?: PayloadVariation[];
  securityHeaders?: SecurityHeaders;
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

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="p-4 space-y-4">
                    {/* URL Parameter Variations */}
                    {group.urlParameterVariations && group.urlParameterVariations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          URL Parameters
                        </h4>
                        <div className="space-y-3">
                          {group.urlParameterVariations.map((param) => (
                            <div
                              key={param.parameter}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                <code className="text-blue-600 dark:text-blue-400">:{param.parameter}</code>
                                {' '}({param.values.length} unique value{param.values.length !== 1 ? 's' : ''})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {param.values.slice(0, 10).map((val, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs"
                                  >
                                    <code className="text-gray-700 dark:text-gray-300">{val.value}</code>
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                                      ({val.count}x)
                                    </span>
                                  </div>
                                ))}
                                {param.values.length > 10 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                    +{param.values.length - 10} more
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Query Parameter Variations */}
                    {group.queryParameterVariations && group.queryParameterVariations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Query Parameters
                        </h4>
                        <div className="space-y-3">
                          {group.queryParameterVariations.map((param) => (
                            <div
                              key={param.name}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                                <code className="text-blue-600 dark:text-blue-400">{param.name}</code>
                                {' '}({param.values.length} unique value{param.values.length !== 1 ? 's' : ''})
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {param.values.slice(0, 10).map((val, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-xs"
                                  >
                                    <code className="text-gray-700 dark:text-gray-300">{val.value}</code>
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                                      ({val.count}x)
                                    </span>
                                  </div>
                                ))}
                                {param.values.length > 10 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                                    +{param.values.length - 10} more
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Security Headers - JWT Token */}
                    {group.securityHeaders?.authorization?.jwtInfo && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🔐 Authentication Token (JWT)
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Token (click to copy):
                            </div>
                            <code
                              className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs break-all cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(group.securityHeaders!.authorization!.jwtInfo!.token);
                              }}
                              title="Click to copy token"
                            >
                              {group.securityHeaders.authorization.jwtInfo.token}
                            </code>
                          </div>
                          
                          {group.securityHeaders.authorization.jwtInfo.expiresAt && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Expires:
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {new Date(group.securityHeaders.authorization.jwtInfo.expiresAt).toLocaleString()}
                                {' '}
                                {new Date(group.securityHeaders.authorization.jwtInfo.expiresAt) > new Date() ? (
                                  <span className="text-green-600 dark:text-green-400">
                                    (Valid for {Math.floor((new Date(group.securityHeaders.authorization.jwtInfo.expiresAt).getTime() - Date.now()) / 1000 / 60)} more minutes)
                                  </span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">(Expired)</span>
                                )}
                              </div>
                            </div>
                          )}

                          {group.securityHeaders.authorization.jwtInfo.issuedAt && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Issued:
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {new Date(group.securityHeaders.authorization.jwtInfo.issuedAt).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {group.securityHeaders.authorization.jwtInfo.algorithm && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Algorithm:
                              </div>
                              <code className="text-sm text-gray-700 dark:text-gray-300">
                                {group.securityHeaders.authorization.jwtInfo.algorithm}
                              </code>
                            </div>
                          )}

                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                              View Token Contents
                            </summary>
                            <div className="mt-2 space-y-2">
                              <div>
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  Header:
                                </div>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(group.securityHeaders.authorization.jwtInfo.header, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                  Payload:
                                </div>
                                <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(group.securityHeaders.authorization.jwtInfo.payload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    )}

                    {/* Security Headers - Other Auth */}
                    {group.securityHeaders?.authorization && !group.securityHeaders.authorization.jwtInfo && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🔐 Authentication
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Type: <code className="text-blue-600 dark:text-blue-400">{group.securityHeaders.authorization.type}</code>
                          </div>
                          <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                            {group.securityHeaders.authorization.value}
                          </code>
                        </div>
                      </div>
                    )}

                    {/* CORS Headers */}
                    {group.securityHeaders?.cors && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🌐 CORS Configuration
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
                          {group.securityHeaders.cors.allowOrigin.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Allowed Origins:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.securityHeaders.cors.allowOrigin.map((origin, idx) => (
                                  <code key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {origin}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {group.securityHeaders.cors.allowMethods.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Allowed Methods:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.securityHeaders.cors.allowMethods.map((method, idx) => (
                                  <code key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {method}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {group.securityHeaders.cors.allowHeaders.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                Allowed Headers:
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {group.securityHeaders.cors.allowHeaders.map((header, idx) => (
                                  <code key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {header}
                                  </code>
                                ))}
                              </div>
                            </div>
                          )}
                          {group.securityHeaders.cors.allowCredentials && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              ✓ Credentials allowed
                            </div>
                          )}
                          {group.securityHeaders.cors.maxAge && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Max Age: {group.securityHeaders.cors.maxAge} seconds
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Security Headers */}
                    {group.securityHeaders?.security && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          🛡️ Security Headers
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 space-y-2">
                          {group.securityHeaders.security.contentTypeOptions && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">X-Content-Type-Options:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.contentTypeOptions}</code>
                            </div>
                          )}
                          {group.securityHeaders.security.frameOptions && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">X-Frame-Options:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.frameOptions}</code>
                            </div>
                          )}
                          {group.securityHeaders.security.xssProtection && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">X-XSS-Protection:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.xssProtection}</code>
                            </div>
                          )}
                          {group.securityHeaders.security.strictTransportSecurity && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">Strict-Transport-Security:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.strictTransportSecurity}</code>
                            </div>
                          )}
                          {group.securityHeaders.security.referrerPolicy && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">Referrer-Policy:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.referrerPolicy}</code>
                            </div>
                          )}
                          {group.securityHeaders.security.permissionsPolicy && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-600 dark:text-gray-400">Permissions-Policy:</span>{' '}
                              <code className="text-gray-700 dark:text-gray-300">{group.securityHeaders.security.permissionsPolicy}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Payload Variations */}
                    {group.payloadVariations && group.payloadVariations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Request Payloads ({group.payloadVariations.length} unique)
                        </h4>
                        <div className="space-y-3">
                          {group.payloadVariations.slice(0, 5).map((payload, idx) => (
                            <div
                              key={idx}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                  Used {payload.count} time{payload.count !== 1 ? 's' : ''}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(payload.exampleTimestamp).toLocaleString()}
                                </span>
                              </div>
                              <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-x-auto max-h-48 overflow-y-auto">
                                {payload.payload.length > 1000
                                  ? payload.payload.substring(0, 1000) + '\n... [truncated]'
                                  : payload.payload}
                              </pre>
                            </div>
                          ))}
                          {group.payloadVariations.length > 5 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                              +{group.payloadVariations.length - 5} more payload variation{group.payloadVariations.length - 5 !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Individual Calls (if no variations or for reference) */}
                    {(!group.urlParameterVariations || group.urlParameterVariations.length === 0) &&
                     (!group.queryParameterVariations || group.queryParameterVariations.length === 0) &&
                     (!group.payloadVariations || group.payloadVariations.length === 0) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Recent Calls
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {group.calls.slice(0, 10).map((call) => (
                            <div
                              key={call.id}
                              className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <code className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                                  {call.url}
                                </code>
                                {call.responseStatus && (
                                  <span
                                    className={`text-sm font-semibold ${getStatusColor(call.responseStatus)}`}
                                  >
                                    {call.responseStatus}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span>{new Date(call.timestamp).toLocaleString()}</span>
                                {call.duration !== null && <span>{call.duration}ms</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
