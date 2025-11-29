import {
  JD_ANALYSIS_PROMPT,
  RESUME_GRADING_PROMPT,
  COVER_LETTER_PROMPT,
  INTERVIEW_PREP_PROMPT,
  QA_SYSTEM_PROMPT,
  AUTO_TAILOR_PROMPT,
  REFINE_RESUME_SYSTEM_PROMPT,
  REFINE_COVER_LETTER_PROMPT,
  CONVERT_RESUME_TO_MARKDOWN_PROMPT,
  REWRITE_FOR_MEMORY_PROMPT,
} from '../utils/prompts';
import type { JobSummary, ResumeAnalysis, QAEntry, TailoringEntry, CoverLetterEntry } from '../types';
import { generateId, decodeApiKey } from '../utils/helpers';
import { useAppStore } from '../stores/appStore';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Get current AI config from store (works outside React components)
function getAIConfig() {
  const { settings } = useAppStore.getState();
  return {
    apiKey: decodeApiKey(settings.apiKey),
    model: settings.model || 'claude-sonnet-4-5-20250514',
  };
}

// Using anthropic-dangerous-direct-browser-access here because this is meant to be local only client
// The app user owns the key and it never sent to any servers, but rather used locally only

async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  overrideConfig?: { apiKey?: string; model?: string }
): Promise<string> {
  const config = getAIConfig();
  const apiKey = overrideConfig?.apiKey || config.apiKey;
  const model = overrideConfig?.model || config.model;

  if (!apiKey) {
    throw new Error('API key not configured. Please add your Claude API key in Settings.');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

function extractJSON(text: string): string {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return text;
}

// Build additional context from settings (additionalContext + savedStories)
function getAdditionalContext(): string {
  const { settings } = useAppStore.getState();
  const parts: string[] = [];

  if (settings.additionalContext?.trim()) {
    parts.push(`Additional context about the candidate:\n${settings.additionalContext}`);
  }

  if (settings.savedStories?.length > 0) {
    const storiesText = settings.savedStories
      .map(s => `Q: ${s.question}\nA: ${s.answer}`)
      .join('\n\n');
    parts.push(`The candidate has shared these experiences:\n${storiesText}`);
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : '';
}

export async function analyzeJobDescription(
  jdText: string
): Promise<{ company: string; title: string; summary: JobSummary }> {
  const prompt = JD_ANALYSIS_PROMPT.replace('{jdText}', jdText);

  const response = await callClaude([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);

  return {
    company: parsed.company || 'Unknown Company',
    title: parsed.title || 'Unknown Position',
    summary: {
      shortDescription: parsed.shortDescription || '',
      requirements: parsed.requirements || [],
      niceToHaves: parsed.niceToHaves || [],
      salary: parsed.salary || undefined,
      jobType: parsed.jobType || 'unknown',
      level: parsed.level || 'Mid',
      keySkills: parsed.keySkills || [],
    },
  };
}

export async function gradeResume(
  jdText: string,
  resumeText: string
): Promise<ResumeAnalysis> {
  const additionalContext = getAdditionalContext();
  const prompt = RESUME_GRADING_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText + additionalContext);

  const response = await callClaude([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);

  return {
    grade: parsed.grade || 'N/A',
    matchPercentage: parsed.matchPercentage || 0,
    strengths: parsed.strengths || [],
    gaps: parsed.gaps || [],
    suggestions: parsed.suggestions || [],
  };
}

export async function generateCoverLetter(
  jdText: string,
  resumeText: string
): Promise<string> {
  const additionalContext = getAdditionalContext();
  const prompt = COVER_LETTER_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText + additionalContext);

  return await callClaude([{ role: 'user', content: prompt }]);
}

export async function generateInterviewPrep(
  jdText: string,
  resumeText: string
): Promise<string> {
  const prompt = INTERVIEW_PREP_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  return await callClaude([{ role: 'user', content: prompt }]);
}

export async function chatAboutJob(
  jdText: string,
  resumeText: string,
  history: QAEntry[],
  newQuestion: string
): Promise<QAEntry> {
  const systemPrompt = QA_SYSTEM_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  // Build message history (skip entries with null answers - they're pending)
  const messages: ClaudeMessage[] = [];
  for (const entry of history) {
    if (entry.answer !== null) {
      messages.push({ role: 'user', content: entry.question });
      messages.push({ role: 'assistant', content: entry.answer });
    }
  }
  messages.push({ role: 'user', content: newQuestion });

  const answer = await callClaude(messages, systemPrompt);

  return {
    id: generateId(),
    question: newQuestion,
    answer,
    timestamp: new Date(),
  };
}

// testApiKey needs explicit params since it's used before settings are saved
export async function testApiKey(apiKey: string, model: string): Promise<boolean> {
  try {
    await callClaude(
      [{ role: 'user', content: 'Say "OK" if you can read this.' }],
      undefined,
      { apiKey, model }
    );
    return true;
  } catch {
    return false;
  }
}

// Auto-tailor resume based on JD and analysis
export async function autoTailorResume(
  jdText: string,
  originalResume: string,
  resumeAnalysis: ResumeAnalysis
): Promise<{ tailoredResume: string; changesSummary: string }> {
  const additionalContext = getAdditionalContext();
  const prompt = AUTO_TAILOR_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', originalResume + additionalContext)
    .replace('{gaps}', resumeAnalysis.gaps.join(', '))
    .replace('{suggestions}', resumeAnalysis.suggestions.join(', '));

  const response = await callClaude([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);

  return {
    tailoredResume: parsed.tailoredResume || originalResume,
    changesSummary: parsed.changesSummary || 'No changes made',
  };
}

// Refine tailored resume via chat
export async function refineTailoredResume(
  jdText: string,
  originalResume: string,
  currentTailoredResume: string,
  resumeAnalysis: ResumeAnalysis,
  history: TailoringEntry[],
  userMessage: string
): Promise<{ reply: string; updatedResume: string }> {
  const additionalContext = getAdditionalContext();
  const systemPrompt = REFINE_RESUME_SYSTEM_PROMPT
    .replace('{jdText}', jdText)
    .replace('{originalResume}', originalResume + additionalContext)
    .replace('{currentResume}', currentTailoredResume)
    .replace('{gaps}', resumeAnalysis.gaps.join(', '))
    .replace('{suggestions}', resumeAnalysis.suggestions.join(', '));

  // Build message history
  const messages: ClaudeMessage[] = [];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await callClaude(messages, systemPrompt);

  try {
    const jsonStr = extractJSON(response);
    const parsed = JSON.parse(jsonStr);
    return {
      reply: parsed.reply || 'I had trouble processing that. Could you try again?',
      updatedResume: parsed.updatedResume || currentTailoredResume,
    };
  } catch {
    // AI responded naturally without JSON - use response as reply, keep resume as-is
    return {
      reply: response,
      updatedResume: currentTailoredResume,
    };
  }
}

// Refine cover letter via chat
export async function refineCoverLetter(
  jdText: string,
  resumeText: string,
  currentLetter: string,
  history: CoverLetterEntry[],
  userMessage: string
): Promise<{ reply: string; updatedLetter: string }> {
  const systemPrompt = REFINE_COVER_LETTER_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText)
    .replace('{currentLetter}', currentLetter);

  // Build message history
  const messages: ClaudeMessage[] = [];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await callClaude(messages, systemPrompt);

  try {
    const jsonStr = extractJSON(response);
    const parsed = JSON.parse(jsonStr);
    return {
      reply: parsed.reply || 'I had trouble processing that. Could you try again?',
      updatedLetter: parsed.updatedLetter || currentLetter,
    };
  } catch {
    // AI responded naturally without JSON - use response as reply, keep letter as-is
    return {
      reply: response,
      updatedLetter: currentLetter,
    };
  }
}

// Convert plain text resume to markdown format
export async function convertResumeToMarkdown(plainText: string): Promise<string> {
  const prompt = CONVERT_RESUME_TO_MARKDOWN_PROMPT.replace('{resumeText}', plainText);

  const response = await callClaude([{ role: 'user', content: prompt }]);

  // Clean up response - remove any markdown code blocks if present
  let markdown = response.trim();
  if (markdown.startsWith('```markdown')) {
    markdown = markdown.slice(11);
  } else if (markdown.startsWith('```')) {
    markdown = markdown.slice(3);
  }
  if (markdown.endsWith('```')) {
    markdown = markdown.slice(0, -3);
  }

  return markdown.trim();
}

// Rewrite Q&A into a clean, reusable memory for profile
export async function rewriteForMemory(
  originalQuestion: string,
  originalAnswer: string
): Promise<{ question: string; answer: string }> {
  const prompt = REWRITE_FOR_MEMORY_PROMPT
    .replace('{question}', originalQuestion)
    .replace('{answer}', originalAnswer);

  const response = await callClaude([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);

  return {
    question: parsed.question || originalQuestion,
    answer: parsed.answer || originalAnswer,
  };
}
