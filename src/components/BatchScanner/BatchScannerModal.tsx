/**
 * Batch Scanner Modal
 *
 * Main modal for scanning multiple career pages and importing jobs.
 * Shows URL input, scanning progress, and scored results.
 */

import { useEffect } from 'react';
import {
  Search,
  FileText,
  Loader2,
  CheckSquare,
  Square,
  X,
  Download,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../stores/appStore';
import { useBatchScannerStore } from '../../stores/batchScannerStore';
import { canScore } from '../../services/batchScanner';
import { UrlInputForm } from './UrlInputForm';
import { ScanProgressPanel } from './ScanProgressPanel';
import { ScanResultsTable } from './ScanResultsTable';

export function BatchScannerModal() {
  const {
    isBatchScannerModalOpen,
    closeBatchScannerModal,
    openSettingsModal,
  } = useAppStore();

  const {
    parsedUrls,
    scannedUrls,
    isScanning,
    scanProgress,
    scoredJobs,
    isScoring,
    scoringProgress,
    selectedIds,
    isImporting,
    importProgress,
    startScan,
    cancelScan,
    toggleSelection,
    selectAll,
    deselectAll,
    importSelected,
    clearResults,
    reset,
  } = useBatchScannerStore();

  // Reset state when modal closes
  useEffect(() => {
    if (!isBatchScannerModalOpen) {
      reset();
    }
  }, [isBatchScannerModalOpen, reset]);

  const scoreCheck = canScore();
  const hasResults = scoredJobs.length > 0;
  const selectedCount = selectedIds.size;
  const importableCount = scoredJobs.filter(j => !j.isImported).length;

  const handleStartScan = async () => {
    await startScan();
  };

  const handleImport = async () => {
    await importSelected();
  };

  const handleOpenSettings = () => {
    closeBatchScannerModal();
    openSettingsModal();
  };

  // Determine what to show
  const showInput = !isScanning && !isScoring && scoredJobs.length === 0;
  const showProgress = isScanning || isScoring;
  const showResults = !isScanning && !isScoring && hasResults;

  return (
    <Modal
      isOpen={isBatchScannerModalOpen}
      onClose={closeBatchScannerModal}
      title="Batch Job Scanner"
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Input Phase */}
        {showInput && (
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
        {showProgress && (
          <div className="p-6">
            <ScanProgressPanel
              scannedUrls={scannedUrls}
              scanProgress={scanProgress}
              isScanning={isScanning}
              isScoring={isScoring}
              scoringProgress={scoringProgress}
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
        {showResults && (
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
                        onClick={selectAll}
                        disabled={selectedCount === importableCount}
                      >
                        <CheckSquare className="w-4 h-4 mr-1" />
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAll}
                        disabled={selectedCount === 0}
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
                    onClick={clearResults}
                  >
                    Clear Results
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={selectedCount === 0 || isImporting}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing {importProgress.current}/{importProgress.total}...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Import {selectedCount} Selected
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Import progress */}
              {isImporting && importProgress.currentJob && (
                <p className="mt-2 text-sm text-foreground-muted">
                  Importing: {importProgress.currentJob}
                </p>
              )}
            </div>

            {/* Results Table */}
            <div className="flex-1 overflow-auto">
              <ScanResultsTable
                jobs={scoredJobs}
                onToggleSelect={toggleSelection}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
