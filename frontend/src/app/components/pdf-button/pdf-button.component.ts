import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfExportService } from '../../services/pdf-export.service';
import { ChatConversation } from '../../models/chat.model';

@Component({
  selector: 'app-pdf-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="exportPdf()"
      [disabled]="isExporting() || !conversation || conversation.messages.length === 0"
      class="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 active:bg-gray-100 border border-docBorder rounded-btn shadow-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      title="Export study notes to PDF"
    >
      <svg *ngIf="!isExporting()" class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <svg *ngIf="isExporting()" class="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{{ isExporting() ? 'Exporting...' : 'Export PDF' }}</span>
    </button>
  `
})
export class PdfButtonComponent {
  @Input() conversation: ChatConversation | null = null;
  readonly isExporting = signal<boolean>(false);

  constructor(private pdfService: PdfExportService) {}

  async exportPdf(): Promise<void> {
    if (!this.conversation || this.conversation.messages.length === 0 || this.isExporting()) return;

    this.isExporting.set(true);
    try {
      await this.pdfService.exportConversationToPdf(this.conversation);
    } catch (err) {
      console.error('Failed to export PDF', err);
    } finally {
      this.isExporting.set(false);
    }
  }
}
