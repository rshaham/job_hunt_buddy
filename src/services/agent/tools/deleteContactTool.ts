import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { deleteContactSchema, type DeleteContactInput } from './schemas';

interface DeleteContactResult {
  deletedContactId: string;
  jobId: string;
  company: string;
  deletedContactName: string;
}

export const deleteContactTool: ToolDefinition<DeleteContactInput, DeleteContactResult> = {
  name: 'delete_contact',
  description: 'Delete a contact from a job. This is a destructive operation.',
  category: 'write',
  inputSchema: deleteContactSchema,
  requiresConfirmation: true, // Destructive operation

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const contact = job?.contacts.find((c) => c.id === input.contactId);

    if (job && contact) {
      return `Delete contact "${contact.name}" (${contact.role}) from "${job.company}"?`;
    }
    return `Delete this contact?`;
  },

  async execute(input): Promise<ToolResult<DeleteContactResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const contact = job.contacts.find((c) => c.id === input.contactId);
    if (!contact) {
      return {
        success: false,
        error: `Contact not found with ID: ${input.contactId}`,
      };
    }

    const deletedContactName = contact.name;
    const updatedContacts = job.contacts.filter((c) => c.id !== input.contactId);

    try {
      await updateJob(input.jobId, { contacts: updatedContacts });

      return {
        success: true,
        data: {
          deletedContactId: input.contactId,
          jobId: job.id,
          company: job.company,
          deletedContactName,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete contact',
      };
    }
  },
};
