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
  EXTRACT_STORY_METADATA_PROMPT,
  INTERVIEWER_ANALYSIS_PROMPT,
  INTEL_TO_JSON_PROMPT,
  EMAIL_DRAFT_PROMPT,
  REFINE_EMAIL_PROMPT,
  SKILL_EXTRACTION_PROMPT,
  CAREER_COACH_SYSTEM_PROMPT,
  CAREER_COACH_ANALYSIS_PROMPT,
  CAREER_COACH_CHAT_PROMPT,
  LEARNING_TASK_CATEGORY_DETECTION_PROMPT,
  LEARNING_TASK_PREP_PROMPTS,
  LEARNING_TASK_PREP_SUMMARY_PROMPT,
  TELEPROMPTER_INITIAL_KEYWORDS_PROMPT,
  TELEPROMPTER_REALTIME_ASSIST_PROMPT,
  TELEPROMPTER_SEMANTIC_KEYWORDS_PROMPT,
  TELEPROMPTER_FLAT_INITIAL_KEYWORDS_PROMPT,
  CONFIDENCE_CHECK_PROMPT,
  GAP_FINDER_PROMPT,
  BEHAVIORAL_CATEGORIES,
} from '../utils/prompts';
import type { JobSummary, ResumeAnalysis, QAEntry, TailoringEntry, CoverLetterEntry, EmailDraftEntry, EmailType, ProviderType, ProviderSettings, Job, CareerCoachEntry, UserSkillProfile, SkillEntry, LearningTask, LearningTaskCategory, LearningTaskPrepMessage, SemanticCategoryResponse, InterviewerIntel } from '../types';
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

export async function callAI(
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

export function extractJSON(text: string): string {
  let input = text;

  // Strip markdown code fences if present
  const codeBlockMatch = input.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    input = codeBlockMatch[1];
  }

  // Try to find JSON object OR array in the response
  const jsonMatch = input.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
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

// Convert plain text document to markdown format
export async function convertDocumentToMarkdown(plainText: string, documentName: string): Promise<string> {
  const prompt = `Convert this document text to well-structured markdown format.

Document name: ${documentName}
Document text (extracted from PDF):
${plainText}

Rules:
- Use # for the document title or main heading
- Use ## for major sections
- Use ### for subsections
- Use **bold** for important terms, names, dates
- Use bullet points (-) for lists
- Preserve ALL original content - do not add or remove any information
- Clean up any formatting artifacts from PDF extraction (extra spaces, broken lines, etc.)
- Maintain logical section ordering
- If this appears to be a performance review, preserve the review structure
- If this appears to be a project document, preserve the project structure

Return ONLY the markdown-formatted document. No explanations, no code blocks, no extra text.`;

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
  originalAnswer: string,
  jobContext?: { company?: string; title?: string }
): Promise<{
  question: string;
  answer: string;
  company?: string;
  role?: string;
  timeframe?: string;
  outcome?: string;
  skills?: string[];
}> {
  const jobContextStr = jobContext
    ? `Company: ${jobContext.company || 'Unknown'}, Role: ${jobContext.title || 'Unknown'}`
    : 'None';

  const prompt = REWRITE_FOR_MEMORY_PROMPT
    .replace('{question}', originalQuestion)
    .replace('{answer}', originalAnswer)
    .replace('{jobContext}', jobContextStr);

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
    company: parsed.company as string | undefined,
    role: parsed.role as string | undefined,
    timeframe: parsed.timeframe as string | undefined,
    outcome: parsed.outcome as string | undefined,
    skills: Array.isArray(parsed.skills) ? (parsed.skills as string[]) : undefined,
  };
}

// Extract story metadata using AI
export async function extractStoryMetadata(rawText: string): Promise<{
  question?: string;
  answer?: string;
  company?: string;
  role?: string;
  timeframe?: string;
  outcome?: string;
  skills?: string[];
}> {
  const prompt = EXTRACT_STORY_METADATA_PROMPT.replace('{rawText}', rawText);

  const response = await callAI([{ role: 'user', content: prompt }]);

  try {
    const cleanedJson = extractJSON(response);
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Failed to parse story metadata:', error);
    return { answer: rawText };
  }
}

/**
 * Convert markdown intel to structured JSON using Haiku (fast, cheap, reliable for structured output).
 * Returns JSON string on success, or the original markdown on failure (graceful degradation).
 */
