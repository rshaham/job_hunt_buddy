import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateContactSchema, type UpdateContactInput } from './schemas';

interface UpdateContactResult {
  contactId: string;
  jobId: string;
  company: string;
  contactName: string;
  updatedFields: string[];
}

export const updateContactTool: ToolDefinition<UpdateContactInput, UpdateContactResult> = {
  name: 'update_contact',
  description: 'Update a contact (change name, role, email, phone, linkedin, notes)',
  category: 'write',
  inputSchema: updateContactSchema,
  requiresConfirmation: false, // Non-destructive update

  async execute(input): Promise<ToolResult<UpdateContactResult>> {
    const { jobs, updateJob } = useAppStore.getState();
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
    const updatedFields: string[] = [];

    // Build updated contact
    const updatedContact = { ...contact };

    if (input.updates.name !== undefined) {
      updatedContact.name = input.updates.name;
      updatedFields.push('name');
    }
    if (input.updates.role !== undefined) {
      updatedContact.role = input.updates.role;
      updatedFields.push('role');
    }
    if (input.updates.email !== undefined) {
      updatedContact.email = input.updates.email || undefined;
      updatedFields.push('email');
    }
    if (input.updates.phone !== undefined) {
      updatedContact.phone = input.updates.phone || undefined;
      updatedFields.push('phone');
    }
    if (input.updates.linkedin !== undefined) {
      updatedContact.linkedin = input.updates.linkedin || undefined;
      updatedFields.push('linkedin');
    }
    if (input.updates.notes !== undefined) {
      updatedContact.notes = input.updates.notes || undefined;
      updatedFields.push('notes');
    }

    if (updatedFields.length === 0) {
      return {
        success: false,
        error: 'No fields provided to update',
      };
    }

    const updatedContacts = [...job.contacts];
    updatedContacts[contactIndex] = updatedContact;

    try {
      await updateJob(input.jobId, { contacts: updatedContacts });

      return {
        success: true,
        data: {
          contactId: input.contactId,
          jobId: job.id,
          company: job.company,
          contactName: updatedContact.name,
          updatedFields,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update contact',
      };
    }
  },
};
