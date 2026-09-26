import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ChatConversation, ChatMessage } from '../models/chat.model';

const STORAGE_KEY = 'docbord_conversations_v2';
const ACTIVE_CONV_KEY = 'docbord_active_conv_id';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatUrl = 'http://localhost:3000/api/chat';
  private imageUrl = 'http://localhost:3000/api/image';

  readonly conversations = signal<ChatConversation[]>([]);
  readonly activeConversation = signal<ChatConversation | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly sidebarOpen = signal<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  toggleSidebar(open?: boolean): void {
    if (typeof open === 'boolean') {
      this.sidebarOpen.set(open);
    } else {
      this.sidebarOpen.update(v => !v);
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed: ChatConversation[] = JSON.parse(data);
        this.conversations.set(parsed);
        const lastActiveId = localStorage.getItem(ACTIVE_CONV_KEY);
        const found = parsed.find(c => c.id === lastActiveId) || parsed[0] || null;
        this.activeConversation.set(found);
      }
    } catch (e) {
      console.error('Error loading conversations from localStorage', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.conversations()));
      const active = this.activeConversation();
      if (active) {
        localStorage.setItem(ACTIVE_CONV_KEY, active.id);
      }
    } catch (e) {
      console.error('Error saving conversations to localStorage', e);
    }
  }

  createConversation(initialTitle = 'New Medical Consultation'): ChatConversation {
    const newConv: ChatConversation = {
      id: 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: initialTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    this.conversations.update(list => [newConv, ...list]);
    this.activeConversation.set(newConv);
    this.saveToStorage();
    return newConv;
  }

  selectConversation(id: string): void {
    const found = this.conversations().find(c => c.id === id);
    if (found) {
      this.activeConversation.set(found);
      localStorage.setItem(ACTIVE_CONV_KEY, found.id);
    }
  }

  deleteConversation(id: string): void {
    this.conversations.update(list => list.filter(c => c.id !== id));
    if (this.activeConversation()?.id === id) {
      const remaining = this.conversations();
      this.activeConversation.set(remaining[0] || null);
    }
    this.saveToStorage();
  }

  clearAllConversations(): void {
    this.conversations.set([]);
    this.activeConversation.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CONV_KEY);
  }

  // Detect whether the query is asking for an image/diagram
  isImageQuery(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.startsWith('draw') ||
      lower.startsWith('show') ||
      lower.startsWith('generate anatomy') ||
      lower.startsWith('illustrate') ||
      lower.includes('with image') ||
      lower.includes('with images') ||
      lower.includes('show diagram') ||
      lower.includes('draw diagram') ||
      lower.includes('diagram of')
    );
  }

  async requestImageIllustration(prompt: string): Promise<void> {
    await this.sendMessage(`Draw the ${prompt}`);
  }

  async sendMessage(userText: string): Promise<void> {
    if (!userText.trim() || this.isLoading()) return;

    let currentConv = this.activeConversation();
    if (!currentConv) {
      const summary = userText.trim().slice(0, 30);
      currentConv = this.createConversation(summary);
    } else if (currentConv.messages.length === 0) {
      currentConv.title = userText.trim().slice(0, 30);
    }

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      type: 'text',
      content: userText.trim(),
      timestamp: Date.now()
    };

    currentConv.messages.push(userMessage);
    currentConv.updatedAt = Date.now();
    this.activeConversation.set({ ...currentConv });
    this.saveToStorage();

    this.isLoading.set(true);

    try {
      const needsImage = this.isImageQuery(userText);

      if (needsImage) {
        // Call Image Generation Endpoint
        const imgRes = await firstValueFrom(
          this.http.post<{ type: 'image'; imageUrl: string; caption: string; enhancedPrompt: string }>(this.imageUrl, {
            prompt: userText.trim()
          })
        );

        const aiImageMessage: ChatMessage = {
          id: 'msg_img_' + Date.now(),
          role: 'assistant',
          type: 'image',
          imageUrl: imgRes.imageUrl,
          imageCaption: imgRes.caption,
          enhancedPrompt: imgRes.enhancedPrompt,
          content: `### ${imgRes.caption}\n\n*Medical illustration generated via Google Imagen / Gemini visual synthesis.*`,
          provider: 'gemini',
          timestamp: Date.now()
        };

        currentConv.messages.push(aiImageMessage);
      } else {
        // Normal Text Chat Endpoint
        const history = currentConv.messages.slice(0, -1).map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content || ''
        }));

        const textRes = await firstValueFrom(
          this.http.post<{ type: 'text'; content: string; source?: string; citations?: string }>(this.chatUrl, {
            message: userText.trim(),
            history
          })
        );

        const aiTextMessage: ChatMessage = {
          id: 'msg_ai_' + Date.now(),
          role: 'assistant',
          type: 'text',
          content: textRes.content,
          source: textRes.source,
          citations: textRes.citations,
          provider: 'gemini',
          timestamp: Date.now()
        };

        currentConv.messages.push(aiTextMessage);
      }

      currentConv.updatedAt = Date.now();
      this.activeConversation.set({ ...currentConv });
      this.saveToStorage();
    } catch (error: any) {
      console.error('Error processing chat query:', error);
      const errorMessage: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        type: 'text',
        content: `# Consultation Note\n\n## Simple Definition\nCould not process the request at this moment.\n\n## Why it Matters\n- Check connection to http://localhost:3000.\n- Verify GEMINI_API_KEY in backend/.env.`,
        provider: 'fallback',
        timestamp: Date.now()
      };
      currentConv.messages.push(errorMessage);
      this.activeConversation.set({ ...currentConv });
      this.saveToStorage();
    } finally {
      this.isLoading.set(false);
    }
  }
}