async function convertIntelToJson(markdown: string): Promise<string> {
  const prompt = INTEL_TO_JSON_PROMPT.replace('{markdown}', markdown);

  try {
    // Always use Haiku for this conversion task - it's fast and reliable for structured output
    const response = await callAI(
      [{ role: 'user', content: prompt }],
      undefined,
      { model: 'claude-haiku-4-5' }
    );

    // Extract and validate JSON
    const jsonStr = extractJSON(response);
    const parsed = JSON.parse(jsonStr) as InterviewerIntel;

    // Validate the structure has expected fields
    if (
      typeof parsed.communicationStyle === 'string' &&
      Array.isArray(parsed.whatTheyValue) &&
      Array.isArray(parsed.talkingPoints) &&
      Array.isArray(parsed.questionsToAsk) &&
      Array.isArray(parsed.commonGround)
    ) {
      return jsonStr;
    }

    // Invalid structure, fall back to markdown
    console.warn('Intel JSON has invalid structure, falling back to markdown');
    return markdown;
  } catch (error) {
    // On any error, gracefully degrade to raw markdown
    console.warn('Failed to convert intel to JSON, falling back to markdown:', error);
    return markdown;
  }
}

// Analyze interviewer profile for interview prep
export async function analyzeInterviewer(
  linkedInBio: string,
  jdText: string,
  resumeText: string
): Promise<string> {
  // Step 1: Generate natural markdown intel using the user's preferred model
  const prompt = INTERVIEWER_ANALYSIS_PROMPT
    .replace('{linkedInBio}', linkedInBio)
    .replace('{jdText}', jdText)
    .replace('{resumeText}', resumeText);

  const markdown = await callAI([{ role: 'user', content: prompt }]);

  // Step 2: Convert markdown to structured JSON using Haiku
  return await convertIntelToJson(markdown);
}

// Analyze interviewer profile with web search for enhanced intel
export async function analyzeInterviewerWithWebSearch(
  contact: { name: string; role?: string; linkedin?: string; linkedInBio?: string },
  company: string,
  jdText: string,
  resumeText: string
): Promise<string> {
  // Import web search dynamically to avoid circular dependencies
  const { searchWeb, formatSearchResultsForAI } = await import('./webSearch');

  // Build search query based on contact info
  const searchQueries: string[] = [];

  // Primary search: person's name at company
  searchQueries.push(`"${contact.name}" "${company}"`);

  // If role is available, search for person with role
  if (contact.role) {
    searchQueries.push(`"${contact.name}" ${contact.role}`);
  }

  // Execute search queries in parallel
  const searchPromises = searchQueries.map((query) =>
    searchWeb(query, {
      maxResults: 3,
      searchDepth: 'basic',
    }).catch(() => []) // Gracefully handle search failures
  );

  const searchResultArrays = await Promise.all(searchPromises);
  const allSearchResults = searchResultArrays.flat();

  // Remove duplicates by URL
  const uniqueResults = allSearchResults.filter(
    (result, index, self) => index === self.findIndex((r) => r.url === result.url)
  );

  // Format web search results for AI
  const webSearchContext = formatSearchResultsForAI(uniqueResults);

  // Build the enhanced prompt with web search results
  const bioSection = contact.linkedInBio
    ? `LinkedIn Bio / About Section:\n${contact.linkedInBio}`
    : 'No LinkedIn bio provided - using web search results instead.';

  const prompt = `Analyze this interviewer's profile to help the candidate prepare for their interview.

${bioSection}

Web Search Results for "${contact.name}" at ${company}:
${webSearchContext}

Job Context:
${jdText}

Candidate Resume:
${resumeText}

Provide a concise "cheat sheet" for the candidate:

1. **Communication Style**: What communication style might they prefer? (formal/casual, technical/business, direct/storytelling, metrics-focused, etc.)

2. **What They Value**: Based on their background and web presence, what do they likely care about? (innovation, metrics, teamwork, technical depth, business impact, etc.)

3. **Talking Points**: 3-4 specific things the candidate should mention that would resonate with this interviewer based on their background.

4. **Questions to Ask Them**: 2-3 personalized questions the candidate could ask, based on the interviewer's experience.

5. **Common Ground**: Any potential shared interests, experiences, or connections with the candidate.

Be concise and actionable. Focus on insights that will help the candidate build rapport and communicate effectively.
If web search results contain relevant info, incorporate it. If limited info is available, note that and focus on what is known.`;

  // Step 1: Generate natural markdown intel using the user's preferred model
  const markdown = await callAI([{ role: 'user', content: prompt }]);

  // Step 2: Convert markdown to structured JSON using Haiku
  return await convertIntelToJson(markdown);
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

Based on the job description${webSearchResults ? ' and web search results' : ''}, research and provide insights on the following topics: ${topics}

**Job Description:**
${jdText}
${webSearchSection}
${resumeText ? `**Candidate's Resume:**\n${resumeText}` : ''}
${additionalContext}

**Instructions:**
${webSearchResults ? `- Synthesize information from both the job description AND web search results
- Prioritize recent and relevant information` : `- Extract and analyze information from the job description`}
- Make informed inferences about the company based on:
  - How they describe themselves in the JD
  - The requirements and qualifications they prioritize
  - The language and tone they use
  - Benefits, perks, and culture signals mentioned
- Provide actionable insights the candidate can use in their application or interview
- Be clear about what is stated vs. what is inferred
- Format the response in clear markdown sections

Focus on: ${topics}`;

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

Be analytical and honest. Help the candidate understand both the opportunity and the challenges.`;

  return await callAI([{ role: 'user', content: prompt }]);
}

