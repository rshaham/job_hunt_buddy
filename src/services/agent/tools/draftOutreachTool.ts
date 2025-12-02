import { useAppStore } from '../../../stores/appStore';
import { generateEmailDraft } from '../../ai';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { draftOutreachSchema, type DraftOutreachInput } from './schemas';

interface DraftOutreachResult {
  jobId: string;
  company: string;
  contactName?: string;
  messageType: string;
  draft: string;
}

export const draftOutreachTool: ToolDefinition<DraftOutreachInput, DraftOutreachResult> = {
  name: 'draft_outreach',
  description: 'Draft a networking or outreach message to a recruiter or contact. Generates personalized messages for initial outreach, follow-ups, thank-you notes, or networking.',
  category: 'write',
  inputSchema: draftOutreachSchema,
  requiresConfirmation: true, // Uses AI credits

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const contact = input.contactId
      ? job?.contacts.find((c) => c.id === input.contactId)
      : null;

    const typeLabel = {
      'initial-outreach': 'initial outreach',
      'follow-up': 'follow-up',
      'thank-you': 'thank-you',
      'networking': 'networking',
    }[input.messageType];

    if (contact) {
      return `Draft a ${typeLabel} message to ${contact.name} at ${job?.company}? This will use AI credits.`;
    }
    return `Draft a ${typeLabel} message for ${job?.company}? This will use AI credits.`;
  },

  async execute(input): Promise<ToolResult<DraftOutreachResult>> {
    const { jobs, settings } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const contact = input.contactId
      ? job.contacts.find((c) => c.id === input.contactId)
      : null;

    if (input.contactId && !contact) {
      return {
        success: false,
        error: `Contact not found with ID: ${input.contactId}`,
      };
    }

    // Get resume text
    const resumeText = job.resumeText || settings.defaultResumeText;

    // Map message types to email types the AI understands
    const emailTypeMap: Record<string, string> = {
      'initial-outreach': 'networking introduction',
      'follow-up': 'follow-up',
      'thank-you': 'thank-you',
      'networking': 'networking',
    };

    // Build a custom prompt for the outreach
    const contactContext = contact
      ? `\n\nContact Information:
- Name: ${contact.name}
- Role: ${contact.role}
${contact.linkedInBio ? `- Background: ${contact.linkedInBio}` : ''}
${contact.notes ? `- Notes: ${contact.notes}` : ''}`
      : '';

    const customType = `${emailTypeMap[input.messageType]} message${contact ? ` to ${contact.name}` : ''}`;

    try {
      const draft = await generateEmailDraft(
        { title: job.title, company: job.company, summary: job.summary },
        resumeText,
        'custom',
        `${customType}${input.customPrompt ? `. ${input.customPrompt}` : ''}${contactContext}`
      );

      return {
        success: true,
        data: {
          jobId: job.id,
          company: job.company,
          contactName: contact?.name,
          messageType: input.messageType,
          draft,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to draft outreach message',
      };
    }
  },
};
