import { notFound, redirect } from 'next/navigation';
import DocumentationViewer from '@/components/documentation/DocumentationViewer';
import Button from '@/components/ui/button';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/database/prisma';
import { verifyToken } from '@/lib/auth/jwt';
import ProxyUrlDisplay from '@/components/endpoints/ProxyUrlDisplay';

async function getEndpoint(id: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    
    if (!token) {
      redirect('/login');
    }

    // Verify token and get user
    let user;
    try {
      const payload = verifyToken(token.value);
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, role: true },
      });
    } catch {
      redirect('/login');
    }

    if (!user) {
      redirect('/login');
    }

    // Fetch endpoint
    const endpoint = await prisma.endpoint.findUnique({
      where: { id },
      include: {
        apiCalls: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
        discoveredEndpoints: true,
      },
    });

    if (!endpoint) {
      return null;
    }

    // Check authorization
    if (endpoint.userId !== user.id && user.role !== 'ADMIN') {
      return null;
    }

    return { endpoint };
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
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Destination: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{endpoint.destinationUrl}</code>
        </p>
        <ProxyUrlDisplay proxyUrl={endpoint.proxyUrl} />
      </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">API Calls</h2>
            <ApiCallList endpointId={id} />
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Documentation</h2>
            <DocumentationViewer endpointId={id} />
          </div>
        </div>
      );
    }

