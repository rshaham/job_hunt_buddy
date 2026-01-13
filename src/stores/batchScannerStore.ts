/**
 * Batch Scanner Store
 *
 * Zustand state management for the batch job scanning feature.
 * Handles URL parsing, scanning progress, results, and job selection/import.
 */

import { create } from 'zustand';
import type {
  CareerPageUrl,
  ScannedUrl,
  ScoredJob,
  SortField,
  SortDirection,
  BatchScanProgress,
  ScoringProgress,
} from '../types/batchScanner';
import {
  fetchAndExtractJobs,
  scoreBatch,
  canScore,
  extractCareerKeywords,
  isJobTitleRelevant,
  fetchJobFullDescription,
} from '../services/batchScanner';
import { useAppStore } from './appStore';
import { generateId } from '../utils/helpers';
import { analyzeJobDescription } from '../services/ai';

// ============================================================================
// Types
// ============================================================================

interface BatchScannerState {
  // Input
  urlInput: string;
  parsedUrls: CareerPageUrl[];

  // Scan state
  scannedUrls: ScannedUrl[];
  isScanning: boolean;
  scanProgress: BatchScanProgress;
  scanAbortController: AbortController | null;

  // Scoring state
  scoredJobs: ScoredJob[];
  isScoring: boolean;
  scoringProgress: ScoringProgress;

  // Selection & Import
  selectedIds: Set<string>;
  isImporting: boolean;
  importProgress: { current: number; total: number; currentJob: string | null };

  // Sorting
  sortBy: SortField;
  sortDirection: SortDirection;

