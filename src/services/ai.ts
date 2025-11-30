import { jsonrepair } from 'jsonrepair';
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
  INTERVIEWER_ANALYSIS_PROMPT,
  EMAIL_DRAFT_PROMPT,
  REFINE_EMAIL_PROMPT,
} from '../utils/prompts';
import type { JobSummary, ResumeAnalysis, QAEntry, TailoringEntry, CoverLetterEntry, EmailDraftEntry, EmailType, ProviderType, ProviderSettings } from '../types';
import { generateId, decodeApiKey } from '../utils/helpers';
import { useAppStore } from '../stores/appStore';
import { getProvider, type AIMessage } from './providers';

// Get current AI config from store (works outside React components)
function getAIConfig(): { provider: ProviderType; config: ProviderSettings } {
  const { settings } = useAppStore.getState();
  const provider = settings.activeProvider || 'anthropic';
  const providerSettings = settings.providers?.[provider];

  // Migration: handle old format where apiKey was at root level
  if (!providerSettings && settings.apiKey) {
    return {
      provider: 'anthropic',
      config: {
        apiKey: decodeApiKey(settings.apiKey),
        model: settings.model || 'claude-sonnet-4-5',
      },
    };
  }

  return {
    provider,
    config: {
      apiKey: decodeApiKey(providerSettings?.apiKey || ''),
      baseUrl: providerSettings?.baseUrl,
      model: providerSettings?.model || '',
    },
  };
}

async function callAI(
  messages: AIMessage[],
  systemPrompt?: string,
  overrideConfig?: { provider?: ProviderType; apiKey?: string; model?: string; baseUrl?: string }
): Promise<string> {
  const aiConfig = getAIConfig();
  const provider = overrideConfig?.provider || aiConfig.provider;
  const config: ProviderSettings = {
    apiKey: overrideConfig?.apiKey || aiConfig.config.apiKey,
    model: overrideConfig?.model || aiConfig.config.model,
    baseUrl: overrideConfig?.baseUrl || aiConfig.config.baseUrl,
  };

  // OpenAI-compatible provider (Ollama) doesn't require API key
  if (!config.apiKey && provider !== 'openai-compatible') {
    throw new Error('API key not configured. Please add your API key in Settings.');
  }

  return getProvider(provider).call(messages, systemPrompt, config);
}

function extractJSON(text: string): string {
  let input = text;

  // Strip markdown code fences if present
  const codeBlockMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    input = codeBlockMatch[1];
  }

  // Try to find JSON object in the response
  const jsonMatch = input.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Model did not return JSON. Try again or use a more capable model (Claude, GPT-4, or Gemini).');
  }

  // Use jsonrepair to fix malformed JSON from AI models
  return jsonrepair(jsonMatch[0]);
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

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse JD analysis response:', { response, jsonStr, error: e });
    throw new Error('Failed to parse AI response. Please try again.');
  }

  return {
    company: (parsed.company as string) || 'Unknown Company',
    title: (parsed.title as string) || 'Unknown Position',
    summary: {
      shortDescription: (parsed.shortDescription as string) || '',
      requirements: (parsed.requirements as string[]) || [],
      niceToHaves: (parsed.niceToHaves as string[]) || [],
      salary: (parsed.salary as string) || undefined,
      jobType: (parsed.jobType as JobSummary['jobType']) || 'unknown',
      level: (parsed.level as string) || 'Mid',
      keySkills: (parsed.keySkills as string[]) || [],
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

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse resume grading response:', { response, jsonStr, error: e });
    throw new Error('Failed to parse AI response. Please try again.');
  }

  return {
    grade: (parsed.grade as string) || 'N/A',
    matchPercentage: (parsed.matchPercentage as number) || 0,
    strengths: (parsed.strengths as string[]) || [],
    gaps: (parsed.gaps as string[]) || [],
    suggestions: (parsed.suggestions as string[]) || [],
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

  return await callAI([{ role: 'user', content: prompt }]);
}

export async function generateInterviewPrep(
  jdText: string,
  resumeText: string
): Promise<string> {
  const prompt = INTERVIEW_PREP_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  return await callAI([{ role: 'user', content: prompt }]);
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
  const messages: AIMessage[] = [];
  for (const entry of history) {
    if (entry.answer !== null) {
      messages.push({ role: 'user', content: entry.question });
      messages.push({ role: 'assistant', content: entry.answer });
    }
  }
  messages.push({ role: 'user', content: newQuestion });

  const answer = await callAI(messages, systemPrompt);

  return {
    id: generateId(),
    question: newQuestion,
    answer,
    timestamp: new Date(),
  };
}

// testApiKey needs explicit params since it's used before settings are saved
export async function testApiKey(
  provider: ProviderType,
  config: { apiKey: string; model: string; baseUrl?: string }
): Promise<boolean> {
  try {
    await callAI(
      [{ role: 'user', content: 'Say "OK" if you can read this.' }],
      undefined,
      { provider, ...config }
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
): Promise<{ tailoredResume: string; changesSummary: string; suggestedQuestions: string[] }> {
  const additionalContext = getAdditionalContext();
  const prompt = AUTO_TAILOR_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', originalResume + additionalContext)
    .replace('{gaps}', resumeAnalysis.gaps.join(', '))
    .replace('{suggestions}', resumeAnalysis.suggestions.join(', '));

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse auto-tailor response:', { response, jsonStr, error: e });
    throw new Error('Failed to parse AI response. Please try again.');
  }

  return {
    tailoredResume: (parsed.tailoredResume as string) || originalResume,
    changesSummary: (parsed.changesSummary as string) || 'No changes made',
    suggestedQuestions: (parsed.suggestedQuestions as string[]) || [],
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
  const messages: AIMessage[] = [];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages, systemPrompt);

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
  const messages: AIMessage[] = [];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages, systemPrompt);

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

  const response = await callAI([{ role: 'user', content: prompt }]);

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

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, return original content
    return { question: originalQuestion, answer: originalAnswer };
  }

  return {
    question: (parsed.question as string) || originalQuestion,
    answer: (parsed.answer as string) || originalAnswer,
  };
}

