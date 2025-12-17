'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

interface DocumentationViewerProps {
  endpointId: string;
}

export default function DocumentationViewer({ endpointId }: DocumentationViewerProps) {
  const [documentation, setDocumentation] = useState<{
    markdown?: string;
    openApiSpec?: string;
    typescriptTypes?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'markdown' | 'openapi' | 'typescript'>('markdown');

  useEffect(() => {
    fetchDocumentation();
  }, [endpointId]);

  const fetchDocumentation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/endpoints/${endpointId}/documentation`);
      if (!response.ok) {
        throw new Error('Failed to load documentation');
      }
      const data = await response.json();
      setDocumentation(data.documentation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/documentation/export?format=${format}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-docs-${endpointId}.${format === 'typescript' ? 'ts' : format === 'openapi' ? 'json' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-8">Loading documentation...</div>
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

  if (!documentation) {
    return (
      <Card>
        <div className="text-center py-8">No documentation available</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('markdown')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'markdown'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setActiveTab('openapi')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'openapi'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            OpenAPI
          </button>
          <button
            onClick={() => setActiveTab('typescript')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'typescript'
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            TypeScript
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleExport('markdown')}>
            Export MD
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleExport('openapi')}>
            Export JSON
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleExport('typescript')}>
            Export TS
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        {activeTab === 'markdown' && (
          <div className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
            {documentation.markdown ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  // Customize code blocks
                  code: (props: any) => {
                    const { inline, className, children } = props;
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Allow HTML tags like <br>
                  br: () => <br />,
                  // Customize tables
                  table: (props: any) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
                        {props.children}
                      </table>
                    </div>
                  ),
                  th: (props: any) => (
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-800 font-semibold text-left" {...props}>
                      {props.children}
                    </th>
                  ),
                  td: (props: any) => (
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props}>
                      {props.children}
                    </td>
                  ),
                }}
              >
                {documentation.markdown}
              </ReactMarkdown>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">No markdown documentation available</div>
            )}
          </div>
        )}

        {activeTab === 'openapi' && (
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-sm">
            {documentation.openApiSpec
              ? JSON.stringify(JSON.parse(documentation.openApiSpec), null, 2)
              : 'No OpenAPI spec available'}
          </pre>
        )}

        {activeTab === 'typescript' && (
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto text-sm">
            {documentation.typescriptTypes || 'No TypeScript types available'}
          </pre>
        )}
      </div>
    </Card>
  );
}