  // Actions
  setUrlInput: (input: string) => void;
  parseUrls: () => void;
  startScan: () => Promise<void>;
  cancelScan: () => void;
  toggleSelection: (jobId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  importSelected: () => Promise<void>;
  setSortBy: (field: SortField) => void;
  toggleSortDirection: () => void;
  clearResults: () => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  urlInput: '',
  parsedUrls: [],
  scannedUrls: [],
  isScanning: false,
  scanProgress: { urlsTotal: 0, urlsComplete: 0, jobsFound: 0 },
  scanAbortController: null,
  scoredJobs: [],
  isScoring: false,
  scoringProgress: { total: 0, completed: 0 },
  selectedIds: new Set<string>(),
  isImporting: false,
  importProgress: { current: 0, total: 0, currentJob: null },
  sortBy: 'resumeFit' as SortField,
  sortDirection: 'desc' as SortDirection,
};

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * Parse URL input text into CareerPageUrl objects.
 * Supports formats:
 * - Plain URL: https://company.com/careers
 * - With company hint: Company Name, https://company.com/careers
 * - With company hint: Company Name - https://company.com/careers
 * - Numbered list: 1. Company Name - https://company.com/careers
 */
function parseUrlInput(input: string): CareerPageUrl[] {
  const lines = input.split('\n').map(line => line.trim()).filter(Boolean);
  const urls: CareerPageUrl[] = [];

  for (const line of lines) {
    // Skip comment lines
    if (line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Remove numbering (1. 2. etc.)
    const cleanLine = line.replace(/^\d+\.\s*/, '');

    // Try to extract URL
    const urlMatch = cleanLine.match(/(https?:\/\/[^\s,]+)/i);
    if (!urlMatch) {
      continue;
    }

    const url = urlMatch[1];

    // Try to extract company hint (text before the URL)
    let companyHint: string | undefined;
    const beforeUrl = cleanLine.slice(0, cleanLine.indexOf(url)).trim();
    if (beforeUrl) {
      // Remove common separators
      companyHint = beforeUrl.replace(/[-–,:\s]+$/, '').trim();
      if (companyHint.length < 2) {
        companyHint = undefined;
      }
    }

    urls.push({
      id: generateId(),
      url,
      companyHint,
    });
  }

  return urls;
}

// ============================================================================
// Store
// ============================================================================

export const useBatchScannerStore = create<BatchScannerState>((set, get) => ({
  ...initialState,

  setUrlInput: (input: string) => {
    set({ urlInput: input });
  },

  parseUrls: () => {
    const { urlInput } = get();
    const parsedUrls = parseUrlInput(urlInput);
    set({ parsedUrls });
  },

  startScan: async () => {
    const { parsedUrls } = get();
    if (parsedUrls.length === 0) {
      return;
    }

    // Check if scoring is possible
    const scoreCheck = canScore();
    if (!scoreCheck.canScore) {
      console.warn('[BatchScanner] Cannot score:', scoreCheck.reason);
      // Continue anyway - we'll show jobs without scores
    }

    // Initialize scan state
    const abortController = new AbortController();
    set({
      isScanning: true,
      scanAbortController: abortController,
      scannedUrls: parsedUrls.map(url => ({
        id: url.id,
        original: url,
        status: 'pending',
        extractedJobs: [],
      })),
      scoredJobs: [],
      selectedIds: new Set(),
      scanProgress: {
        urlsTotal: parsedUrls.length,
        urlsComplete: 0,
        jobsFound: 0,
      },
    });

    // Extract career keywords for filtering
    const careerKeywords = extractCareerKeywords();
    console.log('[BatchScanner] Career keywords for filtering:', careerKeywords);

    // Phase 1: Process each URL and filter by relevance
    const allJobs: Array<{ job: { id: string; title: string; url: string; description?: string; descriptionSnippet?: string; location?: string; department?: string }; company: string; sourceUrlId: string }> = [];

    for (let i = 0; i < parsedUrls.length; i++) {
      // Check for abort
      if (abortController.signal.aborted) {
        break;
      }

      const urlEntry = parsedUrls[i];

      // Update status to fetching
      set(state => ({
        scannedUrls: state.scannedUrls.map(u =>
          u.id === urlEntry.id ? { ...u, status: 'fetching' } : u
        ),
        scanProgress: {
          ...state.scanProgress,
          currentUrl: urlEntry.companyHint || urlEntry.url,
        },
      }));

      try {
        // Fetch and extract jobs
        const result = await fetchAndExtractJobs(urlEntry.url);

        if (abortController.signal.aborted) break;

        if (result.success && result.result) {
          const { jobs, company } = result.result;
          const finalCompany = urlEntry.companyHint || company;

          // Filter jobs by title relevance (Phase 1 filtering)
          const relevantJobs = jobs.filter(job =>
            isJobTitleRelevant(job.title, careerKeywords)
          );

          console.log(`[BatchScanner] ${finalCompany}: ${jobs.length} jobs found, ${relevantJobs.length} relevant`);

          // Add relevant jobs to collection
          for (const job of relevantJobs) {
            allJobs.push({
              job,
              company: finalCompany,
              sourceUrlId: urlEntry.id,
            });
          }

          // Update scanned URL
          set(state => ({
            scannedUrls: state.scannedUrls.map(u =>
              u.id === urlEntry.id
                ? {
                    ...u,
                    status: 'complete',
                    finalUrl: result.finalUrl,
                    extractedJobs: jobs,
                    extractionResult: result.result,
                  }
                : u
            ),
            scanProgress: {
              ...state.scanProgress,
              urlsComplete: state.scanProgress.urlsComplete + 1,
              jobsFound: state.scanProgress.jobsFound + jobs.length,
            },
          }));
        } else {
          // Extraction failed
          set(state => ({
            scannedUrls: state.scannedUrls.map(u =>
              u.id === urlEntry.id
                ? {
                    ...u,
                    status: 'error',
                    finalUrl: result.finalUrl,
                    error: result.error || 'Failed to extract jobs',
                  }
                : u
            ),
            scanProgress: {
              ...state.scanProgress,
              urlsComplete: state.scanProgress.urlsComplete + 1,
            },
          }));
        }
      } catch (error) {
        console.error(`[BatchScanner] Error processing ${urlEntry.url}:`, error);
        set(state => ({
          scannedUrls: state.scannedUrls.map(u =>
            u.id === urlEntry.id
              ? {
                  ...u,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : u
          ),
          scanProgress: {
            ...state.scanProgress,
            urlsComplete: state.scanProgress.urlsComplete + 1,
          },
        }));
      }
    }

    // Phase 2: Fetch full descriptions for relevant jobs
    if (allJobs.length > 0 && !abortController.signal.aborted) {
      console.log(`[BatchScanner] Phase 2: Fetching full descriptions for ${allJobs.length} relevant jobs`);

      set(state => ({
        scanProgress: {
          ...state.scanProgress,
          currentUrl: `Fetching details: 0/${allJobs.length}`,
        },
      }));

      for (let i = 0; i < allJobs.length; i++) {
        if (abortController.signal.aborted) break;

        const { job, company } = allJobs[i];

        set(state => ({
          scanProgress: {
            ...state.scanProgress,
            currentUrl: `Fetching details: ${i + 1}/${allJobs.length} - ${job.title}`,
          },
        }));

        // Fetch full description
        const fullDesc = await fetchJobFullDescription(job.url);
        if (fullDesc) {
          job.description = fullDesc;
          console.log(`[BatchScanner] Got full description for: ${job.title} at ${company}`);
        }
      }
    }

    // Scanning complete, start scoring if we have jobs
    set({ isScanning: false, scanAbortController: null });

    if (allJobs.length > 0 && !abortController.signal.aborted) {
      set({
        isScoring: true,
        scoringProgress: { total: allJobs.length, completed: 0 },
      });

      try {
        const scoredJobs = await scoreBatch(allJobs, (completed, total) => {
          set({ scoringProgress: { total, completed } });
        });

        // Sort by default sort field
        const { sortBy, sortDirection } = get();
        const sorted = sortJobs(scoredJobs, sortBy, sortDirection);

        set({ scoredJobs: sorted, isScoring: false });
      } catch (error) {
        console.error('[BatchScanner] Scoring error:', error);
        // Still show jobs without scores
        const unscoredJobs: ScoredJob[] = allJobs.map(({ job, company, sourceUrlId }) => ({
          ...job,
          sourceUrlId,
          company,
          scoreStatus: 'error',
          isSelected: false,
          isImported: false,
        }));
        set({ scoredJobs: unscoredJobs, isScoring: false });
      }
    }
  },

  cancelScan: () => {
    const { scanAbortController } = get();
    if (scanAbortController) {
      scanAbortController.abort();
    }
    set({ isScanning: false, isScoring: false, scanAbortController: null });
  },

  toggleSelection: (jobId: string) => {
    set(state => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(jobId)) {
        newSelected.delete(jobId);
      } else {
        newSelected.add(jobId);
      }
      return {
        selectedIds: newSelected,
        scoredJobs: state.scoredJobs.map(j =>
          j.id === jobId ? { ...j, isSelected: newSelected.has(jobId) } : j
        ),
      };
    });
  },

  selectAll: () => {
    set(state => {
      const allIds = new Set(state.scoredJobs.filter(j => !j.isImported).map(j => j.id));
      return {
        selectedIds: allIds,
        scoredJobs: state.scoredJobs.map(j => ({
          ...j,
          isSelected: !j.isImported,
        })),
      };
    });
  },

  deselectAll: () => {
    set(state => ({
      selectedIds: new Set(),
      scoredJobs: state.scoredJobs.map(j => ({ ...j, isSelected: false })),
    }));
  },

  importSelected: async () => {
    const { scoredJobs, selectedIds } = get();
    const jobsToImport = scoredJobs.filter(j => selectedIds.has(j.id) && !j.isImported);

    if (jobsToImport.length === 0) {
      return;
    }

    set({
      isImporting: true,
      importProgress: { current: 0, total: jobsToImport.length, currentJob: null },
    });

    const { addJob, settings } = useAppStore.getState();
    const defaultStatus = settings.statuses[0]?.name || 'Interested';

    for (let i = 0; i < jobsToImport.length; i++) {
      const job = jobsToImport[i];

      set({
        importProgress: {
          current: i + 1,
          total: jobsToImport.length,
          currentJob: `${job.company} - ${job.title}`,
        },
      });

      try {
        // Use full description if available, otherwise fall back to snippet
        const jobDescription = job.description || job.descriptionSnippet || '';

        // Try to analyze the job if we have a description
        let summary = null;
        if (jobDescription.length > 50) {
          try {
            const analysis = await analyzeJobDescription(jobDescription);
            summary = analysis.summary;
          } catch {
            // Analysis failed, continue without summary
          }
        }

        // Create the job with full description
        await addJob({
          company: job.company,
          title: job.title,
          jdLink: job.url,
          jdText: jobDescription,
          status: defaultStatus,
          summary,
          resumeAnalysis: null,
          coverLetter: null,
          contacts: [],
          notes: [],
          timeline: [
            {
              id: generateId(),
              type: 'import',
              description: 'Imported from batch scan',
              date: new Date(),
            },
          ],
          prepMaterials: [],
          qaHistory: [],
          learningTasks: [],
        });

        // Mark as imported
        set(state => ({
          scoredJobs: state.scoredJobs.map(j =>
            j.id === job.id ? { ...j, isImported: true, isSelected: false } : j
          ),
          selectedIds: new Set([...state.selectedIds].filter(id => id !== job.id)),
        }));
      } catch (error) {
        console.error(`[BatchScanner] Failed to import job ${job.id}:`, error);
      }
    }

    set({
      isImporting: false,
      importProgress: { current: 0, total: 0, currentJob: null },
    });
  },

  setSortBy: (field: SortField) => {
    const { sortBy, sortDirection, scoredJobs } = get();

    // If clicking the same field, toggle direction
    const newDirection = field === sortBy && sortDirection === 'desc' ? 'asc' : 'desc';

    const sorted = sortJobs(scoredJobs, field, newDirection);
    set({
      sortBy: field,
      sortDirection: newDirection,
      scoredJobs: sorted,
    });
  },

  toggleSortDirection: () => {
    const { sortBy, sortDirection, scoredJobs } = get();
    const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    const sorted = sortJobs(scoredJobs, sortBy, newDirection);
    set({ sortDirection: newDirection, scoredJobs: sorted });
  },

  clearResults: () => {
    set({
      scannedUrls: [],
      scoredJobs: [],
      selectedIds: new Set(),
      scanProgress: { urlsTotal: 0, urlsComplete: 0, jobsFound: 0 },
      scoringProgress: { total: 0, completed: 0 },
    });
  },

  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sort jobs by the specified field and direction.
 */
function sortJobs(
  jobs: ScoredJob[],
  field: SortField,
  direction: SortDirection
): ScoredJob[] {
  const sorted = [...jobs].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'resumeFit':
        comparison = (a.resumeFitScore ?? 0) - (b.resumeFitScore ?? 0);
        break;
      case 'trajectoryFit':
        comparison = (a.trajectoryFitScore ?? 0) - (b.trajectoryFitScore ?? 0);
        break;
      case 'company':
        comparison = a.company.localeCompare(b.company);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sorted;
}
