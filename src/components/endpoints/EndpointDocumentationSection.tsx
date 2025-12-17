'use client';

import DocumentationViewer from '@/components/documentation/DocumentationViewer';
import GenerateDocumentationButton from '@/components/endpoints/GenerateDocumentationButton';

interface EndpointDocumentationSectionProps {
  endpointId: string;
  selectedPatterns: string[];
}

export default function EndpointDocumentationSection({
  endpointId,
  selectedPatterns,
}: EndpointDocumentationSectionProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Documentation</h2>
        <GenerateDocumentationButton
          endpointId={endpointId}
          selectedPatterns={selectedPatterns.length > 0 ? selectedPatterns : undefined}
        />
      </div>
      <DocumentationViewer endpointId={endpointId} />
    </div>
  );
}