// Analyze interviewer profile for interview prep
export async function analyzeInterviewer(
  linkedInBio: string,
  jdText: string,
  resumeText: string
): Promise<string> {
  const prompt = INTERVIEWER_ANALYSIS_PROMPT
    .replace('{linkedInBio}', linkedInBio)
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  return await callAI([{ role: 'user', content: prompt }]);
}

// Generate email draft
export async function generateEmailDraft(
  job: { title: string; company: string; summary: { shortDescription: string } | null },
  resumeText: string,
  emailType: EmailType,
  additionalContext: string,
  customType?: string
): Promise<string> {
  const emailTypeLabels: Record<EmailType, string> = {
    'thank-you': 'Thank You',
    'follow-up': 'Follow Up',
    'withdraw': 'Withdraw Application',
    'negotiate': 'Negotiate Offer',
    'custom': customType || 'Custom',
  };

  const prompt = EMAIL_DRAFT_PROMPT
    .replace('{emailType}', emailTypeLabels[emailType])
    .replace('{title}', job.title)
    .replace('{company}', job.company)
    .replace('{shortDescription}', job.summary?.shortDescription || 'No summary available')
    .replace('{resumeText}', resumeText)
    .replace('{additionalContext}', additionalContext || 'None provided');

  return await callAI([{ role: 'user', content: prompt }]);
}

// Refine email with chat
export async function refineEmail(
  job: { title: string; company: string },
  emailType: EmailType,
  currentEmail: string,
  history: EmailDraftEntry[],
  userMessage: string,
  customType?: string
): Promise<{ reply: string; updatedEmail: string }> {
  const emailTypeLabels: Record<EmailType, string> = {
    'thank-you': 'Thank You',
    'follow-up': 'Follow Up',
    'withdraw': 'Withdraw Application',
    'negotiate': 'Negotiate Offer',
    'custom': customType || 'Custom',
  };

  const systemPrompt = REFINE_EMAIL_PROMPT
    .replace('{title}', job.title)
    .replace('{company}', job.company)
    .replace('{emailType}', emailTypeLabels[emailType])
    .replace('{currentEmail}', currentEmail);

  const messages: AIMessage[] = [
    { role: 'user', content: systemPrompt },
    { role: 'assistant', content: 'I understand. I\'ll help you refine this email. What changes would you like to make?' },
  ];

  // Add conversation history
  for (const entry of history) {
    messages.push({
      role: entry.role,
      content: entry.content,
    });
  }

  // Add new user message
  messages.push({ role: 'user', content: userMessage });

  const response = await callAI(messages);

  try {
    const repaired = jsonrepair(response);
    const parsed = JSON.parse(repaired);
    return {
      reply: parsed.reply || 'I\'ve updated the email.',
      updatedEmail: parsed.updatedEmail || currentEmail,
    };
  } catch {
    // If parsing fails, treat the whole response as the reply
    return {
      reply: response,
      updatedEmail: currentEmail,
    };
  }
}
