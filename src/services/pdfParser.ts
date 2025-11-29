import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source - bundled locally to avoid CDN supply chain risk
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Security limits to prevent resource exhaustion attacks
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PAGES = 100;

export async function extractTextFromPDF(file: File): Promise<string> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`PDF file is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
  }

  // Validate file type
  if (file.type && file.type !== 'application/pdf') {
    throw new Error('Invalid file type. Please upload a PDF file.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Validate page count
  if (pdf.numPages > MAX_PAGES) {
    throw new Error(`PDF has too many pages. Maximum is ${MAX_PAGES} pages.`);
  }

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => {
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}
