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
  SKILL_EXTRACTION_PROMPT,
  CAREER_COACH_SYSTEM_PROMPT,
  CAREER_COACH_ANALYSIS_PROMPT,
  CAREER_COACH_CHAT_PROMPT,
} from '../utils/prompts';
import type { JobSummary, ResumeAnalysis, QAEntry, TailoringEntry, CoverLetterEntry, EmailDraftEntry, EmailType, ProviderType, ProviderSettings, Job, CareerCoachEntry, UserSkillProfile, SkillEntry } from '../types';
import { generateId, decodeApiKey } from '../utils/helpers';
import { useAppStore } from '../stores/appStore';
import { getProvider, type AIMessage } from './providers';
import { buildRelevantContext } from './contextRetrieval';
import { getSmartContext } from './smartContextRetrieval';

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

// Build additional context from settings (additionalContext + savedStories + contextDocuments)
function getAdditionalContext(): string {
  const { settings } = useAppStore.getState();
  const parts: string[] = [];

  if (settings.additionalContext?.trim()) {
    parts.push(`Additional context about the candidate:\n${settings.additionalContext}`);
  }

  // Include context documents (use summary if enabled, otherwise full text)
  if (settings.contextDocuments?.length > 0) {
    const docsText = settings.contextDocuments
      .map(doc => {
        const content = (doc.useSummary && doc.summary) ? doc.summary : doc.fullText;
        return `[${doc.name}]:\n${content}`;
      })
      .join('\n\n');
    parts.push(`Context documents:\n${docsText}`);
  }

  if (settings.savedStories?.length > 0) {
    const storiesText = settings.savedStories
      .map(s => `Q: ${s.question}\nA: ${s.answer}`)
      .join('\n\n');
    parts.push(`The candidate has shared these experiences:\n${storiesText}`);
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : '';
}

// Summarize a document for context bank
export async function summarizeDocument(documentText: string, documentName: string): Promise<string> {
  const prompt = `Summarize the following document for use as context in a job application assistant.
Focus on:
- Key skills and technologies mentioned
- Relevant work experience and achievements
- Unique qualifications or perspectives

Keep the summary concise (under 500 words) while preserving the most relevant information for job applications.

Document name: ${documentName}

Document content:
${documentText}`;

  return await callAI([{ role: 'user', content: prompt }]);
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
  resumeText: string,
  job?: Job
): Promise<ResumeAnalysis> {
  // Use smart context if job is provided (searches for relevant experiences)
  let additionalContext: string;
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'resumeGrading',
      maxStories: 5,
      maxDocuments: 3,
    });
  } else {
    additionalContext = getAdditionalContext();
  }

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
    matchedKeywords: (parsed.matchedKeywords as string[]) || [],
    missingKeywords: (parsed.missingKeywords as string[]) || [],
  };
}

export async function generateCoverLetter(
  jdText: string,
  resumeText: string,
  job?: Job
): Promise<string> {
  // Use smart context if job is provided, otherwise fall back to basic context
  let additionalContext: string;
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'coverLetter',
      maxStories: 5,
      maxDocuments: 3,
    });
  } else {
    additionalContext = getAdditionalContext();
  }

  const prompt = COVER_LETTER_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText + additionalContext);

  return await callAI([{ role: 'user', content: prompt }]);
}

export async function generateInterviewPrep(
  jdText: string,
  resumeText: string,
  job?: Job
): Promise<string> {
  // Use smart context if job is provided to include relevant experiences
  let additionalContext = '';
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'interviewPrep',
      maxStories: 5,
      maxDocuments: 3,
    });
  } else {
    additionalContext = getAdditionalContext();
  }

  const prompt = INTERVIEW_PREP_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText + additionalContext);

  return await callAI([{ role: 'user', content: prompt }]);
}

