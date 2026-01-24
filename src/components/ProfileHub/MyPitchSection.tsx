import { useState } from 'react';
import { Loader2, Sparkles, Copy, RefreshCw, Save, FileText, List, Check } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';
import { generateTellMeAboutYourself } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { TellMeAboutYourselfPitch } from '../../types';

type ViewMode = 'script' | 'outline';
type Emphasis = 'balanced' | 'technical' | 'leadership';
type Length = 'brief' | 'standard' | 'detailed';

export function MyPitchSection(): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const savedPitch = settings.savedPitch;

  // Generation options
  const [emphasis, setEmphasis] = useState<Emphasis>(savedPitch?.emphasis || 'balanced');
  const [length, setLength] = useState<Length>(savedPitch?.length || 'standard');
  const [targetIndustry, setTargetIndustry] = useState(savedPitch?.targetIndustry || '');

  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<TellMeAboutYourselfPitch | null>(savedPitch || null);
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTellMeAboutYourself({
        emphasis,
        length,
        targetIndustry: targetIndustry || undefined,
      });

      const pitch: TellMeAboutYourselfPitch = {
        id: savedPitch?.id || crypto.randomUUID(),
        script: result.script,
        outline: result.outline,
        emphasis,
        length,
        targetIndustry: targetIndustry || undefined,
        estimatedDuration: result.estimatedDuration,
        createdAt: savedPitch?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      setGeneratedPitch(pitch);
      showToast('Introduction generated', 'success');
    } catch (error) {
      console.error('Failed to generate pitch:', error);
      showToast('Failed to generate introduction. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedPitch) return;

    try {
      await updateSettings({ savedPitch: generatedPitch });
      showToast('Introduction saved to profile', 'success');
    } catch (error) {
      console.error('Failed to save pitch:', error);
      showToast('Failed to save introduction', 'error');
    }
  };

  const handleCopy = async () => {
    if (!generatedPitch) return;

    try {
      await navigator.clipboard.writeText(generatedPitch.script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied to clipboard', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="bg-surface-raised rounded-lg border border-border p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          My Pitch - "Tell Me About Yourself"
        </h3>
        <p className="text-sm text-foreground-muted mt-1">
          Generate a polished introduction based on your profile and stories.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-4 mb-6">
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
            className="w-full max-w-md px-3 py-2 text-sm border border-border rounded-lg bg-surface text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Generate button */}
        <div>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Introduction
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generated content */}
      {generatedPitch && (
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-foreground">Your Introduction</h4>

            {/* View mode toggle */}
            <div className="inline-flex rounded-lg bg-surface p-1 border border-border">
              <button
                onClick={() => setViewMode('script')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
                  viewMode === 'script'
                    ? 'bg-surface-raised text-foreground shadow-sm'
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
                    ? 'bg-surface-raised text-foreground shadow-sm'
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
            <div className="p-4 bg-surface rounded-lg border border-border">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {generatedPitch.script}
              </p>
              {generatedPitch.estimatedDuration && (
                <p className="text-right text-sm text-foreground-muted mt-4">
                  ~{generatedPitch.estimatedDuration}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {generatedPitch.outline.map((block, i) => (
                <div
                  key={i}
                  className="p-4 bg-surface rounded-lg border border-border"
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
                  Copy
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw className={cn('w-4 h-4 mr-2', isGenerating && 'animate-spin')} />
              Regenerate
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save to Profile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
