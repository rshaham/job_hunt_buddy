import { useAppStore } from '../../../stores/appStore';
import type { ToolDefinition, ToolResult } from '../../../types/agent';
import { suggestProjectSchema, type SuggestProjectInput } from './schemas';
import type { CareerProjectSource } from '../../../types';

interface SuggestProjectResult {
  projectId: string;
  title: string;
  skills: string[];
  source: string;
}

export const suggestProjectTool: ToolDefinition<SuggestProjectInput, SuggestProjectResult> = {
  name: 'suggest_project',
  description: 'Suggest a career development project to help the user grow their skills. Use this when you identify skill gaps or opportunities based on job requirements, career coaching discussions, or general career analysis. Projects are stored globally and can be tracked by status.',
  category: 'write',
  inputSchema: suggestProjectSchema,
  requiresConfirmation: false, // Low risk - just adding a suggestion

  async execute(input): Promise<ToolResult<SuggestProjectResult>> {
    const { addCareerProject } = useAppStore.getState();

    // Determine source based on input
    let source: CareerProjectSource;
    if (input.jobId) {
      source = {
        type: 'job',
        jobId: input.jobId,
        jobTitle: input.jobTitle,
        company: input.company,
      };
    } else {
      // From agent analysis (not tied to a specific job)
      source = { type: 'agent' };
    }

    try {
      const project = await addCareerProject({
        title: input.title,
        description: input.description,
        details: input.details,
        skills: input.skills,
        status: input.status || 'idea',
        source,
      });

      // Format source for result
      let sourceDescription = 'AI suggested';
      if (source.type === 'job' && source.company) {
        sourceDescription = `From ${source.jobTitle || 'job'} @ ${source.company}`;
      }

      return {
        success: true,
        data: {
          projectId: project.id,
          title: project.title,
          skills: project.skills,
          source: sourceDescription,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add project suggestion',
      };
    }
  },
};