/**
 * Generate an enhanced search query for job search based on candidate profile.
 *
 * Takes the user's basic search query and enriches it with relevant keywords
 * from their resume, stories, and context documents for better search results.
 *
 * @param userQuery - The user's original search query (e.g., "software engineer")
 * @param candidateProfile - Combined text from resume, stories, and context docs
 * @returns Enhanced search query string (max 100 chars)
 */
export async function generateEnhancedSearchQuery(
  userQuery: string,
  candidateProfile: string
): Promise<string> {
  // Truncate profile to avoid token limits (first 2000 chars should capture key info)
  const truncatedProfile = candidateProfile.slice(0, 2000);

  const prompt = `You are helping a job seeker optimize their search query for better job matches.

**User's search query:** "${userQuery}"

**Candidate background:**
${truncatedProfile}

**Detect the query type and enhance accordingly:**

1. **Company name search** (e.g., "Electronic Arts", "Google", "Acme Corp")
   → Keep the company name. Only add 1-2 relevant skills from their background. Do NOT add job titles.
   → Example: "Electronic Arts" → "Electronic Arts game development C++"

2. **Role/job title search** (e.g., "software engineer", "product manager")
   → Keep the role. Add 1-2 related titles from their experience AND 1-2 key skills.
   → Example: "software engineer" → "software engineer technical lead game development C++"

3. **Skill search** (e.g., "React", "Python", "Unity")
   → Keep the skill. Add 1-2 related roles from their experience.
   → Example: "React" → "React frontend engineer developer"

4. **Mixed search** (e.g., "Google engineer", "EA game developer")
   → Keep both company and role. Only add skills, not more titles.
   → Example: "Google engineer" → "Google engineer backend Python AWS"

**Rules:**
- Maximum 80 characters
- PRESERVE the user's original intent - do not override it with job titles
- Output ONLY the enhanced query, no explanation
- No quotes or special operators

**Enhanced search query:**`;

  try {
    const response = await callAI([{ role: 'user', content: prompt }]);
    // Clean up the response - remove quotes, trim, limit length
    const cleaned = response.replace(/^["']|["']$/g, '').trim().slice(0, 80);
    return cleaned || userQuery; // Fallback to original if AI returns empty
  } catch (error) {
    console.warn('[AI] Failed to generate enhanced search query:', error);
    return userQuery; // Fallback to original query on error
  }
}

// ============================================================================
// Learning Task Prep Functions
// ============================================================================

/**
 * Detect the category of a learning task based on its content.
 * Uses AI to infer the most appropriate category from the task text.
 */
export async function detectLearningTaskCategory(
  task: LearningTask,
  job: Job
): Promise<{ category: LearningTaskCategory; confidence: number; reasoning: string }> {
  const prompt = LEARNING_TASK_CATEGORY_DETECTION_PROMPT
    .replace('{skill}', task.skill)
    .replace('{description}', task.description)
    .replace('{company}', job.company)
    .replace('{jobTitle}', job.title);

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse category detection response:', { response, jsonStr, error: e });
    return {
      category: 'general',
      confidence: 0.5,
      reasoning: 'Could not determine category, defaulting to general',
    };
  }

  const category = (parsed.category as LearningTaskCategory) || 'general';
  const validCategories: LearningTaskCategory[] = [
    'behavioral_interview', 'technical_deep_dive', 'system_design',
    'cross_functional', 'leadership', 'problem_solving', 'communication', 'general'
  ];

  return {
    category: validCategories.includes(category) ? category : 'general',
    confidence: (parsed.confidence as number) || 0.5,
    reasoning: (parsed.reasoning as string) || '',
  };
}

/**
 * Chat with AI to prepare for a learning task.
 * Includes category-specific prompts, relevant stories, and optional web search results.
 */
export async function chatAboutLearningTask(
  task: LearningTask,
  job: Job,
  category: LearningTaskCategory,
  history: LearningTaskPrepMessage[],
  userMessage: string,
  options?: {
    webBestPractices?: string;
    customInstructions?: string;
  }
): Promise<string> {
  const { settings } = useAppStore.getState();

  // Get resume text
  const resumeText = job.resumeText || settings.defaultResumeText || '';

  // Get relevant saved stories
  const relevantStories = settings.savedStories
    ?.filter(s => {
      // Filter stories by category match or relevance to task
      const storyCategory = s.category?.toLowerCase() || '';
      const taskSkill = task.skill.toLowerCase();
      return storyCategory.includes(category.split('_')[0]) ||
             s.question.toLowerCase().includes(taskSkill) ||
             s.answer.toLowerCase().includes(taskSkill);
    })
    .slice(0, 3)
    .map(s => `**${s.question}**\n${s.answer}`)
    .join('\n\n') || 'No relevant stories found.';

  // Get the category-specific prompt
  const basePrompt = LEARNING_TASK_PREP_PROMPTS[category] || LEARNING_TASK_PREP_PROMPTS.general;

  // Build the system prompt
  const systemPrompt = basePrompt
    .replace('{jobTitle}', job.title)
    .replace('{company}', job.company)
    .replace('{skill}', task.skill)
    .replace('{description}', task.description)
    .replace('{resumeText}', resumeText || 'No resume provided')
    .replace('{relevantStories}', relevantStories)
    .replace('{webBestPractices}', options?.webBestPractices || 'No additional tips available.')
    .replace('{customInstructions}', options?.customInstructions || 'None provided.');

  // Build message history
  const messages: AIMessage[] = [];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }
  messages.push({ role: 'user', content: userMessage });

  return await callAI(messages, systemPrompt);
}

