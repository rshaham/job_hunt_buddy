import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { addContactSchema, type AddContactInput } from './schemas';
import type { Contact } from '../../../types';

interface AddContactResult {
  contactId: string;
  jobId: string;
  company: string;
  contactName: string;
  contactRole: string;
}

export const addContactTool: ToolDefinition<AddContactInput, AddContactResult> = {
  name: 'add_contact',
  description: 'Add a contact (recruiter, hiring manager, etc.) to a job. This is a low-risk write operation.',
  category: 'write',
  inputSchema: addContactSchema,
  requiresConfirmation: false, // Low risk - just adding a contact

  async execute(input): Promise<ToolResult<AddContactResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const newContact: Contact = {
      id: generateId(),
      name: input.name,
      role: input.role,
      email: input.email,
      linkedin: input.linkedin,
      notes: input.notes,
    };

    try {
      await updateJob(input.jobId, {
        contacts: [...job.contacts, newContact],
      });

      return {
        success: true,
        data: {
          contactId: newContact.id,
          jobId: job.id,
          company: job.company,
          contactName: newContact.name,
          contactRole: newContact.role,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add contact',
      };
    }
  },
};
