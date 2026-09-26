import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { MessageBubbleComponent } from '../../components/message-bubble/message-bubble.component';
import { InputBarComponent } from '../../components/input-bar/input-bar.component';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, SidebarComponent, MessageBubbleComponent, InputBarComponent],
  template: `
    <div class="flex h-[calc(100vh-65px)] overflow-hidden bg-background">
      
      <!-- Left Sidebar (240px on desktop, drawer on mobile) -->
      <app-sidebar></app-sidebar>

      <!-- Main Chat Area -->
      <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        
        <!-- Messages Scroll Container -->
        <div #scrollContainer class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 scroll-smooth">
          <div class="max-w-4xl mx-auto w-full">
            
            <!-- Empty state if conversation is brand new -->
            <div
              *ngIf="!chatService.activeConversation() || chatService.activeConversation()?.messages?.length === 0"
              class="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 space-y-4"
            >
              <div class="w-14 h-14 rounded-2xl bg-blue-50 text-primary flex items-center justify-center text-2xl font-bold shadow-soft">
                +
              </div>
              <h2 class="text-xl sm:text-2xl font-bold text-docText">What would you like to master today?</h2>
              <p class="text-sm text-docSecondary max-w-md">
                Ask about any anatomical structure, physiological regulation, drug mechanism, or clinical case vignette.
              </p>
            </div>

            <!-- Messages list -->
            <div *ngIf="chatService.activeConversation() && chatService.activeConversation()!.messages.length > 0">
              <app-message-bubble
                *ngFor="let msg of chatService.activeConversation()!.messages"
                [message]="msg"
              ></app-message-bubble>
            </div>

            <!-- Loading indicator when AI is generating -->
            <div *ngIf="chatService.isLoading()" class="flex justify-start mb-6">
              <div class="bg-white border border-docBorder rounded-[20px] px-6 py-5 shadow-soft flex items-center gap-3">
                <div class="flex space-x-1.5">
                  <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                  <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                  <div class="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
                <span class="text-xs sm:text-sm text-docSecondary font-medium">DocBord is formulating clinical response & diagrams...</span>
              </div>
            </div>

          </div>
        </div>

        <!-- Sticky Bottom Input Bar with beside PDF button -->
        <app-input-bar (querySubmit)="onQuerySent()"></app-input-bar>

      </main>

    </div>
  `
})
export class ChatPageComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  private shouldScroll = false;

  constructor(public chatService: ChatService) {}

  onQuerySent(): void {
    this.shouldScroll = true;
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.warn('Scroll error', err);
    }
  }
}
