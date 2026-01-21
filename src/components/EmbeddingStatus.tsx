/**
 * EmbeddingStatus Component
 *
 * Displays the status of the embedding system in the UI.
 * Shows download/indexing progress and allows manual reindexing.
 */

import { useState } from 'react';
import { Brain, RefreshCw, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useEmbeddingStore, selectEmbeddingStatus, selectIndexingProgress } from '../services/embeddings';
import { useAppStore } from '../stores/appStore';
import { Button } from './ui';

export function EmbeddingStatus() {
  const status = useEmbeddingStore(selectEmbeddingStatus);
  const { isIndexing, progress: indexingProgress } = useEmbeddingStore(selectIndexingProgress);
  const { initialize, indexAllContent } = useEmbeddingStore();
  const { jobs, settings } = useAppStore();

  const [showDetails, setShowDetails] = useState(false);

  // Handle reindex all
  const handleReindex = async () => {
    try {
      await indexAllContent(
        jobs,
        settings.savedStories || [],
        settings.contextDocuments || []
      );
    } catch (error) {
      console.error('Failed to reindex:', error);
    }
  };

  // Handle initialize
  const handleInitialize = async () => {
    try {
      await initialize();
    } catch (error) {
      console.error('Failed to initialize embeddings:', error);
    }
  };

  // Render status icon
  const StatusIcon = () => {
    if (status.isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (status.stage === 'error') {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (status.isReady) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    return <Brain className="w-4 h-4 text-slate-400 dark:text-slate-500" />;
  };

  // Status label
  const getStatusLabel = () => {
    if (isIndexing && indexingProgress) {
      return `Indexing ${indexingProgress.current}/${indexingProgress.total}...`;
    }
    if (status.isLoading) {
      if (status.stage === 'download') {
        return `Downloading model... ${Math.round(status.progress)}%`;
      }
      return 'Loading model...';
    }
    if (status.stage === 'error') {
      return 'Error';
    }
    if (status.isReady) {
      return `${status.indexedCount} items indexed`;
    }
    return 'Not initialized';
  };

  return (
    <div className="relative">
      {/* Compact status indicator */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted
          hover:bg-surface-raised rounded-lg transition-colors"
        title="Semantic Search Status"
      >
        <StatusIcon />
        <span className="hidden sm:inline">{getStatusLabel()}</span>
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-72 bg-surface rounded-lg shadow-lg
          border border-border z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Semantic Search
            </h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              &times;
            </button>
          </div>

          {/* Status details */}
          <div className="space-y-3">
            {/* Model status */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Model:</span>
              <span className={`font-medium ${
                status.isReady ? 'text-green-600 dark:text-green-400' :
                status.isLoading ? 'text-blue-600 dark:text-blue-400' :
                status.stage === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-slate-500'
              }`}>
                {status.isReady ? 'Ready' :
                 status.isLoading ? 'Loading...' :
                 status.stage === 'error' ? 'Error' :
                 'Not loaded'}
              </span>
            </div>

            {/* Download progress */}
            {status.isLoading && status.stage === 'download' && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Downloading model...</span>
                  <span>{Math.round(status.progress)}%</span>
                </div>
                <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Indexed count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Indexed items:</span>
              <span className="font-medium text-foreground">
                {status.indexedCount}
              </span>
            </div>

            {/* Indexing progress */}
            {isIndexing && indexingProgress && (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Indexing {indexingProgress.entityType}...</span>
                  <span>{indexingProgress.current}/{indexingProgress.total}</span>
                </div>
                <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(indexingProgress.current / indexingProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {status.error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {status.error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-border">
              {!status.isReady && !status.isLoading && (
                <Button
                  size="sm"
                  onClick={handleInitialize}
                  className="flex-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Initialize
                </Button>
              )}
              {status.isReady && !isIndexing && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleReindex}
                  className="flex-1"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reindex All
                </Button>
              )}
            </div>

            {/* Info text */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Semantic search uses AI embeddings to find relevant context for your prompts.
              The model (~40MB) is downloaded once and cached locally.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
