/**
 * Parser for interviewer intel content.
 * Supports both JSON (new format) and markdown (legacy format) for backwards compatibility.
 */

import type { InterviewerIntel } from '../../../types';

export interface ParsedIntel {
  communicationStyle: string;   // Single paragraph describing preferred style
  whatTheyValue: string[];      // 3-5 items they care about
  talkingPoints: string[];      // 3-4 things candidate should mention
  questionsToAsk: string[];     // 2-3 personalized questions
  commonGround: string[];       // 1-3 shared interests/connections
  redFlags: string[];           // 2-3 things to AVOID saying/doing
}

/**
 * Tries to parse intel as JSON.
 * Returns the parsed InterviewerIntel if valid, null otherwise.
 */
function tryParseJsonIntel(content: string): InterviewerIntel | null {
  try {
    const parsed = JSON.parse(content);

    // Validate structure
    if (
      typeof parsed.communicationStyle === 'string' &&
      Array.isArray(parsed.whatTheyValue) &&
      Array.isArray(parsed.talkingPoints) &&
      Array.isArray(parsed.questionsToAsk) &&
      Array.isArray(parsed.commonGround)
    ) {
      return parsed as InterviewerIntel;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Determines which section a header belongs to based on its text.
 */
function getSectionFromHeader(headerText: string): 'style' | 'value' | 'talking' | 'questions' | 'ground' | 'redFlags' | null {
  const lower = headerText.toLowerCase();

  if (lower.includes('communication') || lower.includes('style')) {
    return 'style';
  } else if (lower.includes('value') || lower.includes('priorities') || lower.includes('care about')) {
    return 'value';
  } else if (lower.includes('talking point') || lower.includes('discussion') || lower.includes('key point')) {
    return 'talking';
  } else if (lower.includes('question')) {
    return 'questions';
  } else if (lower.includes('common ground') || lower.includes('shared') || lower.includes('connection')) {
    return 'ground';
  } else if (lower.includes('red flag') || lower.includes('avoid') || lower.includes('don\'t') || lower.includes('not to')) {
    return 'redFlags';
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
 * Parses markdown intel (legacy format) to extract key sections.
 *
 * Supports two formats:
 * 1. Markdown headers: ## What They Value (followed by bullet points)
 * 2. Bold headers: **What They Value**: content or **What They Value** (followed by bullets)
 */
function parseMarkdownIntel(intelMarkdown: string): ParsedIntel {
  const result: ParsedIntel = {
    communicationStyle: '',
    whatTheyValue: [],
    talkingPoints: [],
    questionsToAsk: [],
    commonGround: [],
    redFlags: [],
  };

  const lines = intelMarkdown.split('\n');
  let currentSection: 'style' | 'value' | 'talking' | 'questions' | 'ground' | 'redFlags' | null = null;

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
        if (currentSection === 'style') {
          result.communicationStyle = cleanMarkdown(inlineContent);
        } else {
          const items = parseInlineContent(inlineContent);
          for (const item of items) {
            addToSection(result, currentSection, item);
          }
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
      if (currentSection === 'style') {
        // Communication style should be a paragraph, append bullet content
        if (result.communicationStyle) {
          result.communicationStyle += ' ' + cleanContent;
        } else {
          result.communicationStyle = cleanContent;
        }
      } else {
        addToSection(result, currentSection, cleanContent);
      }
    } else if (currentSection && trimmed.length >= 2) {
      // Handle plain text lines (not bullets) within a section - treat as content
      const cleanContent = cleanMarkdown(trimmed);
      if (currentSection === 'style') {
        if (result.communicationStyle) {
          result.communicationStyle += ' ' + cleanContent;
        } else {
          result.communicationStyle = cleanContent;
        }
      } else {
        addToSection(result, currentSection, cleanContent);
      }
    }
  }

  return result;
}

/**
 * Adds content to the appropriate section in the result.
 */
function addToSection(result: ParsedIntel, section: 'style' | 'value' | 'talking' | 'questions' | 'ground' | 'redFlags', content: string): void {
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
    case 'ground':
      result.commonGround.push(content);
      break;
    case 'redFlags':
      result.redFlags.push(content);
      break;
  }
}

/**
 * Parses the interviewer intel to extract key sections.
 * Tries JSON format first (new format), falls back to markdown (legacy format).
 */
export function parseInterviewerIntel(intelContent: string | undefined): ParsedIntel {
  const emptyResult: ParsedIntel = {
    communicationStyle: '',
    whatTheyValue: [],
    talkingPoints: [],
    questionsToAsk: [],
    commonGround: [],
    redFlags: [],
  };

  if (!intelContent) return emptyResult;

  // Try JSON format first (new format)
  const jsonIntel = tryParseJsonIntel(intelContent);
  if (jsonIntel) {
    return {
      communicationStyle: jsonIntel.communicationStyle || '',
      whatTheyValue: jsonIntel.whatTheyValue || [],
      talkingPoints: jsonIntel.talkingPoints || [],
      questionsToAsk: jsonIntel.questionsToAsk || [],
      commonGround: jsonIntel.commonGround || [],
      redFlags: jsonIntel.redFlags || [],
    };
  }

  // Fall back to markdown parsing (legacy format)
  return parseMarkdownIntel(intelContent);
}

/**
 * Checks if parsed intel has any meaningful content.
 */
export function hasIntelContent(intel: ParsedIntel): boolean {
  return intel.communicationStyle.length > 0 ||
         intel.whatTheyValue.length > 0 ||
         intel.talkingPoints.length > 0 ||
         intel.questionsToAsk.length > 0 ||
         intel.commonGround.length > 0 ||
         intel.redFlags.length > 0;
}

/**
 * Checks if the intel content is in JSON format.
 */
export function isJsonIntel(intelContent: string | undefined): boolean {
  if (!intelContent) return false;
  return tryParseJsonIntel(intelContent) !== null;
}
