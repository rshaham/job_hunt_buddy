import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { addNoteSchema, type AddNoteInput } from './schemas';
import type { Note } from '../../../types';

interface AddNoteResult {
  noteId: string;
  jobId: string;
  company: string;
  title: string;
  contentPreview: string;
}

export const addNoteTool: ToolDefinition<AddNoteInput, AddNoteResult> = {
  name: 'add_note',
  description: 'Add a note to a job. Notes support markdown formatting. This is a low-risk write operation.',
  category: 'write',
  inputSchema: addNoteSchema,
  requiresConfirmation: false, // Low risk - just adding a note

  async execute(input): Promise<ToolResult<AddNoteResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const now = new Date();
    const newNote: Note = {
      id: generateId(),
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await updateJob(input.jobId, {
        notes: [...job.notes, newNote],
      });

      return {
        success: true,
        data: {
          noteId: newNote.id,
          jobId: job.id,
          company: job.company,
          title: job.title,
          contentPreview: input.content.slice(0, 100) + (input.content.length > 100 ? '...' : ''),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add note',
      };
    }
  },
};
