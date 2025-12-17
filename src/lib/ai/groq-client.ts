import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
// Groq GPT OSS 20B supports up to 8192 tokens context window
// Default to 2000 for general use, but can be overridden up to 8000 for documentation generation
const GROQ_MAX_TOKENS = parseInt(process.env.GROQ_MAX_TOKENS || '2000', 10);
const GROQ_TEMPERATURE = parseFloat(process.env.GROQ_TEMPERATURE || '0.3');

export interface GroqCompletionOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function generateCompletion(
  options: GroqCompletionOptions
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: options.model || GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || GROQ_MAX_TOKENS,
      temperature: options.temperature ?? GROQ_TEMPERATURE,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in Groq response');
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API error: ${error.message}`);
    }
    throw new Error('Unknown error calling Groq API');
  }
}

export async function generateDescription(
  context: string,
  item: string
): Promise<string> {
  const prompt = `Generate a concise, technical description for the following API ${item}:

Context: ${context}

${item}:

Provide a clear, professional description in 1-2 sentences that explains what this ${item} does.`;

  return generateCompletion({ prompt });
}

