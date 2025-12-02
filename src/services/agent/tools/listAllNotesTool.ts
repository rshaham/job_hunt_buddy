import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { listAllNotesSchema, type ListAllNotesInput } from './schemas';

interface NoteWithJob {
  noteId: string;
  jobId: string;
  company: string;
  jobTitle: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ListAllNotesResult {
  notes: NoteWithJob[];
  totalNotes: number;
  matchedNotes: number;
}

export const listAllNotesTool: ToolDefinition<ListAllNotesInput, ListAllNotesResult> = {
  name: 'list_all_notes',
  description: 'List notes across all jobs. Can search notes by text content. Useful for finding information you recorded previously.',
  category: 'read',
  inputSchema: listAllNotesSchema,
  requiresConfirmation: false,

  async execute(input): Promise<ToolResult<ListAllNotesResult>> {
    const { jobs } = useAppStore.getState();

    // Collect all notes with job context
    let allNotes: NoteWithJob[] = [];

    for (const job of jobs) {
      const notes = job.notes || [];
      for (const note of notes) {
        allNotes.push({
          noteId: note.id,
          jobId: job.id,
          company: job.company,
          jobTitle: job.title,
          content: note.content,
          createdAt: new Date(note.createdAt).toISOString(),
          updatedAt: new Date(note.updatedAt).toISOString(),
        });
      }
    }

    const totalNotes = allNotes.length;

    // Apply search filter
    if (input.query) {
      const queryLower = input.query.toLowerCase();
      allNotes = allNotes.filter(
        (n) =>
          n.content.toLowerCase().includes(queryLower) ||
          n.company.toLowerCase().includes(queryLower) ||
          n.jobTitle.toLowerCase().includes(queryLower)
      );
    }

    const matchedNotes = allNotes.length;

    // Sort by most recently updated
    allNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Apply limit
    const limitedNotes = allNotes.slice(0, input.limit || 20);

    return {
      success: true,
      data: {
        notes: limitedNotes,
        totalNotes,
        matchedNotes,
      },
    };
  },
};
