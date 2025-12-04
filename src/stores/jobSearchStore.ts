/**
 * Job Search Store
 *
 * Zustand store for managing job search state including:
 * - Search criteria and results
 * - Match score calculation progress
 * - Job selection for batch import
 *
 * Separate from appStore because:
 * - Search state is transient (not persisted)
 * - Clean separation of concerns
 * - Avoids bloating appStore with temporary data
 */

import { create } from 'zustand';
import type { Job } from '../types';
import type { JobSearchCriteria, EnrichedSearchResult } from '../types/jobSearch';
import {
  searchJobs,
  enrichSearchResults,
  transformSearchResultToJob,
  getCandidateProfileEmbedding,
  hasValidCandidateProfile,
  scoreJob,
  invalidateProfileCache,
  buildCandidateProfile,
  JobSearchError,
} from '../services/jobSearch';
import { generateEnhancedSearchQuery, analyzeJobDescription } from '../services/ai';
import { useAppStore } from './appStore';

interface JobSearchState {
  // Search state
  criteria: JobSearchCriteria | null;
  results: EnrichedSearchResult[];
  isSearching: boolean;
  isEnhancingQuery: boolean;
  enhancedQuery: string | null;
  searchError: string | null;

  // Scoring state
  scoringProgress: { completed: number; total: number };
  isScoring: boolean;
  scoringAbortController: AbortController | null;

  // Candidate profile embedding (cached)
  profileEmbedding: number[] | null;

  // Selection state
  selectedIds: Set<string>;

  // Import state
  isImporting: boolean;
  importProgress: { current: number; total: number; currentJob: string | null };
}

interface JobSearchActions {
  // Search
  search: (criteria: JobSearchCriteria) => Promise<void>;
  clearResults: () => void;

  // Scoring
  startScoring: (results: EnrichedSearchResult[]) => Promise<void>;
  cancelScoring: () => void;

