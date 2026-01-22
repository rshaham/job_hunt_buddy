import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Textarea, Button } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { showToast } from '../../stores/toastStore';

export function AboutMeSection(): JSX.Element {
  const { settings, updateSettings } = useAppStore();
  const [content, setContent] = useState(settings.additionalContext || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setContent(settings.additionalContext || '');
  }, [settings.additionalContext]);

  useEffect(() => {
    setHasChanges(content !== (settings.additionalContext || ''));
  }, [content, settings.additionalContext]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSettings({ additionalContext: content });
      showToast('Saved', 'success');
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [content, updateSettings]);

  const handleBlur = useCallback(() => {
    if (hasChanges) {
      handleSave();
    }
  }, [hasChanges, handleSave]);

  function getWordCount(): string {
    if (content.length === 0) {
      return 'No content yet';
    }
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return `${wordCount} words`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-heading-lg text-foreground">About Me</h3>
          <p className="text-sm text-foreground-muted">
            Additional context for the AI beyond your resume
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Save
              </>
            )}
          </Button>
        )}
      </div>

      <div className="bg-surface-raised rounded-lg border border-border p-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder={`Add context the AI should know about you that's not in your resume:

• Career goals and what you're looking for
• Work style preferences (remote, team size, culture)
• Unique background or perspectives
• Skills you're developing or interested in
• Anything else relevant to your job search...`}
          rows={15}
          className="border-0 bg-transparent focus:ring-0"
        />
      </div>

      <p className="text-xs text-foreground-subtle">{getWordCount()}</p>
    </div>
  );
}
