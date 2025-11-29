import { create } from 'zustand';
import type { Job, AppSettings, Status } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import * as db from '../services/db';
import { generateId } from '../utils/helpers';

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

  // UI actions
  openAddJobModal: () => void;
  closeAddJobModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

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

  // Load initial data
  loadData: async () => {
    set({ isLoading: true });
    try {
      const [jobs, settings] = await Promise.all([
        db.getAllJobs(),
        db.getSettings(),
      ]);
      set({ jobs, settings, isLoading: false });
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
    return job;
  },

  updateJob: async (id, updates) => {
    await db.updateJob(id, updates);
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === id ? { ...job, ...updates, lastUpdated: new Date() } : job
      ),
    }));
  },

  deleteJob: async (id) => {
    await db.deleteJob(id);
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== id),
      selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
    }));
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

  // UI actions
  openAddJobModal: () => set({ isAddJobModalOpen: true }),
  closeAddJobModal: () => set({ isAddJobModalOpen: false }),
  openSettingsModal: () => set({ isSettingsModalOpen: true }),
  closeSettingsModal: () => set({ isSettingsModalOpen: false }),

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
