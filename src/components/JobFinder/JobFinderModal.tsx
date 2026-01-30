/**
 * Job Finder Modal
 *
 * Main modal for discovering jobs via search or batch scanning career pages.
 * Contains two tabs: Search (SerApi) and Batch Scan (career page scanner).
 */

import { useEffect, useState } from 'react';
import { Search, FileText, CheckSquare, Square, Loader2, Link2, X, Download } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { ExternalServiceConsent } from '../ui/ExternalServiceConsent';
import { useAppStore } from '../../stores/appStore';
import { useJobSearchStore } from '../../stores/jobSearchStore';
import { useBatchScannerStore } from '../../stores/batchScannerStore';
import { hasValidCandidateProfile } from '../../services/jobSearch';
import { canScore } from '../../services/batchScanner';
import { isFeatureAvailable } from '../../utils/featureFlags';
import { SearchForm } from './SearchForm';
import { SearchResultCard } from './SearchResultCard';
import { JobPreviewModal } from './JobPreviewModal';
import { UrlInputForm } from '../BatchScanner/UrlInputForm';
import { ScanProgressPanel } from '../BatchScanner/ScanProgressPanel';
import { ScanResultsTable } from '../BatchScanner/ScanResultsTable';
import type { EnrichedSearchResult } from '../../types/jobSearch';

