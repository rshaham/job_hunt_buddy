import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { updateResumeSchema, type UpdateResumeInput } from './schemas';

interface UpdateResumeResult {
  status: string;
}

export const updateResumeTool: ToolDefinition<UpdateResumeInput, UpdateResumeResult> = {
  name: 'update_resume',
  description: 'Update the user\'s base resume with new information, such as a new job, promotion, achievements, or skills. This opens a review screen showing the proposed changes; nothing is saved until the user approves it there. Pass along every detail the user gave.',
  category: 'write',
  inputSchema: updateResumeSchema,
  requiresConfirmation: false, // The review screen is the confirmation

  async execute(input): Promise<ToolResult<UpdateResumeResult>> {
    const { settings, openResumeUpdate } = useAppStore.getState();

    if (!settings.defaultResumeText) {
      return {
        success: false,
        error: 'No base resume found. Ask the user to upload a resume in My Profile first.',
      };
    }

    openResumeUpdate(input.details);

    return {
      success: true,
      description: 'Opened resume update for review',
      data: {
        status: 'A review screen is now open with the proposed resume changes. The resume has NOT been saved yet - the user must review the changes and click "Save to resume".',
      },
    };
  },
};
