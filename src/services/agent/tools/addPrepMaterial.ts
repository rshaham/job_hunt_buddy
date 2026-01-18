import { useAppStore } from '../../../stores/appStore';
import { generateId } from '../../../utils/helpers';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { addPrepMaterialSchema, type AddPrepMaterialInput } from './schemas';
import type { PrepMaterial } from '../../../types';

interface AddPrepMaterialResult {
  materialId: string;
  jobId: string;
  company: string;
  title: string;
  type: string;
  contentPreview: string;
}

export const addPrepMaterialTool: ToolDefinition<AddPrepMaterialInput, AddPrepMaterialResult> = {
  name: 'add_prep_material',
  description: 'Add custom content to a job\'s prep materials section. Use this for interview prep content like STAR stories, question lists, research notes, checklists, or any preparation material.',
  category: 'write',
  inputSchema: addPrepMaterialSchema,
  requiresConfirmation: false, // Low risk - just adding prep material

  async execute(input): Promise<ToolResult<AddPrepMaterialResult>> {
    const { jobs, updateJob } = useAppStore.getState();
    const job = jobs.find((j) => j.id === input.jobId);

    if (!job) {
      return {
        success: false,
        error: `Job not found with ID: ${input.jobId}`,
      };
    }

    const newMaterial: PrepMaterial = {
      id: generateId(),
      title: input.title,
      content: input.content,
      type: input.type || 'other',
    };

    try {
      await updateJob(input.jobId, {
        prepMaterials: [...(job.prepMaterials || []), newMaterial],
      });

      return {
        success: true,
        description: `Added "${input.title}" to ${job.company}`,
        data: {
          materialId: newMaterial.id,
          jobId: job.id,
          company: job.company,
          title: newMaterial.title,
          type: newMaterial.type,
          contentPreview: input.content.slice(0, 100) + (input.content.length > 100 ? '...' : ''),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add prep material',
      };
    }
  },
};