/**
 * Summarize a prep session into a reusable prep bank entry.
 */
export async function summarizePrepSession(
  task: LearningTask,
  category: LearningTaskCategory,
  messages: LearningTaskPrepMessage[]
): Promise<{ question: string; answer: string }> {
  // Format conversation for summarization
  const conversation = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n\n');

  const prompt = LEARNING_TASK_PREP_SUMMARY_PROMPT
    .replace('{category}', category)
    .replace('{skill}', task.skill)
    .replace('{description}', task.description)
    .replace('{conversation}', conversation);

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse prep summary response:', { response, jsonStr, error: e });
    // Fallback to basic summary
    return {
      question: `${task.skill} - ${task.description}`,
      answer: 'Preparation session notes (could not extract summary)',
    };
  }

  return {
    question: (parsed.question as string) || `${task.skill} - ${task.description}`,
    answer: (parsed.answer as string) || 'Preparation session notes',
  };
}

// ============================================================================
// Teleprompter Functions
// ============================================================================

/**
 * Generate initial keywords for the teleprompter based on interview context.
 * Returns keywords organized by category to help the user during their interview.
 */
export async function generateTeleprompterKeywords(
  interviewType: string,
  job: Job | null,
  categories: Array<{ id: string; name: string }>,
  userSkills: string[],
  userStories: Array<{ question: string; answer: string }>
): Promise<Array<{ categoryId: string; keywords: string[] }>> {
  const prompt = TELEPROMPTER_INITIAL_KEYWORDS_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', job?.company || 'Unknown Company')
    .replace('{title}', job?.title || 'Unknown Role')
    .replace('{requirements}', job?.summary?.requirements?.join(', ') || 'Not specified')
    .replace('{userSkills}', userSkills.join(', ') || 'Not provided')
    .replace('{userStories}', userStories.map(s => `${s.question}: ${s.answer}`).join('\n') || 'Not provided')
    .replace('{categories}', categories.map(c => `- ${c.name} (id: ${c.id})`).join('\n'));

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.categories || [];
}

