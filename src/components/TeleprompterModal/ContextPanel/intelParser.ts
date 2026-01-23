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
 * Parses the interviewer intel markdown to extract key sections.
 *
 * Expected markdown format has headers like:
 * - "What They Value" / "Values"
 * - "Talking Points" / "Discussion Points"
 * - "Questions to Ask" / "Questions"
 *
 * Each section contains bullet points that we extract.
 */
export function parseInterviewerIntel(intelMarkdown: string | undefined): ParsedIntel {
  const result: ParsedIntel = {
    whatTheyValue: [],
    talkingPoints: [],
    questionsToAsk: [],
  };

  if (!intelMarkdown) return result;

  // Split into lines and process
  const lines = intelMarkdown.split('\n');
  let currentSection: 'value' | 'talking' | 'questions' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers (## or ### format)
    const headerMatch = trimmed.match(/^#{1,4}\s*(.+)/);
    if (headerMatch) {
      const headerText = headerMatch[1].toLowerCase();

      if (headerText.includes('value') || headerText.includes('priorities') || headerText.includes('care about')) {
        currentSection = 'value';
      } else if (headerText.includes('talking point') || headerText.includes('discussion') || headerText.includes('key point')) {
        currentSection = 'talking';
      } else if (headerText.includes('question')) {
        currentSection = 'questions';
      } else {
        // Unknown section, clear current
        currentSection = null;
      }
      continue;
    }

    // Check for bullet points in the current section
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch && currentSection) {
      const content = bulletMatch[1].trim();
      // Skip empty or very short content
      if (content.length < 3) continue;

      // Clean up markdown formatting (bold, italic)
      const cleanContent = content
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic
        .replace(/`([^`]+)`/g, '$1')        // Remove code
        .trim();

      switch (currentSection) {
        case 'value':
          result.whatTheyValue.push(cleanContent);
          break;
        case 'talking':
          result.talkingPoints.push(cleanContent);
          break;
        case 'questions':
          result.questionsToAsk.push(cleanContent);
          break;
      }
    }
  }

  return result;
}

/**
 * Checks if parsed intel has any meaningful content.
 */
export function hasIntelContent(intel: ParsedIntel): boolean {
  return intel.whatTheyValue.length > 0 ||
         intel.talkingPoints.length > 0 ||
         intel.questionsToAsk.length > 0;
}
