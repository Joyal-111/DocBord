export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type?: 'text' | 'image';
  content?: string;
  imageUrl?: string;
  imageCaption?: string;
  enhancedPrompt?: string;
  provider?: 'gemini' | 'openai' | 'fallback';
  source?: string;
  citations?: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface CategoryChip {
  name: string;
  query: string;
  icon?: string;
  description: string;
}