/**
 * Generate real-time keyword suggestions based on user input during an interview.
 * Returns new keywords that aren't already displayed to help the user recall relevant points.
 */
export async function generateRealtimeTeleprompterKeywords(
  userInput: string,
  interviewType: string,
  company: string,
  currentKeywords: string[],
  userBackground: string,
  categoryIds: string[]
): Promise<Array<{ text: string; categoryId: string }>> {
  const prompt = TELEPROMPTER_REALTIME_ASSIST_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', company)
    .replace('{userInput}', userInput)
    .replace('{currentKeywords}', currentKeywords.join(', ') || 'None')
    .replace('{userBackground}', userBackground)
    .replace('{categoryIds}', categoryIds.join(', '));

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.keywords || [];
}

/**
 * Generate semantic keyword categories based on interview context.
 * Unlike generateTeleprompterKeywords which requires predefined categories,
 * this function uses AI to generate both categories AND keywords based on
 * the user's actual background and the job requirements.
 */
export async function generateSemanticTeleprompterKeywords(
  interviewType: string,
  job: Job | null,
  userSkills: string[],
  userStories: Array<{ question: string; answer: string }>
): Promise<SemanticCategoryResponse[]> {
  const prompt = TELEPROMPTER_SEMANTIC_KEYWORDS_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', job?.company || 'Unknown Company')
    .replace('{title}', job?.title || 'Unknown Role')
    .replace('{requirements}', job?.summary?.requirements?.join(', ') || 'Not specified')
    .replace('{userSkills}', userSkills.join(', ') || 'Not provided')
    .replace('{userStories}', userStories.map(s => `${s.question}: ${s.answer}`).join('\n') || 'Not provided');

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.categories || [];
}

/**
 * Generate flat initial keywords for the teleprompter (no categories).
 * Used on session start to provide initial suggestions without structure.
 */
export async function generateFlatInitialTeleprompterKeywords(
  interviewType: string,
  job: Job | null,
  userSkills: string[],
  userStories: Array<{ question: string; answer: string }>
): Promise<string[]> {
  const prompt = TELEPROMPTER_FLAT_INITIAL_KEYWORDS_PROMPT
    .replace('{interviewType}', interviewType)
    .replace('{company}', job?.company || 'Unknown Company')
    .replace('{title}', job?.title || 'Unknown Role')
    .replace('{requirements}', job?.summary?.requirements?.join(', ') || 'Not specified')
    .replace('{userSkills}', userSkills.join(', ') || 'Not provided')
    .replace('{userStories}', userStories.map(s => `${s.question}: ${s.answer}`).join('\n') || 'Not provided');

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);
  const parsed = JSON.parse(jsonStr);
  return parsed.keywords || [];
}

// ============================================================================
// Quiz Feature Functions (Confidence Check & Gap Finder)
// ============================================================================

export interface ConfidenceCheckResult {
  answer: string;
  sources: string[];
  confidence: number;
  missingInfo: string | null;
}

/**
 * Answer a confidence check question using all available profile context.
 * Tests if AI can accurately recall user's experiences.
 */
