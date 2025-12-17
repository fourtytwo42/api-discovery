'use client';

import { useState } from 'react';
import ApiCallList from './ApiCallList';
import EndpointDocumentationSection from './EndpointDocumentationSection';

interface ApiCallListWithSelectionProps {
  endpointId: string;
}

export default function ApiCallListWithSelection({
  endpointId,
}: ApiCallListWithSelectionProps) {
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">API Calls</h2>
        <ApiCallList
          endpointId={endpointId}
          onSelectionChange={setSelectedPatterns}
        />
      </div>
      <div className="mb-6">
        <EndpointDocumentationSection
          endpointId={endpointId}
          selectedPatterns={selectedPatterns}
        />
      </div>
    </>
  );
}