export async function chatAboutJob(
  jdText: string,
  resumeText: string,
  history: QAEntry[],
  newQuestion: string
): Promise<QAEntry> {
  // Get semantically relevant context for the question
  const relevantContext = await buildRelevantContext(newQuestion, {
    maxStories: 5,
    maxQA: 5,
    maxDocuments: 5,
  });

  // Build system prompt with relevant context
  let systemPrompt = QA_SYSTEM_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  // Append relevant context if found
  if (relevantContext) {
    systemPrompt += `\n\n---\n\nRelevant context from the candidate's profile:\n${relevantContext}`;
  }

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
  resumeAnalysis: ResumeAnalysis,
  job?: Job
): Promise<{ tailoredResume: string; changesSummary: string; suggestedQuestions: string[] }> {
  // Use smart context with gap-focused queries if job is provided
  let additionalContext: string;
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'resumeTailoring',
      resumeAnalysis,
      maxStories: 5,
      maxDocuments: 3,
    });
  } else {
    additionalContext = getAdditionalContext();
  }

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
  userMessage: string,
  job?: Job
): Promise<{ reply: string; updatedResume: string }> {
  // Use smart context with user message as query
  let additionalContext: string;
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'refinement',
      resumeAnalysis,
      userMessage,
      maxStories: 3,
      maxDocuments: 2,
    });
  } else {
    additionalContext = getAdditionalContext();
  }

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
  userMessage: string,
  job?: Job
): Promise<{ reply: string; updatedLetter: string }> {
  // Use smart context with user message as query
  let additionalContext = '';
  if (job) {
    additionalContext = await getSmartContext({
      job,
      feature: 'refinement',
      userMessage,
      maxStories: 3,
      maxDocuments: 2,
    });
  }

  const systemPrompt = REFINE_COVER_LETTER_PROMPT
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText + additionalContext)
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

// Career Coach functions

// Extract user skills from resume, additional context, and context documents
// Supports merge behavior: preserves manual skills and merges with AI-extracted ones
export async function extractUserSkills(
  existingSkills?: SkillEntry[]
): Promise<UserSkillProfile> {
  const { settings } = useAppStore.getState();

  const resumeText = settings.defaultResumeText || '';
  const additionalContext = settings.additionalContext || '';
  const contextDocuments = (settings.contextDocuments || [])
    .map(doc => {
      const content = (doc.useSummary && doc.summary) ? doc.summary : doc.fullText;
      return `[${doc.name}]:\n${content}`;
    })
    .join('\n\n');

  const prompt = SKILL_EXTRACTION_PROMPT
    .replace('{resumeText}', resumeText || 'No resume provided')
    .replace('{additionalContext}', additionalContext || 'None provided')
    .replace('{contextDocuments}', contextDocuments || 'None provided');

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, keep existing skills or return empty profile
    return {
      skills: existingSkills || [],
      lastExtractedAt: new Date(),
    };
  }

  // Parse AI-extracted skills
  const aiSkills = ((parsed.skills as Array<{ skill: string; category: string; source: string }>) || [])
    .map(s => ({
      skill: s.skill,
      category: (s.category as SkillEntry['category']) || 'technical',
      source: s.source || 'resume',
      addedAt: new Date(),
    }));

  // Merge logic:
  // 1. Keep all "manual" sourced skills from existingSkills
  // 2. Add AI-extracted skills that don't already exist
  // 3. Preserve category if skill already exists (don't override manual categorization)

  const manualSkills = (existingSkills || []).filter(s => s.source === 'manual');
  const existingSkillNames = new Set((existingSkills || []).map(s => s.skill.toLowerCase()));

  // Only add AI skills that don't already exist
  const newAiSkills = aiSkills.filter(s => !existingSkillNames.has(s.skill.toLowerCase()));

  // Combine: manual skills first, then new AI skills
  const mergedSkills = [...manualSkills, ...newAiSkills];

  return {
    skills: mergedSkills,
    lastExtractedAt: new Date(),
  };
}

