import { notFound } from 'next/navigation';
import DocumentationViewer from '@/components/documentation/DocumentationViewer';
import Button from '@/components/ui/button';
import Link from 'next/link';

async function getEndpoint(id: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/endpoints/${id}`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

export default async function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getEndpoint(id);

  if (!data || !data.endpoint) {
    notFound();
  }

  const endpoint = data.endpoint;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/endpoints">
          <Button variant="ghost" size="sm">← Back to Endpoints</Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          {endpoint.name || endpoint.id}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          <code>{endpoint.destinationUrl}</code>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Proxy URL: <code>{endpoint.proxyUrl}</code>
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Documentation</h2>
        <DocumentationViewer endpointId={id} />
      </div>
    </div>
  );
}

