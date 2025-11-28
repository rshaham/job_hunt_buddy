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
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", ...]
}

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

Be specific, actionable, and supportive. Reference the actual job requirements and candidate's background when relevant.`;
