import EndpointList from '@/components/endpoints/EndpointList';
import Link from 'next/link';
import Button from '@/components/ui/button';

export default function EndpointsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Endpoints</h1>
        <Link href="/endpoints/new">
          <Button>Create Endpoint</Button>
        </Link>
      </div>
      <EndpointList />
    </div>
  );
}

