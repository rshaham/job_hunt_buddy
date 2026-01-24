import { create } from 'zustand';
import type { Job, AppSettings, Status, ContextDocument, SavedStory, CareerCoachState, CareerCoachEntry, UserSkillProfile, SkillCategory, SkillEntry, LearningTask, LearningTaskCategory, LearningTaskPrepSession, LearningTaskPrepMessage, CareerProject, InterviewRound, RejectionDetails, OfferDetails, SourceInfo, TeleprompterSession, TeleprompterCategory, TeleprompterRoundupItem, TeleprompterFeedback, CustomInterviewType, TeleprompterKeyword, TeleprompterCustomType, Contact } from '../types';
import { DEFAULT_INTERVIEW_TYPES, DEFAULT_SETTINGS, getInterviewTypeLabel } from '../types';
import { generateFlatInitialTeleprompterKeywords } from '../services/ai';
import * as db from '../services/db';
import { saveSession, getTeleprompterCustomTypes, saveTeleprompterCustomType, saveFeedbackBatch } from '../services/db';
import { generateId } from '../utils/helpers';
import { useEmbeddingStore } from '../services/embeddings';
import { useCommandBarStore } from './commandBarStore';

// ============================================================================
// Embedding Integration Helpers
// ============================================================================

/**
 * Trigger background embedding for a job.
 * Non-blocking - doesn't wait for embedding to complete.
 */
function triggerJobEmbedding(job: Job): void {
  // Use setTimeout to ensure this runs after the current call stack
  setTimeout(() => {
    useEmbeddingStore.getState().embedJobContent(job).catch((error) => {
      console.warn('[AppStore] Failed to embed job:', error);
    });
  }, 0);
}

/**
 * Trigger background embedding for a story.
 */
function triggerStoryEmbedding(story: SavedStory): void {
  setTimeout(() => {
    useEmbeddingStore.getState().embedStoryContent(story).catch((error) => {
      console.warn('[AppStore] Failed to embed story:', error);
    });
  }, 0);
}

/**
 * Trigger background embedding for a document.
 */
function triggerDocumentEmbedding(doc: ContextDocument): void {
  setTimeout(() => {
    useEmbeddingStore.getState().embedDocumentContent(doc).catch((error) => {
      console.warn('[AppStore] Failed to embed document:', error);
    });
  }, 0);
}

/**
 * Remove embeddings for a deleted job.
 */
function triggerJobEmbeddingRemoval(jobId: string): void {
  setTimeout(() => {
    useEmbeddingStore.getState().removeJobEmbeddings(jobId).catch((error) => {
      console.warn('[AppStore] Failed to remove job embeddings:', error);
    });
  }, 0);
}

// ============================================================================
// Teleprompter Helper Function
// ============================================================================

// Exported for potential use in fallback scenarios or other components
// Now accepts string to support unified interview type system
export function getCategoriesForInterviewType(interviewType: string): TeleprompterCategory[] {
  const categoryMap: Record<string, string[]> = {
    phone_screen: ['Company Research', 'Role Fit', 'Questions to Ask', 'Salary Expectations'],
    recruiter_call: ['Company Research', 'Role Fit', 'Questions to Ask', 'Salary Expectations'],
    behavioral: ['Leadership', 'Problem-Solving', 'Collaboration', 'Conflict Resolution', 'Growth Mindset'],
    technical: ['Architecture', 'Problem-Solving', 'Technical Decisions', 'Trade-offs', 'Metrics'],
    system_design: ['Architecture', 'Scalability', 'Trade-offs', 'Requirements Clarification'],
    onsite: ['Key Stakeholders', 'Cross-functional', 'Technical Depth', 'Questions'],
    panel: ['Key Stakeholders', 'Department Focus', 'Cross-functional', 'Questions'],
    final: ['Key Differentiators', 'Closing Points', 'Questions', 'Next Steps'],
    other: ['General', 'Key Points', 'Questions'],
  };

  const categoryNames = categoryMap[interviewType] || categoryMap.other;
  return categoryNames.map(name => ({
    id: crypto.randomUUID(),
    name,
    keywords: [],
    isExpanded: true,
  }));
}

interface AppState {
  // Jobs
  jobs: Job[];
  selectedJobId: string | null;
  isLoading: boolean;

  // Settings
  settings: AppSettings;

  // UI State
  isAddJobModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isGettingStartedModalOpen: boolean;
  isPrivacyModalOpen: boolean;
  isFeatureGuideModalOpen: boolean;
  isCareerCoachModalOpen: boolean;
  isJobFinderModalOpen: boolean;
  jobFinderInitialTab: 'search' | 'batch';
  isBatchScannerModalOpen: boolean;
  isRejectionModalOpen: boolean;
  isOfferModalOpen: boolean;
  isProfileHubOpen: boolean;
  pendingStatusChange: { jobId: string; newStatus: string } | null;

  // Career Coach State
  careerCoachState: CareerCoachState;

  // Teleprompter state
  isTeleprompterModalOpen: boolean;
  teleprompterSession: TeleprompterSession | null;
  teleprompterPreSelectedJobId: string | null;
  teleprompterCustomTypes: TeleprompterCustomType[];

