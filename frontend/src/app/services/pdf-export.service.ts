import { Injectable } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ChatConversation } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  async exportConversationToPdf(conversation: ChatConversation): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595.28; // A4 standard width in points
    const pageHeight = 841.89; // A4 standard height in points
    const margin = 45;
    const contentWidth = pageWidth - margin * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const checkPageBreak = (neededSpace: number) => {
      if (y - neededSpace < margin + 30) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    // Header Branding
    page.drawText('DocBord', {
      x: margin,
      y,
      size: 20,
      font: helveticaBold,
      color: rgb(0.145, 0.388, 0.921) // #2563EB
    });

    page.drawText('Medical AI Study Notes', {
      x: margin + 95,
      y: y + 2,
      size: 11,
      font: helveticaOblique,
      color: rgb(0.42, 0.45, 0.5)
    });

    const dateStr = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const dateWidth = helvetica.widthOfTextAtSize(dateStr, 9);
    page.drawText(dateStr, {
      x: pageWidth - margin - dateWidth,
      y: y + 2,
      size: 9,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    y -= 14;
    // Horizontal divider
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.9, 0.9, 0.92)
    });
    y -= 25;

    // Title of Topic
    page.drawText(`Topic: ${conversation.title || 'Medical Clinical Study'}`, {
      x: margin,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.07, 0.1, 0.15)
    });
    y -= 20;

    // Loop through messages
    for (const msg of conversation.messages) {
      if (msg.role === 'user') {
        checkPageBreak(40);
        // Draw user question box background
        page.drawRectangle({
          x: margin,
          y: y - 18,
          width: contentWidth,
          height: 26,
          color: rgb(0.93, 0.96, 1.0),
          borderColor: rgb(0.8, 0.88, 1.0),
          borderWidth: 0.8
        });

        page.drawText(`Q: ${msg.content}`, {
          x: margin + 10,
          y: y - 10,
          size: 11,
          font: helveticaBold,
          color: rgb(0.12, 0.3, 0.7)
        });
        y -= 38;
      } else {
        // AI Response (Text or Diagram Image)
        if (msg.imageUrl) {
          checkPageBreak(180);
          try {
            if (msg.imageUrl.startsWith('data:image/png;base64,')) {
              const base64Data = msg.imageUrl.replace('data:image/png;base64,', '');
              const binaryStr = atob(base64Data);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              const embedded = await pdfDoc.embedPng(bytes);
              const scaled = embedded.scaleToFit(contentWidth - 20, 160);
              page.drawImage(embedded, {
                x: margin + 10,
                y: y - scaled.height,
                width: scaled.width,
                height: scaled.height
              });
              y -= scaled.height + 15;
            } else {
              // Diagram Box representation
              page.drawRectangle({
                x: margin,
                y: y - 36,
                width: contentWidth,
                height: 36,
                color: rgb(0.95, 0.97, 1.0),
                borderColor: rgb(0.3, 0.5, 0.9),
                borderWidth: 1
              });
              page.drawText(`[Medical Illustration: ${msg.imageCaption || 'Clinical Atlas Diagram'}]`, {
                x: margin + 12,
                y: y - 22,
                size: 10,
                font: helveticaBold,
                color: rgb(0.145, 0.388, 0.921)
              });
              y -= 48;
            }
          } catch (e) {
            console.warn('PDF image rendering notice:', e);
          }
        }

        const lines = (msg.content || '').split('\n');
        for (const rawLine of lines) {
          const line = rawLine.trimEnd();
          if (!line) {
            y -= 8;
            continue;
          }

          if (line.startsWith('# ')) {
            checkPageBreak(30);
            y -= 8;
            page.drawText(line.replace('# ', ''), {
              x: margin,
              y,
              size: 14,
              font: helveticaBold,
              color: rgb(0.1, 0.15, 0.25)
            });
            y -= 16;
          } else if (line.startsWith('## ')) {
            checkPageBreak(25);
            y -= 6;
            const subtitle = line.replace('## ', '');
            page.drawText(subtitle, {
              x: margin,
              y,
              size: 12,
              font: helveticaBold,
              color: rgb(0.145, 0.388, 0.921)
            });
            y -= 14;
          } else if (line.startsWith('```mermaid') || line.startsWith('```')) {
            checkPageBreak(20);
            page.drawText('[Diagram Flowchart / Clinical Schema]', {
              x: margin + 8,
              y,
              size: 9,
              font: helveticaOblique,
              color: rgb(0.4, 0.45, 0.5)
            });
            y -= 12;
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const bulletText = line.substring(2);
            this.drawWrappedText(page, bulletText, margin + 12, y, contentWidth - 12, helvetica, 10, checkPageBreak, (newY) => (y = newY), '• ');
          } else {
            this.drawWrappedText(page, line, margin, y, contentWidth, helvetica, 10, checkPageBreak, (newY) => (y = newY));
          }
        }
        y -= 18;
      }
    }

    // Add page numbers
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      const footerText = `Page ${i + 1} of ${totalPages} — DocBord Medical Study Notes`;
      const fWidth = helvetica.widthOfTextAtSize(footerText, 8);
      p.drawText(footerText, {
        x: (pageWidth - fWidth) / 2,
        y: 20,
        size: 8,
        font: helvetica,
        color: rgb(0.6, 0.63, 0.68)
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DocBord_Study_Notes.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private drawWrappedText(
    page: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    font: any,
    fontSize: number,
    checkPageBreak: (needed: number) => void,
    updateY: (y: number) => void,
    prefix = ''
  ): void {
    const words = text.split(' ');
    let currentLine = prefix;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > maxWidth && currentLine.length > prefix.length) {
        checkPageBreak(fontSize + 4);
        page.drawText(currentLine, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.15, 0.18, 0.22)
        });
        y -= fontSize + 4;
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      checkPageBreak(fontSize + 4);
      page.drawText(currentLine, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.18, 0.22)
      });
      y -= fontSize + 5;
    }

    updateY(y);
  }
}
