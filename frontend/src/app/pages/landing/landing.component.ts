import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-65px)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden bg-background">
      
      <!-- Subtle Background Aura -->
      <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-blue-100/60 to-transparent blur-3xl pointer-events-none rounded-full"></div>

      <div class="max-w-3xl w-full text-center relative z-10 space-y-8">
        
        <!-- Badge / Logo Icon -->
        <div class="inline-flex items-center gap-2.5 px-4 py-2 bg-white border border-docBorder rounded-full shadow-soft mb-2">
          <div class="w-5 h-5 rounded-md bg-primary flex items-center justify-center text-white text-xs font-bold">
            +
          </div>
          <span class="text-xs font-semibold text-gray-700 tracking-wide">DocBord Medical Intelligence</span>
        </div>

        <!-- Hero Title -->
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-docText tracking-tight leading-[1.15]">
          Understand Medicine, <br class="hidden sm:inline" />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-700">Not Memorize It</span>
        </h1>

        <!-- Subtitle -->
        <p class="text-base sm:text-lg md:text-xl text-docSecondary max-w-2xl mx-auto font-normal leading-relaxed">
          The distraction-free AI study companion for medical students. Structured clinical breakdowns, board-yield mnemonics, and automatic Mermaid diagrams.
        </p>

        <!-- Large Centered Search Box -->
        <div class="max-w-2xl mx-auto pt-4">
          <form (ngSubmit)="onAsk()" class="relative flex items-center bg-white border-2 border-gray-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-blue-100 rounded-[20px] shadow-soft-lg p-2 transition-all duration-200">
            <div class="pl-3 text-gray-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            
            <input
              type="text"
              [(ngModel)]="searchQuery"
              name="searchQuery"
              placeholder="Search or ask anything (e.g. 'Explain nephron', 'Heart cycle')..."
              class="w-full bg-transparent px-3 py-3 text-base sm:text-lg text-docText placeholder:text-gray-400 focus:outline-none"
              autocomplete="off"
            />

            <!-- Ask AI Button (14px radius) -->
            <button
              type="submit"
              [disabled]="!searchQuery.trim()"
              class="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white font-semibold text-sm sm:text-base rounded-btn shadow-md shadow-blue-500/20 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              <span>Ask AI</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </form>
        </div>

        <!-- Four Category Chips -->
        <div class="pt-4">
          <div class="text-xs font-semibold text-docSecondary uppercase tracking-wider mb-3">
            High-Yield Medical Disciplines
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
            <button
              *ngFor="let cat of categories"
              (click)="onSelectCategory(cat)"
              class="flex flex-col items-center justify-center p-3.5 bg-white hover:bg-blue-50/60 border border-docBorder hover:border-blue-300 rounded-[16px] shadow-soft transition-all duration-200 group text-left cursor-pointer"
            >
              <div class="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center mb-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="cat.icon"></path>
                </svg>
              </div>
              <span class="text-sm font-semibold text-docText group-hover:text-primary transition-colors">{{ cat.name }}</span>
              <span class="text-[11px] text-docSecondary text-center mt-0.5">{{ cat.description }}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  `
})
export class LandingComponent {
  searchQuery = '';

  categories = [
    {
      name: 'Anatomy',
      description: 'Structures & pathways',
      query: 'Explain the functional anatomy of the nephron and renal vascular supply',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
    },
    {
      name: 'Physiology',
      description: 'Systems & loops',
      query: 'Explain cardiac conduction system and ventricular action potential',
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
    },
    {
      name: 'Pharmacology',
      description: 'Drugs & mechanisms',
      query: 'Explain pharmacokinetics ADME and cytochrome P450 interactions',
      icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'
    },
    {
      name: 'Pathology',
      description: 'Diseases & cellular changes',
      query: 'Explain acute inflammation cellular events and neutrophil recruitment',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
    }
  ];

  constructor(private router: Router, private chatService: ChatService) {}

  onAsk(): void {
    if (!this.searchQuery.trim()) return;
    const query = this.searchQuery.trim();
    this.searchQuery = '';
    const conv = this.chatService.createConversation(query.slice(0, 30));
    this.router.navigate(['/chat']).then(() => {
      this.chatService.sendMessage(query);
    });
  }

  onSelectCategory(cat: { query: string }): void {
    const conv = this.chatService.createConversation(cat.query.slice(0, 30));
    this.router.navigate(['/chat']).then(() => {
      this.chatService.sendMessage(cat.query);
    });
  }
}
