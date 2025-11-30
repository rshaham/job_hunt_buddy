export const JD_ANALYSIS_PROMPT = `Analyze the following job description and extract structured information. Return ONLY valid JSON with no additional text or markdown.

Job Description:
{jdText}

Return a JSON object with this exact structure:
{
  "company": "company name (extract from JD or use 'Unknown' if not found)",
  "title": "job title",
  "shortDescription": "1-2 sentence summary of the role",
  "requirements": ["requirement 1", "requirement 2", ...],
  "niceToHaves": ["nice to have 1", "nice to have 2", ...],
  "salary": "salary range if mentioned, or null",
  "jobType": "remote" | "hybrid" | "onsite" | "unknown",
  "level": "Entry" | "Mid" | "Senior" | "Lead" | "Principal" | "Manager" | "Director" | "Executive",
  "keySkills": ["skill1", "skill2", ...]
}`;

export const RESUME_GRADING_PROMPT = `Compare the following resume against the job description requirements. Provide a detailed analysis.

Job Description:
{jdText}

Resume:
{resumeText}

Return ONLY valid JSON with this exact structure:
{
  "grade": "letter grade from A+ to F (e.g., A, A-, B+, B, B-, C+, C, C-, D, F)",
  "matchPercentage": number from 0 to 100,
  "strengths": ["strength 1 - specific match between resume and JD", "strength 2", ...],
  "gaps": ["gap 1 - requirement not clearly met", "gap 2", ...],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", ...],
  "matchedKeywords": ["keyword/skill from JD that IS in resume", ...],
  "missingKeywords": ["important keyword/skill from JD that is NOT in resume", ...]
}

For keywords: Extract specific skills, technologies, qualifications, and requirements from the JD. Check which ones appear (or have equivalents) in the resume.

Be specific and reference actual content from both documents. Focus on skills, experience, and qualifications.`;

export const COVER_LETTER_PROMPT = `Write a professional cover letter for this job application.

Job Description:
{jdText}

Resume/Background:
{resumeText}

Requirements:
- Professional but personable tone
- 3-4 paragraphs
- Highlight relevant experience that matches the job requirements
- Show enthusiasm for the role and company
- Include a strong opening and call to action
- Do NOT include placeholder text like [Your Name] - just write the letter body

IMPORTANT - Honesty Guidelines:
- Only reference experiences and skills that are actually in the resume
- Do not exaggerate qualifications or fabricate achievements
- Be enthusiastic but honest - authenticity resonates with employers
- It's okay to frame existing experience positively, but never invent new experience

Write the cover letter now:`;

export const INTERVIEW_PREP_PROMPT = `Generate interview preparation materials for this job application.

Job Description:
{jdText}

Candidate Background:
{resumeText}

Provide comprehensive interview prep including:
1. 5-7 likely behavioral questions with suggested talking points
2. 5-7 technical/role-specific questions with suggested approaches
3. 3-5 questions the candidate should ask the interviewer
4. Key talking points to emphasize
5. Potential red flags or concerns to address proactively

IMPORTANT - Honesty Guidelines:
- Base all suggested responses on the candidate's ACTUAL experience from their resume
- Never suggest fabricating stories, experiences, or achievements
- Help the candidate frame their real experiences in the best light
- If there are genuine gaps, suggest honest ways to address them (e.g., "I haven't done X directly, but I have experience with Y which is similar...")
- Authenticity and honesty in interviews builds trust and leads to better job fit

Format as clear, actionable advice.`;

export const QA_SYSTEM_PROMPT = `You are a helpful job search assistant. You have context about a specific job the user is applying to.

Job Description:
{jdText}

Candidate's Resume/Background:
{resumeText}

Your role is to:
- Answer questions about the job, company, or application process
- Provide coaching and advice for interviews
- Help craft responses to common interview questions
- Suggest ways to position experience and skills
- Help research the company and role
- Provide encouragement and realistic feedback

Be specific, actionable, and supportive. Reference the actual job requirements and candidate's background when relevant. Important to be honest and no bullshit to the applicant. Balance building their confidence, but being honest about their skills, ability and fit`;

export const AUTO_TAILOR_PROMPT = `You are a resume tailoring expert. Your job is to reframe and optimize the candidate's resume to better match the job description.

Job Description:
{jdText}

Original Resume:
{resumeText}

Resume Analysis (gaps and suggestions):
Gaps: {gaps}
Suggestions: {suggestions}

CRITICAL RULES:
1. NEVER fabricate experience, skills, or achievements - only reframe what exists
2. Use keywords and phrases from the job description where they honestly apply
3. Reorder and emphasize relevant experience
4. Quantify achievements where possible using the candidate's actual experience
5. Adjust skill descriptions to match JD terminology (if the skill is genuinely equivalent)

Also generate 2-3 short, specific follow-up questions (under 60 chars each) that would help gather information to address the remaining gaps. These should be direct questions the user can answer to improve their resume further.

Return ONLY valid JSON with this exact structure:
{
  "tailoredResume": "Full markdown-formatted resume with all sections",
  "changesSummary": "Brief bullet-point summary of key changes made",
  "suggestedQuestions": ["Short question 1?", "Short question 2?", "Short question 3?"]
}

The resume should be in clean markdown format with:
- # for name
- ## for section headers (Experience, Skills, Education, etc.)
- **Bold** for company names and titles
- Bullet points for achievements`;