// Build aggregated context for career coach analysis
export function buildCareerCoachContext(
  jobs: Job[],
  includeAllJobs: boolean = false
): { aggregatedData: string; jobCount: number } {
  // Filter to recent jobs (last 6 months) unless includeAllJobs is true
  let filteredJobs = jobs;
  if (!includeAllJobs) {
    const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000);
    filteredJobs = jobs.filter(j => new Date(j.dateAdded).getTime() > sixMonthsAgo);
  }

  // Exclude Rejected and Withdrawn jobs from positive pattern analysis
  // but include them for gap analysis
  const activeJobs = filteredJobs.filter(j =>
    j.status !== 'Rejected' && j.status !== 'Withdrawn'
  );

  // Aggregate JobSummaries
  const summaries = filteredJobs
    .filter(j => j.summary)
    .map(j => ({
      company: j.company,
      title: j.title,
      status: j.status,
      level: j.summary!.level,
      jobType: j.summary!.jobType,
      keySkills: j.summary!.keySkills,
      requirements: j.summary!.requirements.slice(0, 5), // Top 5 requirements
    }));

  // Aggregate ResumeAnalyses
  const analyses = filteredJobs
    .filter(j => j.resumeAnalysis)
    .map(j => ({
      company: j.company,
      grade: j.resumeAnalysis!.grade,
      matchPercentage: j.resumeAnalysis!.matchPercentage,
      gaps: j.resumeAnalysis!.gaps,
      missingKeywords: j.resumeAnalysis!.missingKeywords || [],
    }));

  // Count skill frequencies across all jobs
  const skillFrequency: Record<string, number> = {};
  summaries.forEach(s => {
    s.keySkills.forEach(skill => {
      skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
    });
  });

  // Sort skills by frequency
  const topSkills = Object.entries(skillFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill, count]) => `${skill} (${count} jobs)`);

  // Count missing keywords frequency
  const missingKeywordFrequency: Record<string, number> = {};
  analyses.forEach(a => {
    a.missingKeywords.forEach(kw => {
      missingKeywordFrequency[kw] = (missingKeywordFrequency[kw] || 0) + 1;
    });
  });

  const topMissingKeywords = Object.entries(missingKeywordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([kw, count]) => `${kw} (missing in ${count} analyses)`);

  // Status distribution
  const statusCounts: Record<string, number> = {};
  filteredJobs.forEach(j => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });

  // Level distribution
  const levelCounts: Record<string, number> = {};
  summaries.forEach(s => {
    levelCounts[s.level] = (levelCounts[s.level] || 0) + 1;
  });

  // Job type distribution
  const jobTypeCounts: Record<string, number> = {};
  summaries.forEach(s => {
    jobTypeCounts[s.jobType] = (jobTypeCounts[s.jobType] || 0) + 1;
  });

  // Average match percentage
  const matchPercentages = analyses.map(a => a.matchPercentage);
  const avgMatch = matchPercentages.length > 0
    ? Math.round(matchPercentages.reduce((a, b) => a + b, 0) / matchPercentages.length)
    : 0;

  const aggregatedData = `
## Application Overview
- Total jobs analyzed: ${filteredJobs.length}
- Active applications: ${activeJobs.length}
- Average resume match: ${avgMatch}%

## Status Distribution
${Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

## Level Targeting
${Object.entries(levelCounts).map(([level, count]) => `- ${level}: ${count}`).join('\n')}

## Work Style Preferences
${Object.entries(jobTypeCounts).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

## Most In-Demand Skills (across your target jobs)
${topSkills.map(s => `- ${s}`).join('\n')}

## Most Frequent Skill Gaps (from resume analyses)
${topMissingKeywords.map(k => `- ${k}`).join('\n')}

## Sample Job Details (most recent 5)
${summaries.slice(0, 5).map(s => `
### ${s.title} at ${s.company}
- Status: ${s.status}
- Level: ${s.level}
- Type: ${s.jobType}
- Key Skills: ${s.keySkills.slice(0, 8).join(', ')}
`).join('\n')}
`.trim();

  return { aggregatedData, jobCount: filteredJobs.length };
}

// Initial career analysis
export async function analyzeCareer(
  jobs: Job[],
  skillProfile: UserSkillProfile | undefined,
  includeAllJobs: boolean = false
): Promise<string> {
  const { aggregatedData, jobCount } = buildCareerCoachContext(jobs, includeAllJobs);

  if (jobCount === 0) {
    return `I don't have enough job data to provide a meaningful career analysis yet.

Add some jobs to your board first - paste job descriptions, and I'll analyze the requirements to identify patterns and skill gaps.

**Getting started:**
1. Add jobs you're interested in or have applied to
2. Upload your resume in Settings
3. Let the app grade your resume against each job
4. Come back here for personalized career insights!`;
  }

  const userSkills = skillProfile?.skills?.length
    ? `Current skills: ${skillProfile.skills.map(s => s.skill).join(', ')}`
    : 'No skill profile extracted yet. Click "Re-analyze Skills" to extract skills from your resume and context.';

  const timeWindow = includeAllJobs ? 'all time' : 'last 6 months';

  const prompt = CAREER_COACH_ANALYSIS_PROMPT
    .replace('{userSkills}', userSkills)
    .replace('{timeWindow}', timeWindow)
    .replace('{aggregatedJobData}', aggregatedData);

  return await callAI([{ role: 'user', content: prompt }], CAREER_COACH_SYSTEM_PROMPT);
}

// Follow-up chat about career
export async function chatAboutCareer(
  jobs: Job[],
  skillProfile: UserSkillProfile | undefined,
  history: CareerCoachEntry[],
  question: string,
  includeAllJobs: boolean = false
): Promise<string> {
  const { aggregatedData } = buildCareerCoachContext(jobs, includeAllJobs);

  const userSkills = skillProfile?.skills?.length
    ? `Current skills: ${skillProfile.skills.map(s => s.skill).join(', ')}`
    : 'No skill profile available';

  // Build history string
  const historyStr = history
    .map(entry => `${entry.role === 'user' ? 'User' : 'Coach'}: ${entry.content}`)
    .join('\n\n');

  const prompt = CAREER_COACH_CHAT_PROMPT
    .replace('{userSkills}', userSkills)
    .replace('{aggregatedJobData}', aggregatedData)
    .replace('{history}', historyStr || 'No previous conversation')
    .replace('{question}', question);

  return await callAI([{ role: 'user', content: prompt }], CAREER_COACH_SYSTEM_PROMPT);
}

