import { Component, Input, OnInit, AfterViewInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { ChatMessage } from '../../models/chat.model';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- User Message -->
    <div *ngIf="message.role === 'user'" class="flex justify-end mb-6">
      <div class="max-w-[85%] sm:max-w-[75%] md:max-w-[65%] bg-primary text-white px-5 py-3.5 rounded-[20px] rounded-br-[4px] shadow-sm text-sm md:text-base leading-relaxed break-words">
        {{ message.content }}
      </div>
    </div>

    <!-- AI Message (White card with soft border, 20px radius) -->
    <div *ngIf="message.role === 'assistant'" class="flex justify-start mb-6">
      <div class="w-full max-w-[100%] bg-surface border border-docBorder rounded-[20px] p-5 sm:p-7 shadow-soft text-docText transition-all">
        
        <!-- Header Bar: Provider badge and copy / download button -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg bg-blue-50 text-primary flex items-center justify-center font-bold text-xs">
              +
            </div>
            <span class="text-xs font-semibold text-gray-700">DocBord Medical AI</span>
            
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              GEMINI AI
            </span>

            <span *ngIf="message.source" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1" [title]="message.source">
              <svg class="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <span>HYBRID RAG (TEXTBOOK VERIFIED)</span>
            </span>

            <span *ngIf="message.type === 'image'" class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-primary border border-blue-200">
              IMAGEN 4 / VECTOR
            </span>
          </div>

          <div class="flex items-center gap-1.5">
            <!-- Download Image Button if this message has an image -->
            <button
              *ngIf="message.imageUrl"
              (click)="downloadImage()"
              class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer font-medium"
              title="Download educational diagram"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span>Download Image</span>
            </button>

            <!-- Copy Text Button -->
            <button
              (click)="copyContent()"
              class="inline-flex items-center gap-1 text-xs text-docSecondary hover:text-docText px-2 py-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              title="Copy notes"
            >
              <svg *ngIf="!copied" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <svg *ngIf="copied" class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span>{{ copied ? 'Copied' : 'Copy' }}</span>
            </button>
          </div>
        </div>

        <!-- Rendered Text Content Container -->
        <div *ngIf="message.content" #contentContainer class="markdown-body">
          <div [innerHTML]="parsedHtml"></div>
        </div>

        <!-- Image Display (if message has an image) -->
        <div *ngIf="message.imageUrl" class="mt-4 pt-3 border-t border-gray-100 flex flex-col items-center">
          <div class="relative w-full max-w-lg rounded-[20px] overflow-hidden border border-docBorder shadow-soft bg-white p-2">
            <img
              [src]="message.imageUrl"
              [alt]="message.imageCaption || 'Medical educational diagram'"
              class="w-full h-auto rounded-[16px] object-contain transition-transform hover:scale-[1.01]"
              loading="lazy"
            />
          </div>
          <p *ngIf="message.imageCaption" class="mt-2 text-xs text-docSecondary font-medium text-center">
            {{ message.imageCaption }}
          </p>
        </div>

        <!-- Quick Action: Generate Diagram for this topic if currently text -->
        <div *ngIf="message.type !== 'image' && extractedTopic" class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-docSecondary">Need a visual atlas of this concept?</span>
          <button
            (click)="generateVisualDiagram()"
            [disabled]="chatService.isLoading()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-blue-50 hover:bg-blue-100 rounded-btn transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <span>Draw Medical Diagram</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class MessageBubbleComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() message!: ChatMessage;
  @ViewChild('contentContainer') contentContainer!: ElementRef<HTMLDivElement>;

  parsedHtml = '';
  copied = false;
  extractedTopic = '';
  private mermaidInitialized = false;

  constructor(public chatService: ChatService) {}

  ngOnInit(): void {
    this.renderMarkdown();
    this.extractTopicFromContent();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.renderMarkdown();
      this.extractTopicFromContent();
      setTimeout(() => this.renderMermaidDiagrams(), 50);
    }
  }

  ngAfterViewInit(): void {
    this.renderMermaidDiagrams();
  }

  private extractTopicFromContent(): void {
    if (!this.message?.content) return;
    const match = this.message.content.match(/^#\s+(.+)$/m);
    if (match && match[1]) {
      this.extractedTopic = match[1].trim();
    }
  }

  generateVisualDiagram(): void {
    if (!this.extractedTopic) return;
    this.chatService.sendMessage(`Draw the ${this.extractedTopic}`);
  }

  downloadImage(): void {
    if (!this.message?.imageUrl) return;
    const link = document.createElement('a');
    link.href = this.message.imageUrl;
    const filename = (this.message.imageCaption || 'DocBord_Diagram').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private renderMarkdown(): void {
    if (!this.message || !this.message.content) {
      this.parsedHtml = '';
      return;
    }

    marked.setOptions({
      breaks: true,
      gfm: true
    });

    try {
      let raw = this.message.content;
      const mermaidRegex = /```mermaid\s*([\s\S]*?)\s*```/g;
      const processed = raw.replace(mermaidRegex, (_match, code) => {
        const uniqueId = 'mermaid-' + Math.random().toString(36).substring(2, 9);
        return `<div class="mermaid-container" id="${uniqueId}"><pre class="mermaid">${code.trim()}</pre></div>`;
      });

      this.parsedHtml = marked.parse(processed) as string;
    } catch (e) {
      console.error('Failed to parse markdown', e);
      this.parsedHtml = this.message.content;
    }
  }

  private async renderMermaidDiagrams(): Promise<void> {
    if (!this.contentContainer) return;

    const mermaidNodes = this.contentContainer.nativeElement.querySelectorAll('.mermaid');
    if (!mermaidNodes || mermaidNodes.length === 0) return;

    try {
      if (!this.mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: {
            primaryColor: '#EFF6FF',
            primaryTextColor: '#1E3A8A',
            primaryBorderColor: '#3B82F6',
            lineColor: '#6B7280',
            secondaryColor: '#F8FAFC',
            tertiaryColor: '#FFFFFF'
          }
        });
        this.mermaidInitialized = true;
      }

      await mermaid.run({
        nodes: mermaidNodes as any
      });
    } catch (err) {
      console.warn('Mermaid rendering notice:', err);
    }
  }

  copyContent(): void {
    const textToCopy = this.message?.content || this.message?.imageCaption || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }
}
