import { prisma } from '../database/prisma';
import { enhanceEndpointWithAI } from '../ai/enhancement';
import { Prisma } from '@prisma/client';

export interface DocumentationData {
  markdown: string;
  openApiSpec?: string;
  typescriptTypes?: string;
}

/**
 * Generate documentation for discovered endpoints
 */
export async function generateDocumentation(endpointId: string): Promise<DocumentationData> {
  // Get endpoint with discovered endpoints
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    include: {
      discoveredEndpoints: true,
    },
  });

  if (!endpoint || endpoint.discoveredEndpoints.length === 0) {
    throw new Error('No discovered endpoints found');
  }

  // Generate markdown documentation
  const markdown = await generateMarkdownDocumentation(endpoint.discoveredEndpoints);

  // Generate OpenAPI spec (simplified)
  const openApiSpec = generateOpenAPISpec(endpoint.discoveredEndpoints);

  // Generate TypeScript types
  const typescriptTypes = generateTypeScriptTypes(endpoint.discoveredEndpoints);

  return {
    markdown,
    openApiSpec,
    typescriptTypes,
  };
}

async function generateMarkdownDocumentation(
  discoveredEndpoints: Array<{
    pattern: string;
    methods: string[];
    description: string | null;
    requestSchema: unknown;
    responseSchemas: unknown;
    authRequired: boolean;
    authType: string | null;
  }>
): Promise<string> {
  let markdown = '# API Documentation\n\n';
  markdown += 'This documentation was automatically generated from captured API calls.\n\n';

  for (const discovered of discoveredEndpoints) {
    markdown += `## ${discovered.pattern}\n\n`;
    
    if (discovered.description) {
      markdown += `${discovered.description}\n\n`;
    }

    markdown += `**Methods:** ${discovered.methods.join(', ')}\n\n`;

    if (discovered.authRequired) {
      markdown += `**Authentication:** Required (${discovered.authType || 'Unknown'})\n\n`;
    }

    if (discovered.requestSchema) {
      markdown += '### Request\n\n';
      markdown += '```json\n';
      markdown += JSON.stringify(discovered.requestSchema, null, 2);
      markdown += '\n```\n\n';
    }

    if (discovered.responseSchemas) {
      markdown += '### Response\n\n';
      const responseSchemas = discovered.responseSchemas as Record<string, unknown>;
      Object.entries(responseSchemas).forEach(([status, schema]) => {
        markdown += `**Status ${status}:**\n\n`;
        markdown += '```json\n';
        markdown += JSON.stringify(schema, null, 2);
        markdown += '\n```\n\n';
      });
    }

    markdown += '---\n\n';
  }

  return markdown;
}

function generateOpenAPISpec(discoveredEndpoints: Array<{
  pattern: string;
  methods: string[];
  requestSchema: unknown;
  responseSchemas: unknown;
  authRequired: boolean;
  authType: string | null;
}>): string {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
    paths: {} as Record<string, unknown>,
  };

  for (const discovered of discoveredEndpoints) {
    const path = discovered.pattern;
    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    const pathObj = spec.paths[path] as Record<string, unknown>;
    
    for (const method of discovered.methods) {
      const methodLower = method.toLowerCase();
      pathObj[methodLower] = {
        summary: discovered.pattern,
        requestBody: discovered.requestSchema
          ? {
              content: {
                'application/json': {
                  schema: discovered.requestSchema,
                },
              },
            }
          : undefined,
        responses: discovered.responseSchemas
          ? Object.entries(discovered.responseSchemas as Record<string, unknown>).reduce(
              (acc, [status, schema]) => {
                acc[status] = {
                  description: `Status ${status} response`,
                  content: {
                    'application/json': {
                      schema,
                    },
                  },
                };
                return acc;
              },
              {} as Record<string, unknown>
            )
          : { '200': { description: 'Success' } },
      };
    }
  }

  return JSON.stringify(spec, null, 2);
}

function generateTypeScriptTypes(discoveredEndpoints: Array<{
  pattern: string;
  requestSchema: unknown;
  responseSchemas: unknown;
}>): string {
  let types = '// Auto-generated TypeScript types\n\n';

  for (const discovered of discoveredEndpoints) {
    const typeName = discovered.pattern
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');

    if (discovered.requestSchema) {
      types += `export interface ${typeName}Request {\n`;
      types += generateTypeScriptFromSchema(discovered.requestSchema);
      types += '}\n\n';
    }

    if (discovered.responseSchemas) {
      const responseSchemas = discovered.responseSchemas as Record<string, unknown>;
      Object.entries(responseSchemas).forEach(([status, schema]) => {
        types += `export interface ${typeName}Response${status} {\n`;
        types += generateTypeScriptFromSchema(schema);
        types += '}\n\n';
      });
    }
  }

  return types;
}

function generateTypeScriptFromSchema(schema: unknown): string {
  if (!schema || typeof schema !== 'object') {
    return '  // Unknown type\n';
  }

    const schemaObj = schema as Record<string, unknown>;
    if (schemaObj.type === 'object' && schemaObj.properties) {
      const props = schemaObj.properties as Record<string, unknown>;
      const required = Array.isArray(schemaObj.required) ? schemaObj.required as string[] : [];
      let result = '';
      Object.entries(props).forEach(([key, value]) => {
        const propSchema = value as Record<string, unknown>;
        const optional = required.includes(key) ? '' : '?';
        const type = propSchema.type === 'string' ? 'string' :
                     propSchema.type === 'number' ? 'number' :
                     propSchema.type === 'boolean' ? 'boolean' :
                     propSchema.type === 'array' ? 'unknown[]' : 'unknown';
        result += `  ${key}${optional}: ${type};\n`;
      });
      return result;
    }

  return '  // Complex type\n';
}