// Research a company/role based on available information
export async function researchCompany(
  company: string,
  title: string,
  jdText: string,
  topics: string,
  resumeText?: string,
  webSearchResults?: string
): Promise<string> {
  const additionalContext = getAdditionalContext();

  const webSearchSection = webSearchResults
    ? `\n**Web Search Results:**\n${webSearchResults}\n`
    : '';

  const prompt = `You are a career research assistant helping a job seeker prepare for their application to ${company} for the ${title} role.

Based on the job description${webSearchResults ? ', web search results,' : ''} and any available information, research and provide insights on the following topics: ${topics}

**Job Description:**
${jdText}
${webSearchSection}
${resumeText ? `**Candidate's Resume:**\n${resumeText}` : ''}
${additionalContext}

**Instructions:**
${webSearchResults ? `- Synthesize information from both the job description AND web search results
- **IMPORTANT: When citing information from web sources, use inline markdown links like [Source Name](URL) so readers can click to verify**
- Example: "According to [Glassdoor reviews](https://glassdoor.com/...), employees report..."
- Prioritize recent and relevant information
- At the END of your response, include a "## Sources" section listing all web sources you referenced` : `- Extract and analyze information from the job description`}
- Make informed inferences about the company based on:
  - How they describe themselves in the JD
  - The requirements and qualifications they prioritize
  - The language and tone they use
  - Benefits, perks, and culture signals mentioned
- Provide actionable insights the candidate can use in their application or interview
- Be clear about what is stated vs. what is inferred
- Format the response in clear markdown sections

Focus on: ${topics}
${webSearchResults ? `
**Reminder:** Use clickable markdown links [like this](URL) when referencing web sources inline. End with a "## Sources" section listing all sources used.` : ''}`;

  return await callAI([{ role: 'user', content: prompt }]);
}

// Analyze a company as a potential employer
export async function analyzeCompanyAsEmployer(
  company: string,
  title: string,
  jdText: string,
  focusAreas?: string,
  resumeText?: string,
  webSearchResults?: string
): Promise<string> {
  const additionalContext = getAdditionalContext();

  const defaultFocus = 'company overview, culture indicators, growth signals, role expectations, potential concerns';
  const focus = focusAreas || defaultFocus;

  const webSearchSection = webSearchResults
    ? `\n**Web Search Results (Company Reviews, News, etc.):**\n${webSearchResults}\n`
    : '';

  const prompt = `You are a career advisor helping a job seeker evaluate ${company} as a potential employer for the ${title} position.

**Job Description:**
${jdText}
${webSearchSection}
${resumeText ? `**Candidate's Resume:**\n${resumeText}` : ''}
${additionalContext}

**Analysis Focus Areas:** ${focus}

**Provide a comprehensive analysis including:**

## Company Overview
- What can be inferred about the company from the JD${webSearchResults ? ' and web search results' : ''}?
- Industry and apparent market position
- Company size/stage indicators (startup, growth, enterprise)
${webSearchResults ? '- Recent news or developments' : ''}

## Culture & Work Environment
- Culture signals from the job posting${webSearchResults ? ' and employee reviews' : ''}
- Work style expectations (collaborative, autonomous, etc.)
- Red flags or green flags

## Role Analysis
- What they're really looking for
- Hidden requirements or expectations
- Growth potential in this role

## Strategic Insights
- How competitive this role might be
- Key differentiators a strong candidate should have
- Questions to ask in the interview

## Fit Assessment
${resumeText ? '- How well the candidate aligns with what they\'re seeking\n- Areas where the candidate could emphasize strengths\n- Potential concerns to address proactively' : '- General advice for candidates pursuing this role'}
${webSearchResults ? `
## Sources
List all web sources you referenced, formatted as clickable markdown links:
- [Source Title](URL)` : ''}

${webSearchResults ? '**IMPORTANT:** When citing information from web sources, use inline markdown links like [Source Name](URL) so readers can click to verify. Example: "According to [Glassdoor](https://glassdoor.com/...), the company has..."' : ''}

Be analytical and honest. Help the candidate understand both the opportunity and the challenges.`;

  return await callAI([{ role: 'user', content: prompt }]);
}
