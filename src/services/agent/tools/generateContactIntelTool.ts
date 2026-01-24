import { useAppStore } from '../../../stores/appStore';
import { analyzeInterviewer, analyzeInterviewerWithWebSearch } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import type { InterviewerIntel } from '../../../types';
import { generateContactIntelSchema, type GenerateContactIntelInput } from './schemas';

interface GenerateContactIntelResult {
  jobId: string;
  company: string;
  contactId: string;
  contactName: string;
  intel: InterviewerIntel | null;
  summary: string;
}

// Helper to safely parse intel JSON
function parseIntelJson(intelString: string): InterviewerIntel | null {
  try {
    return JSON.parse(intelString) as InterviewerIntel;
  } catch {
    // Legacy markdown format - return null
    return null;
  }
}

export const generateContactIntelTool: ToolDefinition<GenerateContactIntelInput, GenerateContactIntelResult> = {
  name: 'generate_contact_intel',
  description: 'Generate AI-powered intel for a contact based on their LinkedIn bio. Produces structured information including communication style, what they value, talking points, questions to ask, common ground, and red flags. Contact must have a linkedInBio field populated.',
  category: 'write',
  inputSchema: generateContactIntelSchema,
  requiresConfirmation: true, // AI API call required

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const contact = job?.contacts.find((c) => c.id === input.contactId);
    const webSearchNote = input.useWebSearch ? ' with web search' : '';

    if (job && contact) {
      return `Generate intel for ${contact.name} at "${job.company}"${webSearchNote}? This will use AI credits.`;
    }
    return `Generate contact intel${webSearchNote}? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<GenerateContactIntelResult>> {
    const { jobs, settings, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const contactIndex = job.contacts.findIndex((c) => c.id === input.contactId);
    if (contactIndex === -1) {
      return {
        success: false,
        error: `Contact not found with ID: ${input.contactId}`,
      };
    }

    const contact = job.contacts[contactIndex];

    if (!contact.linkedInBio) {
      return {
        success: false,
        error: `Contact "${contact.name}" doesn't have a LinkedIn bio. Add their profile info first.`,
      };
    }

    // Get resume text (job-specific or default)
    const resumeText = job.resumeText || settings.defaultResumeText;
    if (!resumeText) {
      return {
        success: false,
        error: 'No resume found. Please upload a resume in Settings first.',
      };
    }

    if (!job.jdText) {
      return {
        success: false,
        error: 'No job description found for this job.',
      };
    }

    try {
      let analysis: string;

      if (input.useWebSearch) {
        // Use web search enhanced analysis
        analysis = await analyzeInterviewerWithWebSearch(
          {
            name: contact.name,
            role: contact.role,
            linkedin: contact.linkedin,
            linkedInBio: contact.linkedInBio,
          },
          job.company,
          job.jdText,
          resumeText
        );
      } else {
        // Standard analysis
        analysis = await analyzeInterviewer(contact.linkedInBio, job.jdText, resumeText);
      }

      // Update contact with intel
      const updatedContacts = [...job.contacts];
      updatedContacts[contactIndex] = {
        ...contact,
        interviewerIntel: analysis,
      };

      await updateJob(input.jobId, { contacts: updatedContacts });

      // Parse intel for structured response
      const parsedIntel = parseIntelJson(analysis);

      // Build summary
      let summary: string;
      if (parsedIntel) {
        const keyPoints: string[] = [];
        if (parsedIntel.whatTheyValue && parsedIntel.whatTheyValue.length > 0) {
          keyPoints.push(`Values: ${parsedIntel.whatTheyValue.slice(0, 2).join(', ')}`);
        }
        if (parsedIntel.talkingPoints && parsedIntel.talkingPoints.length > 0) {
          keyPoints.push(`Key talking points: ${parsedIntel.talkingPoints.length}`);
        }
        if (parsedIntel.questionsToAsk && parsedIntel.questionsToAsk.length > 0) {
          keyPoints.push(`Questions to ask: ${parsedIntel.questionsToAsk.length}`);
        }
        summary = keyPoints.length > 0 ? keyPoints.join(' | ') : 'Intel generated successfully';
      } else {
        // Markdown format - provide brief excerpt
        summary = analysis.length > 200 ? analysis.substring(0, 200) + '...' : analysis;
      }

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          contactId: contact.id,
          contactName: contact.name,
          intel: parsedIntel,
          summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate contact intel',
      };
    }
  },
};
