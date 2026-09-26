import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, MEDICAL_SYSTEM_PROMPT } from './ai.provider.js';
import { ChatMessage, ChatResponse } from '../models/chat.js';

export class GeminiProvider implements AIProvider {
  name: 'gemini' = 'gemini';
  private client: GoogleGenerativeAI | null = null;

  constructor(apiKeyOverride?: string) {
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your_gemini_api_key_here') {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  async generateResponse(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Gemini API key is not configured');
    }

    // Try primary model (gemini-3.6-flash) then fallback to gemini-3.8-flash if demand spike occurs
    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const fallbackModel = preferredModel === 'gemini-3.6-flash' ? 'gemini-3.8-flash' : 'gemini-3.6-flash';
    const modelsToTry = [preferredModel, fallbackModel];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.client.getGenerativeModel({
          model: modelName,
          systemInstruction: MEDICAL_SYSTEM_PROMPT
        });

        const formattedHistory = history.map(item => ({
          role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.content }]
        }));

        const chat = model.startChat({
          history: formattedHistory
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini (${modelName}) request timed out after 30s`)), 30000);
        });

        const sendPromise = chat.sendMessage(message).then(result => {
          const responseText = result.response.text();
          return {
            provider: 'gemini' as const,
            content: responseText
          };
        });

        return await Promise.race([sendPromise, timeoutPromise]);
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiProvider] Model ${modelName} error:`, err?.message || err);
        // Continue loop to try next model
      }
    }

    throw lastError || new Error('All Gemini models failed');
  }
}
