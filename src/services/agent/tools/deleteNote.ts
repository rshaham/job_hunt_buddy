import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { deleteNoteSchema, type DeleteNoteInput } from './schemas';

interface DeleteNoteResult {
  deletedNoteId: string;
  jobId: string;
  company: string;
  deletedContent: string;
}

export const deleteNoteTool: ToolDefinition<DeleteNoteInput, DeleteNoteResult> = {
  name: 'delete_note',
  description: 'Delete a note from a job. This is a destructive operation.',
  category: 'write',
  inputSchema: deleteNoteSchema,
  requiresConfirmation: true, // Destructive operation

  confirmationMessage(input) {
    const { jobs } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);
    const note = job?.notes.find((n) => n.id === input.noteId);

    if (job && note) {
      const preview = note.content.length > 50
        ? note.content.substring(0, 50) + '...'
        : note.content;
      return `Delete note from "${job.company}"? Content: "${preview}"`;
    }
    return `Delete this note?`;
  },

  async execute(input): Promise<ToolResult<DeleteNoteResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const note = job.notes.find((n) => n.id === input.noteId);
    if (!note) {
      return {
        success: false,
        error: `Note not found with ID: ${input.noteId}`,
      };
    }

    const deletedContent = note.content;
    const updatedNotes = job.notes.filter((n) => n.id !== input.noteId);

    try {
      await updateJob(input.jobId, { notes: updatedNotes });

      return {
        success: true,
        data: {
          deletedNoteId: input.noteId,
          jobId: job.id,
          company: job.company,
          deletedContent,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete note',
      };
    }
  },
};
