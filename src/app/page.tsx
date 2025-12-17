import Link from 'next/link';
import Button from '@/components/ui/button';
import Card from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">
          API Discovery Platform
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Automatically generate comprehensive API documentation by capturing and analyzing
          your API traffic through our intelligent proxy system.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">Sign In</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">Proxy-Based Capture</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Route your API traffic through our proxy to automatically capture all requests
              and responses without modifying your code.
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Our intelligent analysis pipeline extracts endpoints, infers schemas, and
              generates natural language descriptions using AI.
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">Export & Share</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Export your documentation in multiple formats: Markdown, OpenAPI, and
              TypeScript types for easy integration.
            </p>
          </div>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-4 text-left">
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-2">1. Create an Endpoint</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create a proxy endpoint pointing to your API. You'll get a unique proxy URL
                to use instead of your original API URL.
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-2">2. Route Traffic Through Proxy</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Update your application to use the proxy URL. All API calls will be captured
                automatically as they pass through.
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <h3 className="font-semibold mb-2">3. Generate Documentation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Once you've captured enough API calls, trigger analysis to extract endpoints,
                infer schemas, and generate comprehensive documentation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
