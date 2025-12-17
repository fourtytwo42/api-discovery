'use client';

import { useState, useEffect, useRef } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Card from '@/components/ui/card';
import Button from '@/components/ui/button';

interface DocumentationItem {
  id: string;
  markdown: string;
  generatedAt: string;
  version: string;
}

interface DocumentationViewerProps {
  endpointId: string;
}

export default function DocumentationViewer({ endpointId }: DocumentationViewerProps) {
  const [documentation, setDocumentation] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
      setDocumentation(data.documentation || []);
      // Auto-expand the first doc if any exist
      if (data.documentation && data.documentation.length > 0) {
        setExpandedDocs(new Set([data.documentation[0].id]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMarkdown = async (docId: string) => {
    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/documentation/export?format=markdown&docId=${docId}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const doc = documentation.find(d => d.id === docId);
      const timestamp = doc ? new Date(doc.generatedAt).toISOString().split('T')[0] : 'docs';
      a.download = `api-docs-${endpointId}-${timestamp}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleExportPdf = async (docId: string) => {
    try {
      setExportingPdf(docId);
      const contentElement = contentRefs.current.get(docId);
      if (!contentElement) {
        throw new Error('Content element not found');
      }

      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '800px';
      tempContainer.style.padding = '40px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.innerHTML = contentElement.innerHTML;
      document.body.appendChild(tempContainer);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempContainer);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      // Convert pixels to mm (assuming 96 DPI)
      const pxToMm = 0.264583;
      const imgWidthMm = imgWidth * pxToMm;
      const imgHeightMm = imgHeight * pxToMm;
      const ratio = Math.min(pdfWidth / imgWidthMm, pdfHeight / imgHeightMm);
      const imgScaledWidth = imgWidthMm * ratio;
      const imgScaledHeight = imgHeightMm * ratio;

      pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight);

      // If content is taller than one page, add more pages
      let heightLeft = imgScaledHeight;
      let position = 0;

      while (heightLeft > pdfHeight) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgScaledWidth, imgScaledHeight);
        heightLeft -= pdfHeight;
      }

      const doc = documentation.find(d => d.id === docId);
      const timestamp = doc ? new Date(doc.generatedAt).toISOString().split('T')[0] : 'docs';
      pdf.save(`api-docs-${endpointId}-${timestamp}.pdf`);
    } catch (err) {
      alert('PDF export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setExportingPdf(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this documentation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/documentation/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh documentation list
      await fetchDocumentation();
      // Remove from selection
      const newSelected = new Set(selectedDocs);
      newSelected.delete(docId);
      setSelectedDocs(newSelected);
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteMultiple = async () => {
    if (selectedDocs.size === 0) {
      alert('Please select at least one documentation item to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedDocs.size} documentation item(s)?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/endpoints/${endpointId}/documentation/delete-multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ docIds: Array.from(selectedDocs) }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      // Refresh documentation list
      await fetchDocumentation();
      // Clear selection
      setSelectedDocs(new Set());
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const toggleSelection = (docId: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const selectAll = () => {
    setSelectedDocs(new Set(documentation.map(d => d.id)));
  };

  const selectNone = () => {
    setSelectedDocs(new Set());
  };

  const toggleExpand = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
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

  if (documentation.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">No documentation available. Generate documentation to get started.</div>
      </Card>
    );
  }

  const allSelected = documentation.length > 0 && selectedDocs.size === documentation.length;
  const someSelected = selectedDocs.size > 0 && selectedDocs.size < documentation.length;

  return (
    <Card>
      {/* Selection Controls */}
      {documentation.length > 0 && (
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={allSelected ? selectNone : selectAll}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {selectedDocs.size > 0 ? `${selectedDocs.size} selected` : 'Select all'}
            </span>
            {selectedDocs.size > 0 && (
              <Button
                size="sm"
                variant="danger"
                onClick={handleDeleteMultiple}
                className="ml-2"
              >
                Delete Selected ({selectedDocs.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Documentation List */}
      <div className="space-y-4">
        {documentation.map((doc) => {
          const isExpanded = expandedDocs.has(doc.id);
          const isSelected = selectedDocs.has(doc.id);
          const generatedDate = new Date(doc.generatedAt);
          const dateStr = generatedDate.toLocaleDateString() + ' ' + generatedDate.toLocaleTimeString();

          return (
            <div
              key={doc.id}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isSelected
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Document Header */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(doc.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                />
                <button
                  onClick={() => toggleExpand(doc.id)}
                  className="flex-1 text-left flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      Documentation v{doc.version}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Generated: {dateStr}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportMarkdown(doc.id);
                    }}
                  >
                    Export MD
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportPdf(doc.id);
                    }}
                    disabled={exportingPdf === doc.id}
                  >
                    {exportingPdf === doc.id ? 'Exporting...' : 'Export PDF'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Document Content */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div
                    ref={(el) => {
                      if (el) {
                        contentRefs.current.set(doc.id, el);
                      }
                    }}
                    className="prose dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700"
                  >
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
                      {doc.markdown}
                    </ReactMarkdown>
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
