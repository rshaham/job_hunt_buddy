import { useState, useMemo } from 'react';
import { Plus, Loader2, Sparkles, Copy, Check, Trash2, Star, FileText, List, MoreVertical } from 'lucide-react';
import { Button, Modal } from '../ui';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { generateTellMeAboutYourself } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { TellMeAboutYourselfPitch } from '../../types';

type ViewMode = 'script' | 'outline';
type Emphasis = 'balanced' | 'technical' | 'leadership';
type Length = 'brief' | 'standard' | 'detailed';

// Pitch card component for the list view
function PitchCard({
  pitch,
  onSelect,
  onSetActive,
  onDelete,
}: {
  pitch: TellMeAboutYourselfPitch;
  onSelect: () => void;
  onSetActive: () => void;
  onDelete: () => void;
}): JSX.Element {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        'relative p-4 bg-surface rounded-lg border transition-all cursor-pointer',
        pitch.isActive
          ? 'border-primary/50 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/30 hover:shadow-sm'
      )}
      onClick={onSelect}
    >
      {/* Active badge */}
      {pitch.isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
          Active
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-foreground truncate">{pitch.name}</h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-foreground-muted">
            <span className="capitalize">{pitch.emphasis}</span>
            <span>•</span>
            <span className="capitalize">{pitch.length}</span>
            {pitch.targetIndustry && (
              <>
                <span>•</span>
                <span className="truncate">{pitch.targetIndustry}</span>
              </>
            )}
          </div>
        </div>

        {/* Menu button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1.5 text-foreground-muted hover:text-foreground hover:bg-surface-raised rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-36 bg-surface border border-border rounded-lg shadow-lg py-1">
                {!pitch.isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetActive();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-raised transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Set as Active
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-surface-raised transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      <p className="mt-3 text-sm text-foreground-muted line-clamp-2">
        {pitch.script.slice(0, 150)}...
      </p>

      {pitch.estimatedDuration && (
        <p className="mt-2 text-xs text-foreground-subtle">
          ~{pitch.estimatedDuration}
        </p>
      )}
    </div>
  );
}

// Pitch detail/viewer component
function PitchViewer({
  pitch,
  onClose,
  onSetActive,
  onDelete,
}: {
  pitch: TellMeAboutYourselfPitch;
  onClose: () => void;
  onSetActive: () => void;
  onDelete: () => void;
}): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pitch.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {pitch.name}
            </h3>
            {pitch.isActive && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-foreground-muted">
            <span className="capitalize">{pitch.emphasis} emphasis</span>
            <span>•</span>
            <span className="capitalize">{pitch.length}</span>
            {pitch.targetIndustry && (
              <>
                <span>•</span>
                <span>{pitch.targetIndustry}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-foreground-muted hover:text-foreground transition-colors"
        >
          Back to list
        </button>
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-surface-raised p-1 border border-border">
          <button
            onClick={() => setViewMode('script')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              viewMode === 'script'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <FileText className="w-4 h-4" />
            Script
          </button>
          <button
            onClick={() => setViewMode('outline')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              viewMode === 'outline'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            <List className="w-4 h-4" />
            Outline
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'script' ? (
        <div className="p-4 bg-surface-raised rounded-lg border border-border">
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {pitch.script}
          </p>
          {pitch.estimatedDuration && (
            <p className="text-right text-sm text-foreground-muted mt-4">
              ~{pitch.estimatedDuration}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pitch.outline.map((block, i) => (
            <div
              key={i}
              className="p-4 bg-surface-raised rounded-lg border border-border"
            >
              <h5 className="text-sm font-medium text-foreground-muted uppercase tracking-wide mb-2">
                {block.header}
              </h5>
              <ul className="space-y-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              {block.transition && (
                <p className="mt-2 pl-4 text-sm text-foreground-muted italic border-l-2 border-primary/30">
                  → {block.transition}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Script
              </>
            )}
          </Button>
          {!pitch.isActive && (
            <Button variant="secondary" onClick={onSetActive}>
              <Star className="w-4 h-4 mr-2" />
              Set as Active
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={onDelete}
          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>
  );
}

// Create new pitch form
function CreatePitchForm({
  onCreated,
  onCancel,
}: {
  onCreated: (pitch: TellMeAboutYourselfPitch) => void;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState('');
  const [emphasis, setEmphasis] = useState<Emphasis>('balanced');
  const [length, setLength] = useState<Length>('standard');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!name.trim()) {
      showToast('Please enter a name for this pitch', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateTellMeAboutYourself({
        emphasis,
        length,
        targetIndustry: targetIndustry || undefined,
      });

      const pitch: TellMeAboutYourselfPitch = {
        id: crypto.randomUUID(),
        name: name.trim(),
        script: result.script,
        outline: result.outline,
        emphasis,
        length,
        targetIndustry: targetIndustry || undefined,
        estimatedDuration: result.estimatedDuration,
        isActive: false, // New pitches are not active by default
        createdAt: new Date(),
      };

      onCreated(pitch);
      showToast('Pitch generated successfully', 'success');
    } catch (error) {
      console.error('Failed to generate pitch:', error);
      showToast('Failed to generate pitch. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground mb-1">
          Create New Pitch
        </h3>
        <p className="text-sm text-foreground-muted">
          Generate a personalized "Tell Me About Yourself" introduction based on your profile and stories.
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Pitch Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g., "Fintech Focus" or "Leadership Emphasis"'
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Emphasis */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Target Role Emphasis
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'balanced', label: 'Balanced' },
            { value: 'technical', label: 'Technical' },
            { value: 'leadership', label: 'Leadership' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setEmphasis(option.value as Emphasis)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                emphasis === option.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/30 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Length */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Length
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'brief', label: 'Brief (~30s)' },
            { value: 'standard', label: 'Standard (~60s)' },
            { value: 'detailed', label: 'Detailed (~90s)' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setLength(option.value as Length)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                length === option.value
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-foreground-muted hover:border-primary/30 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Industry */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Target Industry (optional)
        </label>
        <input
          type="text"
          value={targetIndustry}
          onChange={(e) => setTargetIndustry(e.target.value)}
          placeholder='e.g., "fintech startup" or "enterprise SaaS"'
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={isGenerating}>
          Cancel
        </Button>
        <Button onClick={handleGenerate} disabled={isGenerating || !name.trim()}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Pitch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function MyPitchPage(): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const pitches = useMemo(() => settings.savedPitches || [], [settings.savedPitches]);

  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const selectedPitch = useMemo(
    () => pitches.find((p) => p.id === selectedPitchId),
    [pitches, selectedPitchId]
  );

  const handleSetActive = async (pitchId: string) => {
    // Update all pitches: set isActive=false except for the selected one
    const updatedPitches = pitches.map((p) => ({
      ...p,
      isActive: p.id === pitchId,
    }));
    await updateSettings({ savedPitches: updatedPitches });
    showToast('Pitch set as active', 'success');
  };

  const handleDelete = async (pitchId: string) => {
    const updatedPitches = pitches.filter((p) => p.id !== pitchId);
    await updateSettings({ savedPitches: updatedPitches });
    setDeleteConfirmId(null);
    if (selectedPitchId === pitchId) {
      setSelectedPitchId(null);
    }
    showToast('Pitch deleted', 'success');
  };

  const handleCreated = async (pitch: TellMeAboutYourselfPitch) => {
    // If this is the first pitch, make it active
    const isFirst = pitches.length === 0;
    const newPitch = { ...pitch, isActive: isFirst };
    const updatedPitches = [...pitches, newPitch];
    await updateSettings({ savedPitches: updatedPitches });
    setIsCreating(false);
    setSelectedPitchId(pitch.id);
  };

  // Empty state
  if (pitches.length === 0 && !isCreating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">
          No pitches yet
        </h3>
        <p className="text-foreground-muted max-w-md mb-6">
          Create personalized "Tell Me About Yourself" introductions based on your profile and stories. Tailor them for different roles and industries.
        </p>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Your First Pitch
        </Button>
      </div>
    );
  }

  // Create form view
  if (isCreating) {
    return (
      <div className="max-w-2xl">
        <CreatePitchForm
          onCreated={handleCreated}
          onCancel={() => setIsCreating(false)}
        />
      </div>
    );
  }

  // Pitch detail view
  if (selectedPitch) {
    return (
      <div className="max-w-3xl">
        <PitchViewer
          pitch={selectedPitch}
          onClose={() => setSelectedPitchId(null)}
          onSetActive={() => handleSetActive(selectedPitch.id)}
          onDelete={() => setDeleteConfirmId(selectedPitch.id)}
        />

        {/* Delete confirmation modal */}
        <Modal
          isOpen={deleteConfirmId === selectedPitch.id}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Pitch"
          size="sm"
        >
          <div className="p-4">
            <p className="text-foreground-muted mb-4">
              Are you sure you want to delete "{selectedPitch.name}"? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(selectedPitch.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-heading-lg text-foreground">My Pitches</h2>
          <p className="text-sm text-foreground-muted mt-1">
            {pitches.length} {pitches.length === 1 ? 'pitch' : 'pitches'} • The active pitch appears in the Teleprompter
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Pitch
        </Button>
      </div>

      {/* Pitch grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pitches.map((pitch) => (
          <PitchCard
            key={pitch.id}
            pitch={pitch}
            onSelect={() => setSelectedPitchId(pitch.id)}
            onSetActive={() => handleSetActive(pitch.id)}
            onDelete={() => setDeleteConfirmId(pitch.id)}
          />
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Pitch"
          size="sm"
        >
          <div className="p-4">
            <p className="text-foreground-muted mb-4">
              Are you sure you want to delete this pitch? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
