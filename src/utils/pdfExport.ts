/**
 * PDF Export Utility
 *
 * Exports markdown content to PDF using jsPDF's native text rendering.
 * This produces small, searchable PDFs with selectable text.
 *
 * Unlike html2canvas approach (which creates image-based PDFs of 30+ MB),
 * this renders text as vectors, resulting in ~100-200 KB files.
 */

import jsPDF from 'jspdf';

interface PdfExportOptions {
  filename: string;
  title?: string;
}

/**
 * Sanitize text for PDF rendering.
 * Removes invisible Unicode characters that jsPDF can't handle.
 */
function sanitizeText(text: string): string {
  return text
    // Remove zero-width characters
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, '')
    // Normalize spaces (non-breaking space to regular)
    .replace(/\u00A0/g, ' ')
    // Smart quotes to ASCII
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Arrows to ASCII
    .replace(/[→➔➜►▶]/g, '->')
    .replace(/[←]/g, '<-')
    .replace(/[↔]/g, '<->')
    // Special dashes to hyphen
    .replace(/[—–]/g, '-')
    // Bullet points
    .replace(/[•●○◦▪▫]/g, '-');
}

/**
 * Export markdown content to a PDF file
 */
export async function exportMarkdownToPdf(
  markdown: string,
  options: PdfExportOptions
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt', // points for precise text positioning
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Set default font
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  // Get line height for current font
  const getLineHeight = () => pdf.getFontSize() * 1.4;

  // Check if we need a new page before rendering content
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Add text with word wrap, returns new Y position
  const addText = (text: string, indent = 0): number => {
    // Sanitize and strip markdown bold markers
    const cleanText = sanitizeText(text).replace(/\*\*(.+?)\*\*/g, '$1');

    // Use 95% of available width as safety buffer for font metric variance
    // jsPDF's splitTextToSize() can miscalculate widths after font changes
    const safeWidth = (contentWidth - indent) * 0.95;
    const lines = pdf.splitTextToSize(cleanText, safeWidth);
    const lineHeight = getLineHeight();

    for (const line of lines) {
      // Check if we need a new page
      if (y + lineHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }

      pdf.text(line, margin + indent, y);
      y += lineHeight;
    }

    return y;
  };

  // Parse and render markdown line by line
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H1 headers
    if (line.startsWith('# ')) {
      pdf.setFontSize(18);
      ensureSpace(6 + pdf.getFontSize() * 1.4);  // Space before + header line
      y += 6; // Extra space before header
      pdf.setFont('helvetica', 'bold');
      addText(line.slice(2));
      y += 4; // Extra space after header
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
    }
    // H2 headers
    else if (line.startsWith('## ')) {
      pdf.setFontSize(14);
      ensureSpace(4 + pdf.getFontSize() * 1.4);  // Space before + header line
      y += 4;
      pdf.setFont('helvetica', 'bold');
      addText(line.slice(3));
      y += 2;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
    }
    // H3 headers
    else if (line.startsWith('### ')) {
      pdf.setFontSize(12);
      ensureSpace(2 + pdf.getFontSize() * 1.4);  // Space before + header line
      y += 2;
      pdf.setFont('helvetica', 'bold');
      addText(line.slice(4));
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
    }
    // Bullet points (- or *)
    else if (line.match(/^[-*]\s/)) {
      ensureSpace(getLineHeight());  // Check BEFORE rendering bullet
      pdf.text('•', margin, y);
      addText(line.slice(2), 12);
    }
    // Numbered lists
    else if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+\.)\s(.*)$/);
      if (match) {
        ensureSpace(getLineHeight());  // Check BEFORE rendering number
        pdf.text(match[1], margin, y);
        addText(match[2], 18);
      }
    }
    // Horizontal rule
    else if (line.match(/^---+$/)) {
      ensureSpace(16);  // 6 before + 10 after
      y += 6;
      pdf.setDrawColor(200);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
    }
    // Empty lines - add paragraph spacing
    else if (!line.trim()) {
      y += 8;
    }
    // Regular text
    else {
      addText(line);
    }
  }

  // Save the PDF
  pdf.save(options.filename);
}

/**
 * Generate a clean filename from company and title
 */
export function generatePdfFilename(company: string, title: string, suffix = 'resume'): string {
  return `${company}-${title}-${suffix}.pdf`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '');
}
