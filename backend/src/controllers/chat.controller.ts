import { Request, Response } from 'express';
import { GeminiTextService } from '../providers/gemini-text.service.js';
import { GeminiImageService } from '../providers/gemini-image.service.js';
import { ragClientService } from '../providers/rag-client.service.js';

const geminiTextService = new GeminiTextService();
const geminiImageService = new GeminiImageService();

export async function handleChatMessage(req: Request, res: Response) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const trimmed = message.trim();
    console.log(`[DocBord Backend] /api/chat received: "${trimmed}"`);

    // Route query through the Hybrid RAG Medical Learning Engine
    try {
      const ragResult = await ragClientService.queryRag(trimmed, history);
      return res.json(ragResult);
    } catch (ragError: any) {
      console.warn('[DocBord Backend] RAG Engine query notice, attempting fallback service:', ragError?.message);
      const fallbackResult = await geminiTextService.generateText(trimmed, history);
      return res.json(fallbackResult);
    }
  } catch (error: any) {
    console.error('[DocBord Backend] Chat handler error:', error);
    return res.status(500).json({
      type: 'text',
      error: 'Internal server error',
      details: error?.message
    });
  }
}

export async function handleImageMessage(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const trimmed = prompt.trim();
    console.log(`[DocBord Backend] /api/image received: "${trimmed}"`);

    const result = await geminiImageService.generateImage(trimmed);
    return res.json(result);
  } catch (error: any) {
    console.error('[DocBord Backend] Image handler error:', error);
    return res.status(500).json({
      type: 'image',
      error: 'Internal server error',
      details: error?.message
    });
  }
}

export function handleHealthCheck(_req: Request, res: Response) {
  res.json({
    status: 'ok',
    service: 'DocBord Gemini Medical AI API',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0)
  });
}
