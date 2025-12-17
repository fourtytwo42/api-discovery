'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';

interface ProxyUrlDisplayProps {
  proxyUrl: string;
}

export default function ProxyUrlDisplay({ proxyUrl }: ProxyUrlDisplayProps) {
  const [fullUrl, setFullUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the full URL on client side
    if (typeof window !== 'undefined') {
      setFullUrl(`${window.location.origin}${proxyUrl}`);
    }
  }, [proxyUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!fullUrl) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">Loading proxy URL...</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
        🔗 Proxy URL (Use this to make API calls):
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <code className="bg-white dark:bg-gray-800 px-3 py-2 rounded border border-blue-200 dark:border-blue-700 text-sm font-mono flex-1 min-w-0 break-all">
          {fullUrl}
        </code>
        <Button
          onClick={handleCopy}
          variant={copied ? 'secondary' : 'primary'}
          size="sm"
          className="whitespace-nowrap"
        >
          {copied ? '✓ Copied!' : 'Copy URL'}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>How to use:</strong> Replace your API base URL with this proxy URL. All requests will be logged and analyzed.
        </p>
        <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
          <strong>Example:</strong> If your app calls <code className="bg-white dark:bg-gray-800 px-1 rounded">https://pump.investments/api/users</code>, 
          use <code className="bg-white dark:bg-gray-800 px-1 rounded">{fullUrl}/api/users</code> instead.
        </div>
      </div>
    </div>
  );
}