export async function answerConfidenceQuestion(
  question: string
): Promise<ConfidenceCheckResult> {
  const { settings } = useAppStore.getState();

  // Build context from all available sources
  const resumeText = settings.defaultResumeText || 'No resume provided';
  const additionalContext = settings.additionalContext || 'None provided';

  // Format saved stories
  const savedStories = settings.savedStories?.length
    ? settings.savedStories
        .map(s => {
          let storyText = `Story ID: ${s.id}\nQuestion: ${s.question}\nAnswer: ${s.answer}`;
          if (s.company) storyText += `\nCompany: ${s.company}`;
          if (s.role) storyText += `\nRole: ${s.role}`;
          if (s.timeframe) storyText += `\nTimeframe: ${s.timeframe}`;
          if (s.outcome) storyText += `\nOutcome: ${s.outcome}`;
          if (s.skills?.length) storyText += `\nSkills: ${s.skills.join(', ')}`;
          return storyText;
        })
        .join('\n\n---\n\n')
    : 'No saved stories';

  // Format context documents
  const contextDocuments = settings.contextDocuments?.length
    ? settings.contextDocuments
        .map(doc => {
          const content = (doc.useSummary && doc.summary) ? doc.summary : doc.fullText;
          return `Document: ${doc.name}\n${content}`;
        })
        .join('\n\n---\n\n')
    : 'No context documents';

  const prompt = CONFIDENCE_CHECK_PROMPT
    .replace('{resumeText}', resumeText)
    .replace('{additionalContext}', additionalContext)
    .replace('{savedStories}', savedStories)
    .replace('{contextDocuments}', contextDocuments)
    .replace('{question}', question);

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse confidence check response:', { response, jsonStr, error: e });
    return {
      answer: response,
      sources: [],
      confidence: 50,
      missingInfo: null,
    };
  }

  return {
    answer: (parsed.answer as string) || response,
    sources: (parsed.sources as string[]) || [],
    confidence: (parsed.confidence as number) || 50,
    missingInfo: (parsed.missingInfo as string | null) || null,
  };
}

export interface BehavioralCategory {
  id: string;
  label: string;
  examples: string[];
}

export interface CategoryCoverage {
  id: string;
  label: string;
  covered: boolean;
  storyCount: number;
  storyIds: string[];
}

export interface StoryGapAnalysis {
  categories: CategoryCoverage[];
  suggestions: string[];
  overallCoverage: number;
  storyAnalysis: Array<{
    storyId: string;
    categories: string[];
    primaryCategory: string;
    reasoning: string;
  }>;
}

/**
 * Analyze saved stories to find gaps in behavioral interview category coverage.
 */
export async function analyzeStoryGaps(
  stories: Array<{ id: string; question: string; answer: string; company?: string; skills?: string[] }>
): Promise<StoryGapAnalysis> {
  // If no stories, return all categories as gaps
  if (!stories.length) {
    return {
      categories: BEHAVIORAL_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        covered: false,
        storyCount: 0,
        storyIds: [],
      })),
      suggestions: [
        'Start by adding a story about a time you led a project or team.',
        'Think of a challenge you overcame - failures and lessons learned make great stories.',
        'Consider adding stories about collaboration, working under pressure, and problem-solving.',
      ],
      overallCoverage: 0,
      storyAnalysis: [],
    };
  }

  // Format stories for the prompt
  const storiesText = stories
    .map(s => {
      let text = `ID: ${s.id}\nQuestion: ${s.question}\nAnswer: ${s.answer}`;
      if (s.company) text += `\nCompany: ${s.company}`;
      if (s.skills?.length) text += `\nSkills: ${s.skills.join(', ')}`;
      return text;
    })
    .join('\n\n---\n\n');

  const prompt = GAP_FINDER_PROMPT.replace('{stories}', storiesText);

  const response = await callAI([{ role: 'user', content: prompt }]);
  const jsonStr = extractJSON(response);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse gap analysis response:', { response, jsonStr, error: e });
    // Return a basic analysis
    return {
      categories: BEHAVIORAL_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        covered: false,
        storyCount: 0,
        storyIds: [],
      })),
      suggestions: ['Could not analyze stories. Please try again.'],
      overallCoverage: 0,
      storyAnalysis: [],
    };
  }

  // Parse category coverage
  const categoryCoverage = parsed.categoryCoverage as Record<string, { covered: boolean; storyCount: number; storyIds: string[] }> || {};

  const categories: CategoryCoverage[] = BEHAVIORAL_CATEGORIES.map(cat => {
    const coverage = categoryCoverage[cat.id];
    return {
      id: cat.id,
      label: cat.label,
      covered: coverage?.covered || false,
      storyCount: coverage?.storyCount || 0,
      storyIds: coverage?.storyIds || [],
    };
  });

  return {
    categories,
    suggestions: (parsed.suggestions as string[]) || [],
    overallCoverage: (parsed.overallCoverage as number) || 0,
    storyAnalysis: (parsed.storyAnalysis as StoryGapAnalysis['storyAnalysis']) || [],
  };
}

// Re-export behavioral categories for use in UI
export { BEHAVIORAL_CATEGORIES };
