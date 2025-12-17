export function generateEndpointDescriptionPrompt(
  pattern: string,
  methods: string[],
  requestSchema?: unknown,
  responseSchemas?: Record<string, unknown>
): string {
  return `Generate a concise, technical description for this API endpoint:

Endpoint Pattern: ${pattern}
HTTP Methods: ${methods.join(', ')}

${requestSchema ? `Request Schema: ${JSON.stringify(requestSchema, null, 2)}` : 'No request body'}

${responseSchemas ? `Response Schemas: ${JSON.stringify(responseSchemas, null, 2)}` : 'No response schemas'}

Provide a clear, professional description in 1-2 sentences that explains what this endpoint does, what it's used for, and what data it handles.`;
}

export function generateParameterDescriptionPrompt(
  parameterName: string,
  parameterType: string,
  context: string
): string {
  return `Generate a brief description for this API parameter:

Parameter: ${parameterName}
Type: ${parameterType}
Context: ${context}

Provide a concise description (one sentence) explaining what this parameter is used for.`;
}

export function generateFieldDescriptionPrompt(
  fieldName: string,
  fieldType: string,
  context: string
): string {
  return `Generate a brief description for this API field:

Field: ${fieldName}
Type: ${fieldType}
Context: ${context}

Provide a concise description (one sentence) explaining what this field represents.`;
}

