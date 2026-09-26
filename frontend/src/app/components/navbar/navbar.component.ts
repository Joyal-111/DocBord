import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { PdfButtonComponent } from '../pdf-button/pdf-button.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, PdfButtonComponent],
  template: `
    <header class="sticky top-0 z-30 w-full bg-white/85 backdrop-blur-md border-b border-docBorder px-4 lg:px-8 py-3 transition-colors">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        
        <!-- Left: Mobile Menu Toggle & Brand Logo -->
        <div class="flex items-center gap-3">
          <!-- Mobile Drawer Hamburger -->
          <button
            (click)="chatService.toggleSidebar()"
            class="md:hidden p-2 text-docSecondary hover:text-docText hover:bg-gray-100 rounded-btn transition-colors"
            aria-label="Toggle Navigation Drawer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2.5 group cursor-pointer">
            <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform duration-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div class="flex flex-col">
              <span class="font-bold text-lg tracking-tight text-docText leading-none">DocBord</span>
              <span class="text-[10px] font-medium text-docSecondary uppercase tracking-wider">Medical AI Tutor</span>
            </div>
          </a>
        </div>

        <!-- Center: Subtle Tagline on Desktop -->
        <div class="hidden lg:flex items-center gap-2 text-xs text-docSecondary font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Understand Medicine, Not Memorize It</span>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2 sm:gap-3">
          <!-- New Chat Button -->
          <button
            (click)="startNewChat()"
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs md:text-sm font-medium text-primary hover:bg-primary-light active:bg-blue-100 border border-blue-200 rounded-btn transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>New Chat</span>
          </button>

          <!-- PDF Export Button -->
          <app-pdf-button [conversation]="chatService.activeConversation()"></app-pdf-button>
        </div>

      </div>
    </header>
  `
})
export class NavbarComponent {
  constructor(public chatService: ChatService, private router: Router) {}

  startNewChat(): void {
    this.chatService.createConversation();
    if (this.router.url !== '/chat') {
      this.router.navigate(['/chat']);
    }
  }
}