  // Selection
  toggleSelection: (jobId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Import
  importSelectedJobs: () => Promise<Job[]>;

  // Cache invalidation
  invalidateProfile: () => void;
}

export const useJobSearchStore = create<JobSearchState & JobSearchActions>(
  (set, get) => ({
    // Initial state
    criteria: null,
    results: [],
    isSearching: false,
    isEnhancingQuery: false,
    enhancedQuery: null,
    searchError: null,
    scoringProgress: { completed: 0, total: 0 },
    isScoring: false,
    scoringAbortController: null,
    profileEmbedding: null,
    selectedIds: new Set(),
    isImporting: false,
    importProgress: { current: 0, total: 0, currentJob: null },

    // Search action
    search: async (criteria) => {
      // Cancel any in-progress scoring
      const { scoringAbortController } = get();
      if (scoringAbortController) {
        scoringAbortController.abort();
      }

      set({
        isSearching: true,
        isEnhancingQuery: false,
        enhancedQuery: null,
        searchError: null,
        results: [],
        criteria,
        selectedIds: new Set(),
        scoringProgress: { completed: 0, total: 0 },
        isScoring: false,
        scoringAbortController: null,
      });

      try {
        const { settings } = useAppStore.getState();
        let searchQuery = criteria.query;

        // If we have a valid candidate profile, enhance the search query with AI
        if (hasValidCandidateProfile(settings)) {
          set({ isEnhancingQuery: true });

          try {
            const candidateProfile = buildCandidateProfile(settings);
            const enhanced = await generateEnhancedSearchQuery(criteria.query, candidateProfile);
            if (enhanced && enhanced !== criteria.query) {
              searchQuery = enhanced;
              set({ enhancedQuery: enhanced });
              console.log('[JobSearch] Enhanced query:', enhanced);
            }
          } catch (error) {
            // Non-fatal: fall back to original query
            console.warn('[JobSearch] Query enhancement failed, using original:', error);
          }

          set({ isEnhancingQuery: false });
        }

        // Perform search with (possibly enhanced) query
        const rawResults = await searchJobs({ ...criteria, query: searchQuery });

        // Get existing jobs to check for duplicates
        const { jobs } = useAppStore.getState();

        // Enrich results with initial state
        const enrichedResults = enrichSearchResults(rawResults, jobs);

        set({
          results: enrichedResults,
          isSearching: false,
        });

        // Start scoring if we have a valid profile
        if (hasValidCandidateProfile(settings) && enrichedResults.length > 0) {
          get().startScoring(enrichedResults);
        }
      } catch (error) {
        const message =
          error instanceof JobSearchError
            ? error.message
            : 'An unexpected error occurred. Please try again.';
        set({ searchError: message, isSearching: false, isEnhancingQuery: false });
      }
    },

    // Start progressive scoring
    startScoring: async (results) => {
      const abortController = new AbortController();

      set({
        isScoring: true,
        scoringAbortController: abortController,
        scoringProgress: { completed: 0, total: results.length },
      });

      try {
        // Get or generate profile embedding
        const { settings } = useAppStore.getState();
        let profileEmbedding = get().profileEmbedding;

        if (!profileEmbedding) {
          profileEmbedding = await getCandidateProfileEmbedding(settings);
          set({ profileEmbedding });
        }

        // Score each job progressively
        for (let i = 0; i < results.length; i++) {
          // Check for abort
          if (abortController.signal.aborted) {
            console.log('[JobSearchStore] Scoring aborted');
            return;
          }

          const job = results[i];

          // Update status to calculating
          set((state) => ({
            results: state.results.map((r) =>
              r.jobId === job.jobId ? { ...r, scoreStatus: 'calculating' as const } : r
            ),
          }));

          // Score the job
          const scoredJob = await scoreJob(job, profileEmbedding);

          // Check for abort again
          if (abortController.signal.aborted) {
            return;
          }

          // Update result with score and re-sort
          set((state) => {
            const newResults = state.results.map((r) =>
              r.jobId === job.jobId ? scoredJob : r
            );

            // Sort by score (completed jobs first, then by score descending)
            newResults.sort((a, b) => {
              // Completed jobs first
              if (a.scoreStatus === 'complete' && b.scoreStatus !== 'complete') return -1;
              if (b.scoreStatus === 'complete' && a.scoreStatus !== 'complete') return 1;

              // Then by score descending
              return (b.matchScore ?? 0) - (a.matchScore ?? 0);
            });

            return {
              results: newResults,
              scoringProgress: { completed: i + 1, total: results.length },
            };
          });
        }

        set({ isScoring: false, scoringAbortController: null });
      } catch (error) {
        console.error('[JobSearchStore] Scoring failed:', error);
        set({ isScoring: false, scoringAbortController: null });
      }
    },

    // Clear results
    clearResults: () => {
      const { scoringAbortController } = get();
      if (scoringAbortController) {
        scoringAbortController.abort();
      }

      set({
        criteria: null,
        results: [],
        isSearching: false,
        searchError: null,
        scoringProgress: { completed: 0, total: 0 },
        isScoring: false,
        scoringAbortController: null,
        selectedIds: new Set(),
      });
    },

    // Toggle job selection
    toggleSelection: (jobId) => {
      set((state) => {
        const newSelectedIds = new Set(state.selectedIds);
        if (newSelectedIds.has(jobId)) {
          newSelectedIds.delete(jobId);
        } else {
          newSelectedIds.add(jobId);
        }
        return {
          selectedIds: newSelectedIds,
          results: state.results.map((r) => ({
            ...r,
            isSelected: newSelectedIds.has(r.jobId),
          })),
        };
      });
    },

    // Select all jobs
    selectAll: () => {
      set((state) => {
        const newSelectedIds = new Set(state.results.map((r) => r.jobId));
        return {
          selectedIds: newSelectedIds,
          results: state.results.map((r) => ({ ...r, isSelected: true })),
        };
      });
    },

    // Deselect all jobs
    deselectAll: () => {
      set((state) => ({
        selectedIds: new Set(),
        results: state.results.map((r) => ({ ...r, isSelected: false })),
      }));
    },

    // Import selected jobs with AI analysis
    importSelectedJobs: async () => {
      const { results, selectedIds } = get();
      const selectedJobs = results.filter((r) => selectedIds.has(r.jobId));

      if (selectedJobs.length === 0) {
        return [];
      }

      set({
        isImporting: true,
        importProgress: { current: 0, total: selectedJobs.length, currentJob: null },
      });

      try {
        const { settings, addJob } = useAppStore.getState();
        const defaultStatus = settings.statuses[0]?.name || 'Interested';
        const importedJobs: Job[] = [];

        for (let i = 0; i < selectedJobs.length; i++) {
          const result = selectedJobs[i];

          // Update progress
          set({
            importProgress: {
              current: i,
              total: selectedJobs.length,
              currentJob: `${result.company} - ${result.title}`,
            },
          });

          // Transform search result to job data
          const jobData = transformSearchResultToJob(result, defaultStatus);

          // Try to get AI analysis for the job description
          if (result.description) {
            try {
              console.log(`[JobSearch] Analyzing job ${i + 1}/${selectedJobs.length}: ${result.title}`);
              const analysis = await analyzeJobDescription(result.description);

              // Merge AI analysis with job data
              if (analysis.company) jobData.company = analysis.company;
              if (analysis.title) jobData.title = analysis.title;
              if (analysis.summary) jobData.summary = analysis.summary;
            } catch (error) {
              // Non-fatal: continue with basic data - user can analyze later
              console.warn(`[JobSearch] AI analysis failed for ${result.title}:`, error);
            }
          }

          // Add job to database
          const job = await addJob(jobData);
          importedJobs.push(job);

          // Mark as imported in results
          set((state) => ({
            results: state.results.map((r) =>
              r.jobId === result.jobId ? { ...r, isImported: true, isSelected: false } : r
            ),
          }));
        }

        // Clear selection and reset progress
        set({
          selectedIds: new Set(),
          isImporting: false,
          importProgress: { current: 0, total: 0, currentJob: null },
        });

        return importedJobs;
      } catch (error) {
        console.error('[JobSearchStore] Import failed:', error);
        set({
          isImporting: false,
          importProgress: { current: 0, total: 0, currentJob: null },
        });
        throw error;
      }
    },

    // Cancel scoring
    cancelScoring: () => {
      const { scoringAbortController } = get();
      if (scoringAbortController) {
        scoringAbortController.abort();
        set({ isScoring: false, scoringAbortController: null });
      }
    },

    // Invalidate profile cache
    invalidateProfile: () => {
      invalidateProfileCache();
      set({ profileEmbedding: null });
    },
  })
);
