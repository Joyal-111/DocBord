import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { PdfButtonComponent } from '../pdf-button/pdf-button.component';

@Component({
  selector: 'app-input-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfButtonComponent],
  template: `
    <div class="sticky bottom-0 z-20 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-4 pb-4 px-4 sm:px-6">
      <div class="max-w-4xl mx-auto">
        
        <!-- Category Suggestions / Quick Chips (if empty or active) -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-1 text-xs">
          <span class="text-docSecondary shrink-0 font-medium">Quick Topics:</span>
          <button
            *ngFor="let chip of quickChips"
            (click)="selectChip(chip)"
            class="shrink-0 px-2.5 py-1 bg-white hover:bg-blue-50 text-gray-700 hover:text-primary border border-docBorder rounded-full transition-colors cursor-pointer"
          >
            {{ chip }}
          </button>
        </div>

        <!-- Input Box & Buttons Container -->
        <form (ngSubmit)="onSubmit()" class="relative flex items-center bg-white border border-docBorder focus-within:border-primary focus-within:ring-2 focus-within:ring-blue-100 rounded-[16px] shadow-soft transition-all p-1.5 sm:p-2">
          
          <!-- Textarea / Input -->
          <textarea
            [(ngModel)]="query"
            name="query"
            (keydown.enter)="onEnterKey($event)"
            placeholder="Ask any medical topic (e.g. 'Explain nephron' or 'Action potential')..."
            rows="1"
            class="flex-1 resize-none bg-transparent px-3 py-2 text-sm sm:text-base text-docText placeholder:text-gray-400 focus:outline-none max-h-32 min-h-[44px]"
            [disabled]="chatService.isLoading()"
          ></textarea>

          <!-- Action buttons beside input -->
          <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <!-- PDF Export Button beside input -->
            <app-pdf-button [conversation]="chatService.activeConversation()"></app-pdf-button>

            <!-- Send / Ask AI Button (14px radius) -->
            <button
              type="submit"
              [disabled]="!query.trim() || chatService.isLoading()"
              class="inline-flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary-hover active:bg-blue-700 text-white rounded-[14px] shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Send question"
            >
              <svg *ngIf="!chatService.isLoading()" class="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
              <svg *ngIf="chatService.isLoading()" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </button>
          </div>

        </form>

        <!-- Subtle bottom disclaimer -->
        <div class="text-center pt-2 text-[11px] text-docSecondary">
          DocBord provides high-yield study explanations with Mermaid diagrams. Verify with authoritative clinical textbooks.
        </div>

      </div>
    </div>
  `
})
export class InputBarComponent {
  query = '';
  @Output() querySubmit = new EventEmitter<string>();

  quickChips = [
    'Draw the nephron',
    'Draw the heart',
    'Explain nephron',
    'Cardiac cycle & valves',
    'Pharmacokinetics ADME'
  ];

  constructor(public chatService: ChatService) {}

  selectChip(chip: string): void {
    this.query = chip;
    this.onSubmit();
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (!this.query.trim() || this.chatService.isLoading()) return;
    const text = this.query.trim();
    this.query = '';
    this.querySubmit.emit(text);
    this.chatService.sendMessage(text);
  }
}
