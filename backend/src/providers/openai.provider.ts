import OpenAI from 'openai';
import { AIProvider, MEDICAL_SYSTEM_PROMPT } from './ai.provider.js';
import { ChatMessage, ChatResponse } from '../models/chat.js';

export class OpenAIProvider implements AIProvider {
  name: 'openai' = 'openai';
  private client: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your_openai_api_key_here') {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateResponse(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('OpenAI API key is not configured');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: MEDICAL_SYSTEM_PROMPT },
      ...history.map(item => ({
        role: item.role === 'model' ? ('assistant' as const) : (item.role as 'user' | 'assistant'),
        content: item.content
      })),
      { role: 'user', content: message }
    ];

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI request timed out after 12s')), 12000);
    });

    // Try gpt-4o-mini (or custom model if configured)
    const requestPromise = this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.2
    }).then(completion => {
      const content = completion.choices[0]?.message?.content || 'No response generated.';
      return {
        provider: 'openai' as const,
        content
      };
    });

    return await Promise.race([requestPromise, timeoutPromise]);
  }
}