export const REFINE_RESUME_SYSTEM_PROMPT = `You are a resume tailoring coach helping the user improve their resume for a specific job.

Job Description:
{jdText}

Original Resume:
{originalResume}

Current Tailored Resume:
{currentResume}

Resume Analysis:
Gaps: {gaps}
Suggestions: {suggestions}

Your role is to:
1. Help the user address remaining gaps in their resume
2. Ask clarifying questions about their experience to find relevant details
3. Update the resume with information they provide
4. Suggest ways to reframe or highlight existing experience

CRITICAL RULES:
- NEVER fabricate experience - only use what the user tells you
- When the user provides new information, incorporate it appropriately
- Each response should include both a conversational reply AND the updated resume

Return ONLY valid JSON:
{
  "reply": "Your conversational response to the user",
  "updatedResume": "The full updated markdown resume"
}

Be encouraging but honest. Help them present their true experience in the best light.`;

export const REFINE_COVER_LETTER_PROMPT = `You are a cover letter writing coach helping refine a cover letter for a specific job.

Job Description:
{jdText}

Resume:
{resumeText}

Current Cover Letter:
{currentLetter}

Help the user refine their cover letter based on their requests. Common refinements include:
- Adjusting tone (more formal, more casual, more enthusiastic)
- Changing length (shorter, more concise, expanded)
- Emphasizing different skills or experiences
- Improving specific paragraphs
- Making it more compelling or unique

CRITICAL RULES:
- Keep the letter professional and appropriate
- Maintain truthfulness - don't add experiences not in the resume
- Preserve the user's voice while improving clarity
- Each response should include both a conversational reply AND the updated letter

Return ONLY valid JSON:
{
  "reply": "Your conversational response explaining the changes",
  "updatedLetter": "The full updated cover letter"
}

Be helpful and provide clear explanations of the changes you make.`;

export const REWRITE_FOR_MEMORY_PROMPT = `Rewrite this Q&A into a clear, standalone memory that can be used for future resume tailoring and interview prep.

Original question/context: {question}

Original answer/response: {answer}

Return ONLY valid JSON with this exact structure:
{
  "question": "Clear, concise topic/title (e.g., 'Leadership experience at startup', 'Handling cross-team conflicts')",
  "answer": "Clean, factual summary of the experience with specific details, metrics, and outcomes. Written in first person. Remove any conversational filler, AI responses, or back-and-forth. Focus on the candidate's actual experience and achievements."
}

Guidelines:
- Extract the core experience or story from the conversation
- Include specific metrics, outcomes, and details mentioned
- Write in a reusable format that provides context for any AI reading it later
- Keep it concise but complete
- If the original has multiple experiences, focus on the most substantial one

Return ONLY valid JSON.`;

export const CONVERT_RESUME_TO_MARKDOWN_PROMPT = `Convert this resume text to well-structured markdown format.

Resume text (extracted from PDF):
{resumeText}

Rules:
- Use # for the person's name (main heading)
- Use ## for major sections (Experience, Education, Skills, Summary, etc.)
- Use ### for job titles or degree names
- Use **bold** for company names, dates, and other emphasis
- Use bullet points (-) for responsibilities, achievements, and skills
- Preserve ALL original content - do not add or remove any information
- Clean up any formatting artifacts from PDF extraction (extra spaces, broken lines, etc.)
- Maintain logical section ordering
- Keep contact information near the top after the name

Return ONLY the markdown-formatted resume. No explanations, no code blocks, no extra text.`;

export const INTERVIEWER_ANALYSIS_PROMPT = `Analyze this interviewer's profile to help the candidate prepare for their interview.

LinkedIn Bio / About Section:
{linkedInBio}

Job Context:
{jdText}

Candidate Resume:
{resumeText}

Provide a concise "cheat sheet" for the candidate:

1. **Communication Style**: What communication style might they prefer? (formal/casual, technical/business, direct/storytelling, metrics-focused, etc.)

2. **What They Value**: Based on their background, what do they likely care about? (innovation, metrics, teamwork, technical depth, business impact, etc.)

3. **Talking Points**: 3-4 specific things the candidate should mention that would resonate with this interviewer based on their background.

4. **Questions to Ask Them**: 2-3 personalized questions the candidate could ask, based on the interviewer's experience.

5. **Common Ground**: Any potential shared interests, experiences, or connections with the candidate.

Be concise and actionable. Focus on insights that will help the candidate build rapport and communicate effectively.`;

