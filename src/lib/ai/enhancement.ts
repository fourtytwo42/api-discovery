import { generateCompletion } from './groq-client';
import {
  generateEndpointDescriptionPrompt,
  generateParameterDescriptionPrompt,
  generateFieldDescriptionPrompt,
} from './prompts';

export async function enhanceEndpointWithAI(
  pattern: string,
  methods: string[],
  requestSchema?: unknown,
  responseSchemas?: Record<string, unknown>
): Promise<string> {
  try {
    const prompt = generateEndpointDescriptionPrompt(pattern, methods, requestSchema, responseSchemas);
    const description = await generateCompletion({ prompt });
    return description.trim();
  } catch (error) {
    // Fallback to programmatic description
    return generateProgrammaticDescription(pattern, methods);
  }
}

export async function enhanceParameterWithAI(
  parameterName: string,
  parameterType: string,
  context: string
): Promise<string> {
  try {
    const prompt = generateParameterDescriptionPrompt(parameterName, parameterType, context);
    const description = await generateCompletion({ prompt });
    return description.trim();
  } catch (error) {
    return `${parameterName} (${parameterType})`;
  }
}

export async function enhanceFieldWithAI(
  fieldName: string,
  fieldType: string,
  context: string
): Promise<string> {
  try {
    const prompt = generateFieldDescriptionPrompt(fieldName, fieldType, context);
    const description = await generateCompletion({ prompt });
    return description.trim();
  } catch (error) {
    return `${fieldName} (${fieldType})`;
  }
}

function generateProgrammaticDescription(pattern: string, methods: string[]): string {
  const methodStr = methods.join(', ');
  const pathParts = pattern.split('/').filter(Boolean);
  const resource = pathParts[pathParts.length - 1] || 'resource';
  
  if (methods.includes('GET') && pattern.includes(':id')) {
    return `Retrieves a specific ${resource} by ID using ${methodStr} method.`;
  }
  if (methods.includes('POST')) {
    return `Creates a new ${resource} using ${methodStr} method.`;
  }
  if (methods.includes('PUT') || methods.includes('PATCH')) {
    return `Updates an existing ${resource} using ${methodStr} method.`;
  }
  if (methods.includes('DELETE')) {
    return `Deletes a ${resource} using ${methodStr} method.`;
  }
  
  return `API endpoint for ${resource} operations using ${methodStr} method.`;
}