  // Actions
  loadData: () => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'dateAdded' | 'lastUpdated'>) => Promise<Job>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  moveJob: (id: string, newStatus: string) => Promise<void>;
  selectJob: (id: string | null) => void;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addStatus: (status: Omit<Status, 'id' | 'order'>) => Promise<void>;
  removeStatus: (id: string) => Promise<void>;
  reorderStatuses: (statuses: Status[]) => Promise<void>;

  // Context document actions
  addContextDocument: (doc: Omit<ContextDocument, 'id' | 'createdAt'>) => Promise<ContextDocument>;
  updateContextDocument: (id: string, updates: Partial<ContextDocument>) => Promise<void>;
  deleteContextDocument: (id: string) => Promise<void>;

  // Saved story actions
  updateSavedStory: (id: string, updates: Partial<SavedStory>) => Promise<void>;
  addSavedStory: (story: Omit<SavedStory, 'id' | 'createdAt'>) => Promise<SavedStory>;
  deleteSavedStory: (id: string) => Promise<void>;

  // Learning task actions
  updateLearningTask: (jobId: string, taskId: string, updates: Partial<LearningTask>) => Promise<void>;
  deleteLearningTask: (jobId: string, taskId: string) => Promise<void>;

  // Learning task prep session actions
  startPrepSession: (jobId: string, taskId: string, category: LearningTaskCategory) => Promise<string>;
  addPrepMessage: (jobId: string, taskId: string, sessionId: string, message: Omit<LearningTaskPrepMessage, 'id' | 'timestamp'>) => Promise<void>;
  updatePrepSession: (jobId: string, taskId: string, sessionId: string, updates: Partial<LearningTaskPrepSession>) => Promise<void>;
  savePrepToMaterials: (jobId: string, taskId: string, sessionId: string, title: string, content: string) => Promise<void>;

  // Interview round actions
  addInterviewRound: (jobId: string, round: Omit<InterviewRound, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInterviewRound: (jobId: string, roundId: string, updates: Partial<InterviewRound>) => Promise<void>;
  deleteInterviewRound: (jobId: string, roundId: string) => Promise<void>;

  // Custom interview type actions
  addCustomInterviewType: (label: string) => Promise<CustomInterviewType>;
  removeCustomInterviewType: (key: string) => Promise<void>;

  // Status change flow (intercepts Rejected/Offer moves)
  initiateStatusChange: (jobId: string, newStatus: string) => void;
  confirmStatusChange: (rejectionDetails?: RejectionDetails, offerDetails?: OfferDetails) => Promise<void>;
  cancelStatusChange: () => void;

  // Source tracking
  updateJobSource: (jobId: string, sourceInfo: SourceInfo) => Promise<void>;

  // UI actions
  openAddJobModal: () => void;
  closeAddJobModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openGettingStartedModal: () => void;
  closeGettingStartedModal: () => void;
  openPrivacyModal: () => void;
  closePrivacyModal: () => void;
  openFeatureGuideModal: () => void;
  closeFeatureGuideModal: () => void;
  openCareerCoachModal: () => void;
  closeCareerCoachModal: () => void;
  openJobFinderModal: (tab?: 'search' | 'batch') => void;
  closeJobFinderModal: () => void;
  openBatchScannerModal: () => void;
  closeBatchScannerModal: () => void;
  openRejectionModal: () => void;
  closeRejectionModal: () => void;
  openOfferModal: () => void;
  closeOfferModal: () => void;
  openProfileHub: () => void;
  closeProfileHub: () => void;

  // Teleprompter actions
  openTeleprompterModal: (jobId?: string) => void;
  closeTeleprompterModal: () => void;
  startTeleprompterSession: (
    jobId: string | null,
    interviewType: string,
    customType?: string,
    interviewContext?: {
      interviewRoundId?: string;
      interviewers?: Contact[];
      notes?: string;
    }
  ) => Promise<void>;
  endTeleprompterSession: () => Promise<TeleprompterRoundupItem[]>;
  promoteKeywordFromStaging: (keywordId: string, categoryId?: string) => void;
  dismissStagingKeyword: (keywordId: string) => void;
  dismissDisplayedKeyword: (categoryId: string, keywordId: string) => void;
  addKeywordsFromAI: (categoryName: string, keywords: string[]) => void;
  addManualKeyword: (categoryId: string, text: string) => void;
  toggleCategory: (categoryId: string) => void;
  saveTeleprompterFeedback: (items: TeleprompterRoundupItem[]) => Promise<void>;
  loadTeleprompterCustomTypes: () => Promise<void>;
  saveTeleprompterCustomType: (name: string) => Promise<void>;
  setTeleprompterViewMode: (mode: 'categorized' | 'flat') => void;
  toggleStagingCollapsed: () => void;
  dismissAllStagingKeywords: () => void;
  promoteAllStagingKeywords: () => void;

  // Career Coach actions
  addCareerCoachEntry: (entry: Omit<CareerCoachEntry, 'id' | 'timestamp'>) => void;
  clearCareerCoachHistory: () => void;
  updateSkillProfile: (profile: UserSkillProfile) => Promise<void>;
  addSkill: (skill: string, category: SkillCategory) => Promise<void>;
  removeSkill: (skillName: string) => Promise<void>;
  updateSkillCategory: (skillName: string, category: SkillCategory) => Promise<void>;

  // Career project actions
  addCareerProject: (project: Omit<CareerProject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CareerProject>;
  updateCareerProject: (id: string, updates: Partial<CareerProject>) => Promise<void>;
  deleteCareerProject: (id: string) => Promise<void>;

  // Data management
  deleteAllData: () => Promise<void>;

  // Export/Import
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  jobs: [],
  selectedJobId: null,
  isLoading: true,
  settings: DEFAULT_SETTINGS,
  isAddJobModalOpen: false,
  isSettingsModalOpen: false,
  isGettingStartedModalOpen: false,
  isPrivacyModalOpen: false,
  isFeatureGuideModalOpen: false,
  isCareerCoachModalOpen: false,
  isJobFinderModalOpen: false,
  jobFinderInitialTab: 'search',
  isBatchScannerModalOpen: false,
  isRejectionModalOpen: false,
  isOfferModalOpen: false,
  isProfileHubOpen: false,
  pendingStatusChange: null,
  careerCoachState: { history: [] },
  isTeleprompterModalOpen: false,
  teleprompterSession: null,
  teleprompterPreSelectedJobId: null,
  teleprompterCustomTypes: [],

  // Load initial data
  loadData: async () => {
    set({ isLoading: true });
    try {
      const [jobs, settings] = await Promise.all([
        db.getAllJobs(),
        db.getSettings(),
      ]);

      // Migrate old settings format (apiKey at root level) to new provider format
      if (settings.apiKey && !settings.providers) {
        settings.activeProvider = 'anthropic';
        settings.providers = {
          anthropic: {
            apiKey: settings.apiKey,
            model: settings.model || 'claude-sonnet-4-5',
          },
          'openai-compatible': { apiKey: '', model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
          gemini: { apiKey: '', model: 'gemini-1.5-flash' },
        };
        // Save migrated settings
        await db.saveSettings(settings);
      }

      set({ jobs, settings, isLoading: false });

      // Restore skillProfile from persisted settings
      if (settings.skillProfile) {
        set((state) => ({
          careerCoachState: {
            ...state.careerCoachState,
            skillProfile: settings.skillProfile,
          },
        }));
      }

      // Initialize agent chat from persisted settings
      if (settings.agentChatHistory || settings.agentMessages) {
        useCommandBarStore.getState().initializeFromSettings(settings);
      }

      // Auto-initialize embeddings in the background
      // Non-blocking - app is functional while embeddings load
      setTimeout(() => {
        useEmbeddingStore.getState().initialize().then(() => {
          // After model is ready, index any unindexed content
          const state = get();
          useEmbeddingStore.getState().indexAllContent(
            state.jobs,
            state.settings.savedStories || [],
            state.settings.contextDocuments || []
          ).catch((error) => {
            console.warn('[AppStore] Background indexing failed:', error);
          });
        }).catch((error) => {
          console.warn('[AppStore] Embedding initialization failed:', error);
        });
      }, 100); // Small delay to let UI render first
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  // Job actions
  addJob: async (jobData) => {
    const now = new Date();
    const job: Job = {
      ...jobData,
      id: generateId(),
      dateAdded: now,
      lastUpdated: now,
    };

    await db.createJob(job);
    set((state) => ({ jobs: [...state.jobs, job] }));

    // Trigger background embedding
    triggerJobEmbedding(job);

    return job;
  },

  updateJob: async (id, updates) => {
    await db.updateJob(id, updates);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates, lastUpdated: new Date() } : job
      ),
    }));

    // Re-embed if embeddable content changed
    const embeddableFields = ['jdText', 'notes', 'qaHistory', 'coverLetter'];
    if (embeddableFields.some((field) => field in updates)) {
      const job = get().jobs.find((j) => j.id === id);
      if (job) {
        triggerJobEmbedding(job);
      }
    }
  },

  deleteJob: async (id) => {
    await db.deleteJob(id);
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
    }));

    // Remove job embeddings
    triggerJobEmbeddingRemoval(id);
  },

  moveJob: async (id, newStatus) => {
    await db.updateJob(id, { status: newStatus });
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, status: newStatus, lastUpdated: new Date() } : job
      ),
    }));
  },

  selectJob: (id) => {
    set({ selectedJobId: id });
  },

  // Settings actions
  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    await db.saveSettings(newSettings);
    set({ settings: newSettings });

    // Apply theme
    if (updates.theme) {
      document.documentElement.classList.toggle('dark', updates.theme === 'dark');
    }
  },

  addStatus: async (statusData) => {
    const { settings } = get();
    const newStatus: Status = {
      ...statusData,
      id: generateId(),
      order: settings.statuses.length,
    };
    const newStatuses = [...settings.statuses, newStatus];
    await get().updateSettings({ statuses: newStatuses });
  },

  removeStatus: async (id) => {
    const { settings, jobs } = get();
    // Don't remove if jobs are using this status
    const statusInUse = jobs.some((job) => {
      const status = settings.statuses.find((s) => s.id === id);
      return status && job.status === status.name;
    });

    if (statusInUse) {
      throw new Error('Cannot remove status that is in use by jobs');
    }

    const newStatuses = settings.statuses
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, order: i }));
    await get().updateSettings({ statuses: newStatuses });
  },

  reorderStatuses: async (statuses) => {
    await get().updateSettings({ statuses });
  },

  // Context document actions
  addContextDocument: async (docData) => {
    const { settings } = get();
    const newDoc: ContextDocument = {
      ...docData,
      id: generateId(),
      createdAt: new Date(),
    };
    const newDocuments = [...(settings.contextDocuments || []), newDoc];
    await get().updateSettings({ contextDocuments: newDocuments });

    // Trigger background embedding
    triggerDocumentEmbedding(newDoc);

    return newDoc;
  },

  updateContextDocument: async (id, updates) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).map((doc) =>
      doc.id === id ? { ...doc, ...updates } : doc
    );
    await get().updateSettings({ contextDocuments: newDocuments });

    // Re-embed if content changed
    if ('fullText' in updates || 'summary' in updates || 'useSummary' in updates) {
      const doc = newDocuments.find((d) => d.id === id);
      if (doc) {
        triggerDocumentEmbedding(doc);
      }
    }
  },

  deleteContextDocument: async (id) => {
    const { settings } = get();
    const newDocuments = (settings.contextDocuments || []).filter((doc) => doc.id !== id);
    await get().updateSettings({ contextDocuments: newDocuments });

    // Remove document embedding
    setTimeout(() => {
      import('../services/embeddings').then(({ removeEmbeddingsByEntity }) => {
        removeEmbeddingsByEntity('doc', id).catch((error) => {
          console.warn('[AppStore] Failed to remove document embedding:', error);
        });
      });
    }, 0);
  },

  // Saved story actions
  updateSavedStory: async (id, updates) => {
    const { settings } = get();
    const newStories = (settings.savedStories || []).map((story) =>
      story.id === id ? { ...story, ...updates } : story
    );
    await get().updateSettings({ savedStories: newStories });

    // Re-embed if content changed
    if ('question' in updates || 'answer' in updates) {
      const story = newStories.find((s) => s.id === id);
      if (story) {
        triggerStoryEmbedding(story);
      }
    }
  },

  addSavedStory: async (storyData) => {
    const newStory: SavedStory = {
      ...storyData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      source: storyData.source || 'manual',
    };
    const newStories = [...(get().settings.savedStories || []), newStory];
    await get().updateSettings({ savedStories: newStories });
    triggerStoryEmbedding(newStory);
    return newStory;
  },

  deleteSavedStory: async (id) => {
    const newStories = (get().settings.savedStories || []).filter((s) => s.id !== id);
    await get().updateSettings({ savedStories: newStories });
    // Remove embedding
    setTimeout(() => {
      import('../services/embeddings').then(({ removeEmbeddingsByEntity }) => {
        removeEmbeddingsByEntity('story', id).catch((error) => {
          console.warn('[AppStore] Failed to remove story embedding:', error);
        });
      });
    }, 0);
  },

  // Learning task actions
  updateLearningTask: async (jobId, taskId, updates) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updatedTasks = (job.learningTasks || []).map((task) =>
      task.id === taskId ? { ...task, ...updates, updatedAt: new Date() } : task
    );
    await get().updateJob(jobId, { learningTasks: updatedTasks });
  },

  deleteLearningTask: async (jobId, taskId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updatedTasks = (job.learningTasks || []).filter((task) => task.id !== taskId);
    await get().updateJob(jobId, { learningTasks: updatedTasks });
  },

  // Learning task prep session actions
  startPrepSession: async (jobId, taskId, category) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) throw new Error('Job not found');

    const sessionId = generateId();
    const newSession: LearningTaskPrepSession = {
      id: sessionId,
      category,
      messages: [],
      createdAt: new Date(),
    };

    const updatedTasks = (job.learningTasks || []).map((task) =>
      task.id === taskId
        ? {
            ...task,
            prepSessions: [...(task.prepSessions || []), newSession],
            inferredCategory: category,
            updatedAt: new Date(),
          }
        : task
    );
    await get().updateJob(jobId, { learningTasks: updatedTasks });
    return sessionId;
  },

  addPrepMessage: async (jobId, taskId, sessionId, message) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const newMessage: LearningTaskPrepMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };

    const updatedTasks = (job.learningTasks || []).map((task) => {
      if (task.id !== taskId) return task;
      const updatedSessions = (task.prepSessions || []).map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, newMessage] }
          : session
      );
      return { ...task, prepSessions: updatedSessions, updatedAt: new Date() };
    });
    await get().updateJob(jobId, { learningTasks: updatedTasks });
  },

  updatePrepSession: async (jobId, taskId, sessionId, updates) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updatedTasks = (job.learningTasks || []).map((task) => {
      if (task.id !== taskId) return task;
      const updatedSessions = (task.prepSessions || []).map((session) =>
        session.id === sessionId ? { ...session, ...updates } : session
      );
      return { ...task, prepSessions: updatedSessions, updatedAt: new Date() };
    });
    await get().updateJob(jobId, { learningTasks: updatedTasks });
  },

  savePrepToMaterials: async (jobId, taskId, sessionId, title, content) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    // Create a new prep material from the summarized session
    const newMaterial = {
      id: generateId(),
      title,
      content,
      type: 'other' as const,
    };

    const updatedMaterials = [...(job.prepMaterials || []), newMaterial];
    await get().updateJob(jobId, { prepMaterials: updatedMaterials });

    // Mark the session as saved
    await get().updatePrepSession(jobId, taskId, sessionId, { savedToBank: true });
  },

  // Interview round actions
  addInterviewRound: async (jobId, round) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const newRound: InterviewRound = {
      ...round,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedInterviews = [...(job.interviews || []), newRound];
    await get().updateJob(jobId, { interviews: updatedInterviews });
  },

  updateInterviewRound: async (jobId, roundId, updates) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updatedInterviews = (job.interviews || []).map((round) =>
      round.id === roundId ? { ...round, ...updates, updatedAt: new Date() } : round
    );
    await get().updateJob(jobId, { interviews: updatedInterviews });
  },

  deleteInterviewRound: async (jobId, roundId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;

    const updatedInterviews = (job.interviews || []).filter((round) => round.id !== roundId);
    await get().updateJob(jobId, { interviews: updatedInterviews });
  },

  // Custom interview type actions
  addCustomInterviewType: async (label: string) => {
    const { settings } = get();
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Check for duplicates
    const allTypes = [...DEFAULT_INTERVIEW_TYPES, ...(settings.customInterviewTypes || [])];
    if (allTypes.some(t => t.key === key)) {
      throw new Error('Interview type already exists');
    }

    const newType: CustomInterviewType = { key, label };
    const newCustomTypes = [...(settings.customInterviewTypes || []), newType];
    await get().updateSettings({ customInterviewTypes: newCustomTypes });
    return newType;
  },

  removeCustomInterviewType: async (key: string) => {
    const { settings, jobs } = get();

    // Check if type is in use
    const typeInUse = jobs.some(job =>
      job.interviews?.some(i => i.type === key)
    );
    if (typeInUse) {
      throw new Error('Cannot remove interview type that is in use');
    }

    const newCustomTypes = (settings.customInterviewTypes || []).filter(t => t.key !== key);
    await get().updateSettings({ customInterviewTypes: newCustomTypes });
  },

  // Status change flow
  initiateStatusChange: (jobId, newStatus) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job || job.status === newStatus) return;

    // Check if we need to show a modal
    if (newStatus === 'Rejected') {
      set({
        pendingStatusChange: { jobId, newStatus },
        isRejectionModalOpen: true,
      });
    } else if (newStatus === 'Offer') {
      set({
        pendingStatusChange: { jobId, newStatus },
        isOfferModalOpen: true,
      });
    } else {
      // No modal needed, just move the job
      get().moveJob(jobId, newStatus);
    }
  },

  confirmStatusChange: async (rejectionDetails, offerDetails) => {
    const { pendingStatusChange } = get();
    if (!pendingStatusChange) return;

    const { jobId, newStatus } = pendingStatusChange;
    const updates: Partial<Job> = { status: newStatus };

    if (newStatus === 'Rejected' && rejectionDetails) {
      updates.rejectionDetails = {
        ...rejectionDetails,
        rejectedAt: new Date(),
      };
    } else if (newStatus === 'Offer' && offerDetails) {
      updates.offerDetails = {
        ...offerDetails,
        offeredAt: new Date(),
      };
    }

    await db.updateJob(jobId, updates);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, ...updates, lastUpdated: new Date() } : job
      ),
      pendingStatusChange: null,
      isRejectionModalOpen: false,
      isOfferModalOpen: false,
    }));
  },

  cancelStatusChange: () => {
    set({
      pendingStatusChange: null,
      isRejectionModalOpen: false,
      isOfferModalOpen: false,
    });
  },

  // Source tracking
  updateJobSource: async (jobId, sourceInfo) => {
    await get().updateJob(jobId, { sourceInfo });
  },

  // UI actions
  openAddJobModal: () => set({ isAddJobModalOpen: true }),
  closeAddJobModal: () => set({ isAddJobModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),
  openGettingStartedModal: () => set({ isGettingStartedModalOpen: true }),
  closeGettingStartedModal: () => set({ isGettingStartedModalOpen: false }),
  openPrivacyModal: () => set({ isPrivacyModalOpen: true }),
  closePrivacyModal: () => set({ isPrivacyModalOpen: false }),
  openFeatureGuideModal: () => set({ isFeatureGuideModalOpen: true }),
  closeFeatureGuideModal: () => set({ isFeatureGuideModalOpen: false }),
  openCareerCoachModal: () => set({ isCareerCoachModalOpen: true }),
  closeCareerCoachModal: () => set({ isCareerCoachModalOpen: false }),
  openJobFinderModal: (tab?: 'search' | 'batch') => set({ isJobFinderModalOpen: true, jobFinderInitialTab: tab || 'search' }),
  closeJobFinderModal: () => set({ isJobFinderModalOpen: false }),
  openBatchScannerModal: () => set({ isBatchScannerModalOpen: true }),
  closeBatchScannerModal: () => set({ isBatchScannerModalOpen: false }),
  openRejectionModal: () => set({ isRejectionModalOpen: true }),
  closeRejectionModal: () => set({ isRejectionModalOpen: false, pendingStatusChange: null }),
  openOfferModal: () => set({ isOfferModalOpen: true }),
  closeOfferModal: () => set({ isOfferModalOpen: false, pendingStatusChange: null }),
  openProfileHub: () => set({ isProfileHubOpen: true }),
  closeProfileHub: () => set({ isProfileHubOpen: false }),

  // Teleprompter actions
  openTeleprompterModal: (jobId?: string) => set({
    isTeleprompterModalOpen: true,
    teleprompterPreSelectedJobId: jobId || null,
  }),

  closeTeleprompterModal: () => set({
    isTeleprompterModalOpen: false,
    teleprompterPreSelectedJobId: null,
  }),

  startTeleprompterSession: async (jobId, interviewType, customType, interviewContext) => {
    const { jobs, settings } = get();
    const job = jobId ? jobs.find(j => j.id === jobId) ?? null : null;

    // Create session with empty categories and loading state
    const session: TeleprompterSession = {
      id: crypto.randomUUID(),
      jobId,
      interviewType,
      customInterviewType: customType,
      interviewRoundId: interviewContext?.interviewRoundId,
      // Only set interviewerIds if there are actual interviewers
      interviewerIds: interviewContext?.interviewers?.length
        ? interviewContext.interviewers.map(c => c.id)
        : undefined,
      categories: [],
      stagingKeywords: [],
      dismissedKeywordIds: [],
      startedAt: new Date(),
      isActive: true,
      viewMode: 'categorized',
      isStagingCollapsed: false,
      isGeneratingInitialKeywords: true,
    };

    // Save initial session immediately so UI can render (with loading state)
    await saveSession(session);
    set({ teleprompterSession: session });

    // Generate flat keywords in background (no categories initially)
    try {
      const userSkills = settings.additionalContext?.split(',').map(s => s.trim()).filter(Boolean) || [];
      const userStories = (settings.savedStories || []).map(s => ({ question: s.question, answer: s.answer }));

      // Build interview type label using unified system
      // If custom type is provided, use it directly instead of "Other: Custom Name"
      const customTypes = settings.customInterviewTypes || [];
      const interviewTypeLabel = customType || getInterviewTypeLabel(interviewType, customTypes);

      const flatKeywords = await generateFlatInitialTeleprompterKeywords(
        interviewTypeLabel,
        job,
        userSkills,
        userStories,
        interviewContext?.interviewers,
        interviewContext?.notes
      );

      // Create staging keywords without category assignment (flat list)
      const stagingKeywords: TeleprompterKeyword[] = flatKeywords.map(text => ({
        id: crypto.randomUUID(),
        text,
        source: 'ai-initial',
        inStaging: true,
      }));

      // Get current session (might have been updated)
      const currentSession = get().teleprompterSession;
      if (currentSession && currentSession.id === session.id) {
        const updatedSession = {
          ...currentSession,
          stagingKeywords,
          isGeneratingInitialKeywords: false,
        };
        await saveSession(updatedSession);
        set({ teleprompterSession: updatedSession });
      }
    } catch (error) {
      console.error('[Teleprompter] Error generating initial keywords:', error);
      // Set loading to false even on error
      const currentSession = get().teleprompterSession;
      if (currentSession && currentSession.id === session.id) {
        const updatedSession = { ...currentSession, isGeneratingInitialKeywords: false };
        await saveSession(updatedSession);
        set({ teleprompterSession: updatedSession });
      }
    }
  },

  endTeleprompterSession: async () => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return [];

    // Collect all displayed keywords for roundup
    const roundupItems: TeleprompterRoundupItem[] = [];
    for (const category of teleprompterSession.categories) {
      for (const keyword of category.keywords.filter(k => !k.inStaging)) {
        roundupItems.push({
          keyword,
          categoryName: category.name,
        });
      }
    }

    // Mark session as inactive
    const updatedSession = { ...teleprompterSession, isActive: false };
    await saveSession(updatedSession);

    return roundupItems;
  },

  promoteKeywordFromStaging: (keywordId, categoryId) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const keyword = teleprompterSession.stagingKeywords.find(k => k.id === keywordId);
    if (!keyword) return;

    let updatedCategories = [...teleprompterSession.categories];

    // Determine target category: use provided categoryId, or find by suggestedCategoryName, or fallback to first category
    let targetCategoryId = categoryId;
    if (!targetCategoryId && keyword.suggestedCategoryName) {
      const suggestedCategory = updatedCategories.find(
        cat => cat.name === keyword.suggestedCategoryName
      );
      targetCategoryId = suggestedCategory?.id;
    }
    // Fallback to first category if exists
    if (!targetCategoryId && updatedCategories.length > 0) {
      targetCategoryId = updatedCategories[0].id;
    }
    // If no categories exist, create a "Suggestions" category
    if (!targetCategoryId) {
      const newCategory: TeleprompterCategory = {
        id: crypto.randomUUID(),
        name: 'Suggestions',
        keywords: [],
        isExpanded: true,
      };
      updatedCategories = [newCategory];
      targetCategoryId = newCategory.id;
    }

    const promotedKeyword = { ...keyword, inStaging: false };
    updatedCategories = updatedCategories.map(cat => {
      if (cat.id === targetCategoryId) {
        return { ...cat, keywords: [...cat.keywords, promotedKeyword] };
      }
      return cat;
    });

    const updatedSession = {
      ...teleprompterSession,
      categories: updatedCategories,
      stagingKeywords: teleprompterSession.stagingKeywords.filter(k => k.id !== keywordId),
    };

    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  dismissStagingKeyword: (keywordId) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const updatedSession = {
      ...teleprompterSession,
      stagingKeywords: teleprompterSession.stagingKeywords.filter(k => k.id !== keywordId),
      dismissedKeywordIds: [...teleprompterSession.dismissedKeywordIds, keywordId],
    };

    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  dismissDisplayedKeyword: (categoryId, keywordId) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const updatedCategories = teleprompterSession.categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, keywords: cat.keywords.filter(k => k.id !== keywordId) };
      }
      return cat;
    });

    const updatedSession = {
      ...teleprompterSession,
      categories: updatedCategories,
      dismissedKeywordIds: [...teleprompterSession.dismissedKeywordIds, keywordId],
    };

    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  addKeywordsFromAI: (categoryName, keywords) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    // User's prompt becomes the category name - create category if it doesn't exist
    let updatedCategories = [...teleprompterSession.categories];
    let targetCategory = updatedCategories.find(c => c.name === categoryName);

    if (!targetCategory) {
      // Create new category with the prompt text as the name
      targetCategory = {
        id: crypto.randomUUID(),
        name: categoryName,
        keywords: [],
        isExpanded: true,
      };
      updatedCategories = [...updatedCategories, targetCategory];
    }

    // Add keywords to the target category
    const newKeywords: TeleprompterKeyword[] = keywords.map(text => ({
      id: crypto.randomUUID(),
      text,
      source: 'ai-realtime',
      inStaging: false,
    }));

    updatedCategories = updatedCategories.map(cat => {
      if (cat.id === targetCategory!.id) {
        return { ...cat, keywords: [...cat.keywords, ...newKeywords] };
      }
      return cat;
    });

    const updatedSession = { ...teleprompterSession, categories: updatedCategories };
    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  addManualKeyword: (categoryId, text) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession || !text.trim()) return;

    const newKeyword: TeleprompterKeyword = {
      id: crypto.randomUUID(),
      text: text.trim(),
      source: 'manual',
      inStaging: false,
    };

    const updatedCategories = teleprompterSession.categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, keywords: [...cat.keywords, newKeyword] };
      }
      return cat;
    });

    const updatedSession = { ...teleprompterSession, categories: updatedCategories };
    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  toggleCategory: (categoryId) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const updatedCategories = teleprompterSession.categories.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, isExpanded: !cat.isExpanded };
      }
      return cat;
    });

    const updatedSession = { ...teleprompterSession, categories: updatedCategories };
    set({ teleprompterSession: updatedSession });
  },

  saveTeleprompterFeedback: async (items) => {
    const { teleprompterSession, settings } = get();
    if (!teleprompterSession) return;

    const feedbackRecords: TeleprompterFeedback[] = items
      .filter(item => item.helpful !== undefined)
      .map(item => ({
        id: crypto.randomUUID(),
        sessionId: teleprompterSession.id,
        interviewType: teleprompterSession.interviewType,
        keywordText: item.keyword.text,
        helpful: item.helpful!,
        savedToProfile: item.saveToProfile || false,
        timestamp: new Date(),
      }));

    await saveFeedbackBatch(feedbackRecords);

    // Save keywords marked for profile to savedStories
    const storiesToAdd = items
      .filter(item => item.saveToProfile)
      .map(item => ({
        id: crypto.randomUUID(),
        question: item.categoryName,
        answer: item.keyword.text,
        category: teleprompterSession.interviewType,
        createdAt: new Date(),
      }));

    if (storiesToAdd.length > 0) {
      const updatedStories = [...(settings.savedStories || []), ...storiesToAdd];
      await get().updateSettings({ savedStories: updatedStories });
    }

    // Clear session
    set({ teleprompterSession: null });
  },

  loadTeleprompterCustomTypes: async () => {
    const types = await getTeleprompterCustomTypes();
    set({ teleprompterCustomTypes: types });
  },

  saveTeleprompterCustomType: async (name) => {
    const newType: TeleprompterCustomType = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    await saveTeleprompterCustomType(newType);
    const { teleprompterCustomTypes } = get();
    set({ teleprompterCustomTypes: [...teleprompterCustomTypes, newType] });
  },

  setTeleprompterViewMode: (mode) => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const updatedSession = { ...teleprompterSession, viewMode: mode };
    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  toggleStagingCollapsed: () => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const updatedSession = {
      ...teleprompterSession,
      isStagingCollapsed: !teleprompterSession.isStagingCollapsed,
    };
    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  dismissAllStagingKeywords: () => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;

    const dismissedIds = teleprompterSession.stagingKeywords.map(k => k.id);
    const updatedSession = {
      ...teleprompterSession,
      stagingKeywords: [],
      dismissedKeywordIds: [...teleprompterSession.dismissedKeywordIds, ...dismissedIds],
    };

    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  promoteAllStagingKeywords: () => {
    const { teleprompterSession } = get();
    if (!teleprompterSession) return;
    if (teleprompterSession.stagingKeywords.length === 0) return; // Nothing to promote

    // Build updated categories with promoted keywords
    let updatedCategories = teleprompterSession.categories.map(cat => ({ ...cat, keywords: [...cat.keywords] }));

    // If no categories exist, create a "Suggestions" category
    if (updatedCategories.length === 0) {
      updatedCategories = [{
        id: crypto.randomUUID(),
        name: 'Suggestions',
        keywords: [],
        isExpanded: true,
      }];
    }

    // Create a map of category name to category id for quick lookup
    const categoryNameToId = new Map<string, string>();
    for (const cat of updatedCategories) {
      categoryNameToId.set(cat.name, cat.id);
    }
    const firstCategoryId = updatedCategories[0].id;

    for (const keyword of teleprompterSession.stagingKeywords) {
      // Find target category by suggestedCategoryName, or fallback to first category
      let targetCategoryId = keyword.suggestedCategoryName
        ? categoryNameToId.get(keyword.suggestedCategoryName)
        : undefined;
      if (!targetCategoryId) {
        targetCategoryId = firstCategoryId;
      }

      const promotedKeyword = { ...keyword, inStaging: false };
      const catIndex = updatedCategories.findIndex(c => c.id === targetCategoryId);
      if (catIndex >= 0) {
        updatedCategories[catIndex].keywords.push(promotedKeyword);
      }
    }

    const updatedSession = {
      ...teleprompterSession,
      categories: updatedCategories,
      stagingKeywords: [],
    };

    set({ teleprompterSession: updatedSession });
    saveSession(updatedSession);
  },

  // Career Coach actions
  addCareerCoachEntry: (entry) => {
    const newEntry: CareerCoachEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        history: [...state.careerCoachState.history, newEntry],
      },
    }));
  },

  clearCareerCoachHistory: () => {
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        history: [],
        lastAnalyzedAt: undefined,
      },
    }));
  },

  updateSkillProfile: async (profile) => {
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        skillProfile: profile,
      },
    }));
    // Persist to settings
    const { settings } = get();
    await db.saveSettings({ ...settings, skillProfile: profile });
  },

  addSkill: async (skill, category) => {
    const existingSkills = get().careerCoachState.skillProfile?.skills || [];
    // Check for duplicates (case-insensitive)
    if (existingSkills.some(s => s.skill.toLowerCase() === skill.toLowerCase())) {
      return; // Don't add duplicate
    }
    const newSkill: SkillEntry = {
      skill,
      category,
      source: 'manual',
      addedAt: new Date(),
    };
    const newProfile = {
      skills: [...existingSkills, newSkill],
      lastExtractedAt: get().careerCoachState.skillProfile?.lastExtractedAt,
    };
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        skillProfile: newProfile,
      },
    }));
    // Persist to settings
    const { settings } = get();
    await db.saveSettings({ ...settings, skillProfile: newProfile });
  },

  removeSkill: async (skillName) => {
    const existingSkills = get().careerCoachState.skillProfile?.skills || [];
    const newProfile = {
      skills: existingSkills.filter(s => s.skill.toLowerCase() !== skillName.toLowerCase()),
      lastExtractedAt: get().careerCoachState.skillProfile?.lastExtractedAt,
    };
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        skillProfile: newProfile,
      },
    }));
    // Persist to settings
    const { settings } = get();
    await db.saveSettings({ ...settings, skillProfile: newProfile });
  },

  updateSkillCategory: async (skillName, category) => {
    const existingSkills = get().careerCoachState.skillProfile?.skills || [];
    const newProfile = {
      skills: existingSkills.map(s =>
        s.skill.toLowerCase() === skillName.toLowerCase()
          ? { ...s, category }
          : s
      ),
      lastExtractedAt: get().careerCoachState.skillProfile?.lastExtractedAt,
    };
    set((state) => ({
      careerCoachState: {
        ...state.careerCoachState,
        skillProfile: newProfile,
      },
    }));
    // Persist to settings
    const { settings } = get();
    await db.saveSettings({ ...settings, skillProfile: newProfile });
  },

  // Career project actions
  addCareerProject: async (project) => {
    const now = new Date();
    const newProject: CareerProject = {
      ...project,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const updatedProjects = [...(get().settings.careerProjects || []), newProject];
    await get().updateSettings({ careerProjects: updatedProjects });
    return newProject;
  },

  updateCareerProject: async (id, updates) => {
    const projects = get().settings.careerProjects || [];
    const updatedProjects = projects.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
    );
    await get().updateSettings({ careerProjects: updatedProjects });
  },

  deleteCareerProject: async (id) => {
    const projects = get().settings.careerProjects || [];
    const updatedProjects = projects.filter((p) => p.id !== id);
    await get().updateSettings({ careerProjects: updatedProjects });
  },

  // Data management
  deleteAllData: async () => {
    await db.deleteAllData();
    set({ jobs: [], settings: DEFAULT_SETTINGS, selectedJobId: null });
  },

  // Export/Import
  exportData: async () => {
    const data = await db.exportData();
    return JSON.stringify(data, null, 2);
  },

  importData: async (jsonData) => {
    // Parse JSON and let db.importData validate the schema
    let data: unknown;
    try {
      data = JSON.parse(jsonData);
    } catch {
      throw new Error('Invalid JSON format');
    }
    await db.importData(data);
    await get().loadData();
  },
}));