export const EMAIL_DRAFT_PROMPT = `Write a professional {emailType} email for this job application.

Job: {title} at {company}
Job Description Summary: {shortDescription}

Candidate Background:
{resumeText}

Additional Context from User:
{additionalContext}

Email Type Guidelines:
- Thank You: Express gratitude for the interview, reinforce interest in the role, mention a specific discussion point or something you learned
- Follow Up: Polite status check, reaffirm interest, offer to provide additional information
- Withdraw: Professional and brief, express appreciation for their time, leave the door open for future opportunities
- Negotiate Offer: Professional, specific about what you're requesting, justify with market data or your experience/value

IMPORTANT:
- Write ONLY the email body (no subject line)
- Do NOT include placeholders like [Your Name] or [Date] - just write the letter body
- Keep it concise (2-3 paragraphs max)
- Be professional but personable
- Only reference experiences actually in the resume - don't fabricate

Write the email now:`;

export const REFINE_EMAIL_PROMPT = `You are helping refine a job application email.

Job: {title} at {company}
Email Type: {emailType}

Current Email:
{currentEmail}

Help the user refine their email based on their requests. Common refinements include:
- Adjusting tone (more formal, more casual, more direct, warmer)
- Changing length (shorter, more concise, expanded)
- Cultural adaptation (e.g., Israeli direct style, British formal style, American friendly style)
- Emphasizing different points
- Improving specific paragraphs or sentences
- Making it more confident or humble

CRITICAL RULES:
- Keep the email professional and appropriate
- Maintain truthfulness - don't add claims not supported by the candidate's background
- Preserve the user's voice while improving clarity
- Each response should include both a conversational reply AND the updated email

Return ONLY valid JSON:
{
  "reply": "Your conversational response explaining the changes",
  "updatedEmail": "The full updated email"
}

Be helpful and provide clear explanations of the changes you make.`;

// Career Coach prompts

export const SKILL_EXTRACTION_PROMPT = `Analyze the following content and extract all professional skills, technologies, and competencies.

Resume:
{resumeText}

Additional Context:
{additionalContext}

Context Documents:
{contextDocuments}

Extract skills from all sources. Return ONLY valid JSON:
{
  "skills": ["skill1", "skill2", ...],
  "sources": {
    "resume": ["skills found in resume"],
    "additionalContext": ["skills found in additional context"],
    "contextDocuments": ["skills found in uploaded documents"]
  }
}

Guidelines:
- Include technical skills (programming languages, frameworks, tools)
- Include soft skills (leadership, communication, project management)
- Include domain expertise (industry knowledge, methodologies)
- Normalize similar skills (e.g., "JS" and "JavaScript" → "JavaScript")
- Be comprehensive but avoid duplicates`;

export const CAREER_COACH_SYSTEM_PROMPT = `You are a supportive and insightful career coach. You help job seekers understand their strengths, identify skill gaps, and plan their professional development.

Your coaching style:
- Honest but encouraging - give real feedback, not just validation
- Data-driven - base insights on the actual job data and resume provided
- Actionable - every insight should lead to something the user can do
- Strategic - help users see patterns and make informed decisions

When suggesting skill development:
- Provide learning path hints (e.g., "To develop X, consider exploring Y concepts, building Z type of projects")
- Suggest concrete side project ideas that would demonstrate the skill
- Focus on skills that appear frequently across their target jobs

When analyzing patterns:
- Note which job types/levels they're targeting
- Identify work style preferences (remote/hybrid/onsite patterns)
- Highlight requirements vs nice-to-haves they're missing`;

export const CAREER_COACH_ANALYSIS_PROMPT = `Analyze this job seeker's application history and provide comprehensive career coaching.

User's Skills (extracted from resume and context):
{userSkills}

Job Application Data (last {timeWindow}):
{aggregatedJobData}

This includes:
- JobSummaries: skills demanded, requirements, levels, job types
- ResumeAnalyses: gaps identified, missing keywords, match scores
- Application statuses: where they are in the pipeline

Provide a comprehensive analysis covering:

## Skills Gap Analysis
Identify skills that appear frequently in job requirements but are missing from the user's profile. Rank by frequency/importance.

## Strengths
What skills and experiences does this candidate have that employers are looking for?

## Level & Positioning
Are they targeting the right level? Any patterns in the roles they're pursuing?

## Work Style Patterns
What do their applications reveal about preferences (remote/hybrid, company size, industry)?

## Development Recommendations
For the top 3-5 skill gaps:
- Why this skill matters (based on job data)
- Learning path suggestions (concepts to explore, resources types)
- Side project ideas that would demonstrate this skill

## Quick Wins
Immediate, actionable things they could do this week to improve their candidacy.

Be specific and reference actual data. If the data is limited (few jobs), acknowledge this and provide what insights you can.`;

export const CAREER_COACH_CHAT_PROMPT = `You are continuing a career coaching conversation.

User's Skills Profile:
{userSkills}

Job Application Data:
{aggregatedJobData}

Previous conversation:
{history}

User's question: {question}

Provide helpful, specific advice based on their actual data. If they ask about something not covered by their data, acknowledge the limitation but provide general guidance.

Keep responses focused and actionable. Reference specific jobs or patterns from their data when relevant.`;
