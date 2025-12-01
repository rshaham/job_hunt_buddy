import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateNoteSchema, type UpdateNoteInput } from './schemas';

interface UpdateNoteResult {
  noteId: string;
  jobId: string;
  company: string;
  previousContent: string;
  newContent: string;
}

export const updateNoteTool: ToolDefinition<UpdateNoteInput, UpdateNoteResult> = {
  name: 'update_note',
  description: 'Update the content of an existing note on a job. This is a low-risk write operation.',
  category: 'write',
  inputSchema: updateNoteSchema,
  requiresConfirmation: false, // Low risk - just editing a note

  async execute(input): Promise<ToolResult<UpdateNoteResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const noteIndex = job.notes.findIndex((n) => n.id === input.noteId);
    if (noteIndex === -1) {
      return {
        success: false,
        error: `Note not found with ID: ${input.noteId}`,
      };
    }

    const previousContent = job.notes[noteIndex].content;
    const updatedNotes = [...job.notes];
    updatedNotes[noteIndex] = {
      ...updatedNotes[noteIndex],
      content: input.content,
      updatedAt: new Date(),
    };

    try {
      await updateJob(input.jobId, { notes: updatedNotes });

      return {
        success: true,
        data: {
          noteId: input.noteId,
          jobId: job.id,
          company: job.company,
          previousContent,
          newContent: input.content,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update note',
      };
    }
  },
};