export function JobFinderModal() {
  const {
    isJobFinderModalOpen,
    jobFinderInitialTab,
    closeJobFinderModal,
    openSettingsModal,
    settings,
    updateSettings,
  } = useAppStore();

  // Search store
  const {
    results,
    isSearching,
    isEnhancingQuery,
    enhancedQuery,
    searchError,
    scoringProgress,
    isScoring: isSearchScoring,
    selectedIds: searchSelectedIds,
    isImporting: isSearchImporting,
    importProgress: searchImportProgress,
    aiSearchQueries,
    aiSearchStats,
    search,
    clearResults: clearSearchResults,
    toggleSelection: toggleSearchSelection,
    selectAll: selectAllSearch,
    deselectAll: deselectAllSearch,
    importSelectedJobs,
  } = useJobSearchStore();

  // Batch scanner store
  const {
    parsedUrls,
    scannedUrls,
    isScanning,
    scanProgress,
    scoredJobs,
    isScoring: isBatchScoring,
    scoringProgress: batchScoringProgress,
    selectedIds: batchSelectedIds,
    isImporting: isBatchImporting,
    importProgress: batchImportProgress,
    startScan,
    cancelScan,
    toggleSelection: toggleBatchSelection,
    selectAll: selectAllBatch,
    deselectAll: deselectAllBatch,
    importSelected: importBatchSelected,
    clearResults: clearBatchResults,
    reset: resetBatch,
  } = useBatchScannerStore();

  // State for preview modal
  const [previewJob, setPreviewJob] = useState<EnrichedSearchResult | null>(null);

  // Tab state - controlled by store's initial value
  const [activeTab, setActiveTab] = useState<string>(jobFinderInitialTab);

  // Set active tab when modal opens with a specific tab
  useEffect(() => {
    if (isJobFinderModalOpen) {
      setActiveTab(jobFinderInitialTab);
    }
  }, [isJobFinderModalOpen, jobFinderInitialTab]);

  // Clear results when modal closes
  useEffect(() => {
    if (!isJobFinderModalOpen) {
      clearSearchResults();
      resetBatch();
    }
  }, [isJobFinderModalOpen, clearSearchResults, resetBatch]);

  const hasResume = hasValidCandidateProfile(settings);
  const searchSelectedCount = searchSelectedIds.size;
  const hasSearchResults = results.length > 0;

  // Batch scanner state
  const scoreCheck = canScore();
  const hasBatchResults = scoredJobs.length > 0;
  const batchSelectedCount = batchSelectedIds.size;
  const importableCount = scoredJobs.filter(j => !j.isImported).length;

  // Check feature availability
  const { available, reason } = isFeatureAvailable('jobSearch', settings);

  const handleConsent = async () => {
    await updateSettings({
      externalServicesConsent: {
        ...settings.externalServicesConsent,
        jobSearch: true,
        consentedAt: new Date(),
      },
    });
  };

  const handleSearchImport = async () => {
    try {
      const imported = await importSelectedJobs();
      if (imported.length > 0) {
        console.log(`Imported ${imported.length} jobs`);
      }
    } catch (error) {
      console.error('Failed to import jobs:', error);
    }
  };

  const handleBatchImport = async () => {
    await importBatchSelected();
  };

  const handleOpenSettings = () => {
    closeJobFinderModal();
    openSettingsModal();
  };

  const handleStartScan = async () => {
    await startScan();
  };

  // Batch scanner view states
  const showBatchInput = !isScanning && !isBatchScoring && scoredJobs.length === 0;
  const showBatchProgress = isScanning || isBatchScoring;
  const showBatchResults = !isScanning && !isBatchScoring && hasBatchResults;

  // Show consent dialog if no consent (for search tab)
  if (!available && reason === 'no_consent') {
    return (
      <Modal
        isOpen={isJobFinderModalOpen}
        onClose={closeJobFinderModal}
        title="Find Jobs"
        size="lg"
      >
        <ExternalServiceConsent
          service="jobSearch"
          onConsent={handleConsent}
          onDecline={closeJobFinderModal}
        />
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isJobFinderModalOpen}
      onClose={closeJobFinderModal}
      title="Find Jobs"
      size="full"
    >
      <div className="flex flex-col h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab Navigation */}
          <div className="px-4 pt-4 border-b border-border bg-surface">
            <TabsList>
              <TabsTrigger value="search">
                <Search className="w-4 h-4 mr-2" />
                Search
              </TabsTrigger>
              <TabsTrigger value="batch">
                <Link2 className="w-4 h-4 mr-2" />
                Batch Scan
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden">
            {/* Search Form */}
            <div className="p-4 border-b border-border">
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
            {hasSearchResults && (
              <div className="px-4 py-3 border-b border-border bg-surface">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-foreground-muted">
                    <span>{results.length} jobs found</span>
                    {aiSearchStats && (
                      <span className="text-purple-600 dark:text-purple-400">
                        ({aiSearchStats.totalFound} total, {aiSearchStats.totalAfterDedup} unique)
                      </span>
                    )}
                    {isSearchScoring && (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Calculating matches: {scoringProgress.completed}/{scoringProgress.total}
                      </span>
                    )}
                    <span>{searchSelectedCount} selected</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllSearch}
                      disabled={isSearchImporting}
                    >
                      <CheckSquare className="w-4 h-4 mr-1.5" />
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllSearch}
                      disabled={isSearchImporting || searchSelectedCount === 0}
                    >
                      <Square className="w-4 h-4 mr-1.5" />
                      Clear
                    </Button>
                  </div>
                </div>
                {/* AI Search queries used */}
                {aiSearchQueries && aiSearchQueries.length > 0 && (
                  <div className="mt-2 text-xs text-foreground-muted">
                    <span className="text-purple-600 dark:text-purple-400 font-medium">AI queries:</span>{' '}
                    {aiSearchQueries.map((q, i) => (
                      <span key={i}>
                        {i > 0 && ' • '}
                        <span className="text-foreground-muted">"{q}"</span>
                      </span>
                    ))}
                  </div>
                )}
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
              {!hasSearchResults && !isSearching && !searchError && hasResume && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Search className="w-12 h-12 text-foreground-subtle mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Search for jobs to get started
                  </h3>
                  <p className="text-foreground-muted max-w-md">
                    Enter keywords like "React Developer" or "Product Manager" to find jobs
                    and see how well they match your profile.
                  </p>
                </div>
              )}

              {/* Loading State */}
              {isSearching && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {isEnhancingQuery
                      ? 'AI is generating search queries and ranking results...'
                      : 'Searching for jobs...'}
                  </h3>
                  <p className="text-sm text-foreground-muted max-w-md">
                    {isEnhancingQuery
                      ? 'Analyzing your profile and generating multiple search strategies'
                      : enhancedQuery
                        ? `Searching: "${enhancedQuery}"`
                        : 'Finding jobs that match your criteria'}
                  </p>
                </div>
              )}

              {/* Results List */}
              {hasSearchResults && !isSearching && (
                <div className="space-y-3" role="listbox" aria-label="Job search results">
                  {results.map((job) => (
                    <SearchResultCard
                      key={job.jobId}
                      job={job}
                      onToggleSelect={toggleSearchSelection}
                      onPreview={setPreviewJob}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {hasSearchResults && (
              <div className="px-4 py-3 border-t border-border bg-surface">
                <div className="flex items-center justify-between">
                  {/* Import Progress */}
                  {isSearchImporting && searchImportProgress.total > 0 ? (
                    <div className="flex-1 mr-4">
                      <div className="flex items-center gap-2 text-sm text-foreground-muted">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          Analyzing job {searchImportProgress.current + 1} of {searchImportProgress.total}
                        </span>
                      </div>
                      {searchImportProgress.currentJob && (
                        <p className="text-xs text-foreground-muted mt-0.5 truncate max-w-md">
                          {searchImportProgress.currentJob}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div /> // Spacer
                  )}

                  <Button
                    onClick={handleSearchImport}
                    disabled={searchSelectedCount === 0 || isSearchImporting}
                  >
                    {isSearchImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      `Add ${searchSelectedCount} Job${searchSelectedCount !== 1 ? 's' : ''}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Batch Scan Tab */}
          <TabsContent value="batch" className="flex-1 flex flex-col overflow-hidden">
            {/* Input Phase */}
            {showBatchInput && (
              <>
                {/* Input Header with Scan Button */}
                <div className="px-6 py-4 border-b border-border bg-surface flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Add URLs to Scan</h3>
                    <p className="text-sm text-foreground-muted">Paste career page URLs below</p>
                  </div>
                  <Button
                    onClick={handleStartScan}
                    disabled={parsedUrls.length === 0}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Scan {parsedUrls.length} {parsedUrls.length === 1 ? 'URL' : 'URLs'}
                  </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-6">
                  {/* Scoring capability warning */}
                  {!scoreCheck.canScore && (
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Limited Scoring
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            {scoreCheck.reason}
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

                  {/* URL Input */}
                  <UrlInputForm />
                </div>
              </>
            )}

            {/* Progress Phase */}
            {showBatchProgress && (
              <div className="p-6">
                <ScanProgressPanel
                  scannedUrls={scannedUrls}
                  scanProgress={scanProgress}
                  isScanning={isScanning}
                  isScoring={isBatchScoring}
                  scoringProgress={batchScoringProgress}
                />

                <div className="mt-4 flex justify-end">
                  <Button variant="secondary" onClick={cancelScan}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Results Phase */}
            {showBatchResults && (
              <>
                {/* Results Header */}
                <div className="px-6 py-4 border-b border-border bg-surface">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-medium text-foreground">
                        {scoredJobs.length} Jobs Found
                      </h3>
                      {importableCount > 0 && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllBatch}
                            disabled={batchSelectedCount === importableCount}
                          >
                            <CheckSquare className="w-4 h-4 mr-1" />
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAllBatch}
                            disabled={batchSelectedCount === 0}
                          >
                            <Square className="w-4 h-4 mr-1" />
                            Deselect
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={clearBatchResults}
                      >
                        Clear Results
                      </Button>
                      <Button
                        onClick={handleBatchImport}
                        disabled={batchSelectedCount === 0 || isBatchImporting}
                      >
                        {isBatchImporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing {batchImportProgress.current}/{batchImportProgress.total}...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Import {batchSelectedCount} Selected
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Import progress */}
                  {isBatchImporting && batchImportProgress.currentJob && (
                    <p className="mt-2 text-sm text-foreground-muted">
                      Importing: {batchImportProgress.currentJob}
                    </p>
                  )}
                </div>

                {/* Results Table */}
                <div className="flex-1 overflow-auto">
                  <ScanResultsTable
                    jobs={scoredJobs}
                    onToggleSelect={toggleBatchSelection}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Job Preview Modal */}
        <JobPreviewModal
          isOpen={!!previewJob}
          onClose={() => setPreviewJob(null)}
          job={previewJob}
          isImported={previewJob?.isImported}
        />
      </div>
    </Modal>
  );
}
