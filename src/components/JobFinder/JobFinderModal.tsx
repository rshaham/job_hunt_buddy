/**
 * Job Finder Modal
 *
 * Main modal for searching jobs via SerApi and importing them
 * with resume match scoring.
 */

import { useEffect } from 'react';
import { Search, FileText, CheckSquare, Square, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useJobSearchStore } from '../../stores/jobSearchStore';
import { hasValidCandidateProfile } from '../../services/jobSearch';
import { SearchForm } from './SearchForm';
import { SearchResultCard } from './SearchResultCard';

export function JobFinderModal() {
  const {
    isJobFinderModalOpen,
    closeJobFinderModal,
    openSettingsModal,
    settings,
  } = useAppStore();

  const {
    results,
    isSearching,
    isEnhancingQuery,
    enhancedQuery,
    searchError,
    scoringProgress,
    isScoring,
    selectedIds,
    isImporting,
    importProgress,
    search,
    clearResults,
    toggleSelection,
    selectAll,
    deselectAll,
    importSelectedJobs,
  } = useJobSearchStore();

  // Clear results when modal closes
  useEffect(() => {
    if (!isJobFinderModalOpen) {
      clearResults();
    }
  }, [isJobFinderModalOpen, clearResults]);

  const hasResume = hasValidCandidateProfile(settings);
  const selectedCount = selectedIds.size;
  const hasResults = results.length > 0;

  const handleImport = async () => {
    try {
      const imported = await importSelectedJobs();
      if (imported.length > 0) {
        // Could show a toast here
        console.log(`Imported ${imported.length} jobs`);
      }
    } catch (error) {
      console.error('Failed to import jobs:', error);
    }
  };

  const handleOpenSettings = () => {
    closeJobFinderModal();
    openSettingsModal();
  };

  return (
    <Modal
      isOpen={isJobFinderModalOpen}
      onClose={closeJobFinderModal}
      title="Job Finder"
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Search Form */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <SearchForm
            onSearch={search}
            isSearching={isSearching}
            disabled={!hasResume}
          />

          {/* Resume required warning */}
          {!hasResume && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Resume Required
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Upload your resume in Settings to search for jobs and see match scores.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleOpenSettings}
                    className="mt-2"
                  >
                    Open Settings
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        {hasResults && (
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span>{results.length} jobs found</span>
                {isScoring && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Calculating matches: {scoringProgress.completed}/{scoringProgress.total}
                  </span>
                )}
                <span>{selectedCount} selected</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={isImporting}
                >
                  <CheckSquare className="w-4 h-4 mr-1.5" />
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  disabled={isImporting || selectedCount === 0}
                >
                  <Square className="w-4 h-4 mr-1.5" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error State */}
          {searchError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              {searchError}
            </div>
          )}

          {/* Empty State - Before Search */}
          {!hasResults && !isSearching && !searchError && hasResume && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                Search for jobs to get started
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Enter keywords like "React Developer" or "Product Manager" to find jobs
                and see how well they match your profile.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                {isEnhancingQuery ? 'Optimizing search for your profile...' : 'Searching for jobs...'}
              </h3>
              {enhancedQuery && !isEnhancingQuery && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  Searching: "{enhancedQuery}"
                </p>
              )}
            </div>
          )}

          {/* Results List */}
          {hasResults && !isSearching && (
            <div className="space-y-3" role="listbox" aria-label="Job search results">
              {results.map((job) => (
                <SearchResultCard
                  key={job.jobId}
                  job={job}
                  onToggleSelect={toggleSelection}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              {/* Import Progress */}
              {isImporting && importProgress.total > 0 ? (
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Analyzing job {importProgress.current + 1} of {importProgress.total}
                    </span>
                  </div>
                  {importProgress.currentJob && (
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 truncate max-w-md">
                      {importProgress.currentJob}
                    </p>
                  )}
                </div>
              ) : (
                <div /> // Spacer
              )}

              <Button
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Add ${selectedCount} Job${selectedCount !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
