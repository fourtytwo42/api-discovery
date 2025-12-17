import EndpointForm from '@/components/endpoints/EndpointForm';

export default function NewEndpointPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Endpoint</h1>
      <EndpointForm />
    </div>
  );
}

