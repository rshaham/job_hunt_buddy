/**
 * Parser for interviewer intel markdown content.
 * Extracts structured sections from the AI-generated analysis.
 */

export interface ParsedIntel {
  whatTheyValue: string[];
  talkingPoints: string[];
  questionsToAsk: string[];
}

/**
 * Determines which section a header belongs to based on its text.
 */
function getSectionFromHeader(headerText: string): 'value' | 'talking' | 'questions' | null {
  const lower = headerText.toLowerCase();

  if (lower.includes('value') || lower.includes('priorities') || lower.includes('care about')) {
    return 'value';
  } else if (lower.includes('talking point') || lower.includes('discussion') || lower.includes('key point')) {
    return 'talking';
  } else if (lower.includes('question')) {
    return 'questions';
  } else if (lower.includes('communication') || lower.includes('common ground')) {
    // Skip these sections
    return null;
  }
  return null;
}

/**
 * Cleans up markdown formatting from content.
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
    .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
    .replace(/`([^`]+)`/g, '$1')        // Remove code
    .trim();
}

/**
 * Parses comma-separated or sentence content into items.
 */
function parseInlineContent(content: string): string[] {
  const cleaned = cleanMarkdown(content);
  if (!cleaned || cleaned.length < 2) return [];

  // If content has commas, split by comma
  if (cleaned.includes(',')) {
    return cleaned.split(',').map(s => s.trim()).filter(s => s.length >= 2);
  }

  // Otherwise treat as single item
  return [cleaned];
}

/**
 * Parses the interviewer intel markdown to extract key sections.
 *
 * Supports two formats:
 * 1. Markdown headers: ## What They Value (followed by bullet points)
 * 2. Bold headers: **What They Value**: content or **What They Value** (followed by bullets)
 */
export function parseInterviewerIntel(intelMarkdown: string | undefined): ParsedIntel {
  const result: ParsedIntel = {
    whatTheyValue: [],
    talkingPoints: [],
    questionsToAsk: [],
  };

  if (!intelMarkdown) return result;

  const lines = intelMarkdown.split('\n');
  let currentSection: 'value' | 'talking' | 'questions' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for markdown headers (## or ### format)
    const headerMatch = trimmed.match(/^#{1,4}\s*(.+)/);
    if (headerMatch) {
      currentSection = getSectionFromHeader(headerMatch[1]);
      continue;
    }

    // Check for bold headers (**text**: or **text**)
    const boldHeaderMatch = trimmed.match(/^\*\*([^*]+)\*\*:?\s*(.*)?/);
    if (boldHeaderMatch) {
      const headerText = boldHeaderMatch[1];
      const inlineContent = boldHeaderMatch[2]?.trim();

      currentSection = getSectionFromHeader(headerText);

      // If there's inline content after the bold header, parse it
      if (inlineContent && currentSection) {
        const items = parseInlineContent(inlineContent);
        for (const item of items) {
          addToSection(result, currentSection, item);
        }
      }
      continue;
    }

    // Check for bullet points in the current section (supports -, *, and numbered lists)
    const bulletMatch = trimmed.match(/^(?:[-*]|\d+\.)\s+(.+)/);
    if (bulletMatch && currentSection) {
      const content = bulletMatch[1].trim();
      if (content.length < 2) continue;

      const cleanContent = cleanMarkdown(content);
      addToSection(result, currentSection, cleanContent);
    } else if (currentSection && trimmed.length >= 2) {
      // Handle plain text lines (not bullets) within a section - treat as content
      const cleanContent = cleanMarkdown(trimmed);
      addToSection(result, currentSection, cleanContent);
    }
  }

  return result;
}

/**
 * Adds content to the appropriate section in the result.
 */
function addToSection(result: ParsedIntel, section: 'value' | 'talking' | 'questions', content: string): void {
  if (!content || content.length < 2) return;

  switch (section) {
    case 'value':
      result.whatTheyValue.push(content);
      break;
    case 'talking':
      result.talkingPoints.push(content);
      break;
    case 'questions':
      result.questionsToAsk.push(content);
      break;
  }
}

/**
 * Checks if parsed intel has any meaningful content.
 */
export function hasIntelContent(intel: ParsedIntel): boolean {
  return intel.whatTheyValue.length > 0 ||
         intel.talkingPoints.length > 0 ||
         intel.questionsToAsk.length > 0;
}
