import { useAppStore } from '../../../stores/appStore';
import { analyzeInterviewer } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { analyzeContactSchema, type AnalyzeContactInput } from './schemas';

interface AnalyzeContactResult {
  jobId: string;
  company: string;
  contactId: string;
  contactName: string;
  analysisPreview: string;
}

export const analyzeContactTool: ToolDefinition<AnalyzeContactInput, AnalyzeContactResult> = {
  name: 'analyze_contact',
  description: 'Analyze a contact\'s LinkedIn profile/bio to prepare for an interview with them. The contact must have a linkedInBio field populated. Returns interviewer intel with talking points and potential questions.',
  category: 'write',
  inputSchema: analyzeContactSchema,
  requiresConfirmation: true, // Triggers API call

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const contact = job?.contacts.find((c) => c.id === input.contactId);
    if (job && contact) {
      return `Analyze ${contact.name}'s profile for "${job.company}"? This will use AI credits.`;
    }
    return `Analyze this contact's profile? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<AnalyzeContactResult>> {
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
      const analysis = await analyzeInterviewer(contact.linkedInBio, job.jdText, resumeText);

      // Update contact with intel
      const updatedContacts = [...job.contacts];
      updatedContacts[contactIndex] = {
        ...contact,
        interviewerIntel: analysis,
      };

      await updateJob(input.jobId, { contacts: updatedContacts });

      // Return preview
      const preview = analysis.length > 500
        ? analysis.substring(0, 500) + '...'
        : analysis;

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          contactId: contact.id,
          contactName: contact.name,
          analysisPreview: preview,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze contact',
      };
    }
  },
};
