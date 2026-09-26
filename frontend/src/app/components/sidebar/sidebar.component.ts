import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Mobile Backdrop -->
    <div
      *ngIf="chatService.sidebarOpen()"
      (click)="chatService.toggleSidebar(false)"
      class="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 md:hidden transition-opacity"
    ></div>

    <!-- Sidebar Container -->
    <aside
      class="fixed md:static inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-docBorder flex flex-col transition-transform duration-300 ease-in-out shrink-0 h-full"
      [class.translate-x-0]="chatService.sidebarOpen()"
      [class.-translate-x-full]="!chatService.sidebarOpen()"
      [class.md:translate-x-0]="true"
    >
      <!-- Top Action: New Chat -->
      <div class="p-3 border-b border-docBorder flex items-center justify-between">
        <button
          (click)="onNewChat()"
          class="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover active:bg-blue-700 rounded-btn transition-colors shadow-sm cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          <span>New Topic</span>
        </button>

        <!-- Close button on mobile -->
        <button
          (click)="chatService.toggleSidebar(false)"
          class="md:hidden ml-2 p-1.5 text-docSecondary hover:text-docText rounded-btn transition-colors"
          aria-label="Close sidebar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Section Label -->
      <div class="px-4 pt-4 pb-2 text-[11px] font-semibold text-docSecondary uppercase tracking-wider">
        Clinical History
      </div>

      <!-- History List -->
      <div class="flex-1 overflow-y-auto px-2 space-y-1">
        <div *ngIf="chatService.conversations().length === 0" class="px-3 py-6 text-center text-xs text-docSecondary">
          No medical study history yet. Ask a question to begin.
        </div>

        <div
          *ngFor="let conv of chatService.conversations()"
          (click)="onSelectChat(conv.id)"
          class="group relative flex items-center justify-between px-3 py-2 text-xs md:text-sm rounded-btn transition-all duration-150 cursor-pointer"
          [ngClass]="{
            'bg-blue-50 text-primary font-medium border border-blue-100': chatService.activeConversation()?.id === conv.id,
            'text-gray-700 hover:bg-gray-100': chatService.activeConversation()?.id !== conv.id
          }"
        >
          <div class="flex items-center gap-2.5 truncate">
            <svg class="w-4 h-4 shrink-0 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
            <span class="truncate">{{ conv.title || 'Untitled Topic' }}</span>
          </div>

          <!-- Delete Action -->
          <button
            (click)="onDeleteChat($event, conv.id)"
            class="opacity-0 group-hover:opacity-100 hover:text-red-600 p-1 rounded transition-opacity"
            title="Delete consultation"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Bottom Clear History -->
      <div class="p-3 border-t border-docBorder bg-gray-50/50">
        <button
          *ngIf="chatService.conversations().length > 0"
          (click)="onClearAll()"
          class="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-docSecondary hover:text-red-600 hover:bg-red-50 rounded-btn transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span>Clear All History</span>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent {
  constructor(public chatService: ChatService, private router: Router) {}

  onNewChat(): void {
    this.chatService.createConversation();
    this.chatService.toggleSidebar(false);
    if (this.router.url !== '/chat') {
      this.router.navigate(['/chat']);
    }
  }

  onSelectChat(id: string): void {
    this.chatService.selectConversation(id);
    this.chatService.toggleSidebar(false);
    if (this.router.url !== '/chat') {
      this.router.navigate(['/chat']);
    }
  }

  onDeleteChat(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.chatService.deleteConversation(id);
  }

  onClearAll(): void {
    if (confirm('Are you sure you want to clear all consultation history?')) {
      this.chatService.clearAllConversations();
    }
  }
}
