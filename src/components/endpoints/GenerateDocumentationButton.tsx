'use client';

import { useState } from 'react';
import Button from '@/components/ui/button';

interface GenerateDocumentationButtonProps {
  endpointId: string;
  selectedPatterns?: string[];
  onSuccess?: () => void;
}

export default function GenerateDocumentationButton({
  endpointId,
  selectedPatterns,
  onSuccess,
}: GenerateDocumentationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<{
    patternsProcessed: number;
    patternsSucceeded: number;
    patternsStored: number;
    duration: number;
  } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResults(null);

    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/generate-documentation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patterns: selectedPatterns && selectedPatterns.length > 0 ? selectedPatterns : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate documentation');
      }

      setSuccess(true);
      setResults({
        patternsProcessed: data.results?.length || 0,
        patternsSucceeded: data.results?.filter((r: { success: boolean }) => r.success).length || 0,
        patternsStored: data.stored?.length || 0,
        duration: data.duration || 0,
      });

      // Refresh the page after a short delay to show updated documentation
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
      setLoading(false);
    }
  };

  const hasSelection = selectedPatterns && selectedPatterns.length > 0;
  const buttonText = hasSelection
    ? `📚 Generate Documentation (${selectedPatterns.length} selected)`
    : '📚 Generate Documentation for All';

  return (
    <div className="space-y-4">
      <Button
        onClick={handleGenerate}
        disabled={loading || (hasSelection && selectedPatterns.length === 0)}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Generating Documentation...
          </>
        ) : (
          buttonText
        )}
      </Button>
      {hasSelection && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {selectedPatterns.length} endpoint pattern{selectedPatterns.length !== 1 ? 's' : ''} selected
        </p>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300 font-semibold mb-1">Error</p>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && results && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300 font-semibold mb-2">
            ✅ Documentation Generated Successfully!
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
            <p>• Patterns processed: {results.patternsProcessed}</p>
            <p>• Patterns succeeded: {results.patternsSucceeded}</p>
            <p>• Documentation stored: {results.patternsStored}</p>
            <p>• Duration: {(results.duration / 1000).toFixed(2)}s</p>
          </div>
          <p className="text-xs text-green-500 dark:text-green-400 mt-2">
            Page will refresh shortly to show the new documentation...
          </p>
        </div>
      )}
    </div>
  );
}

