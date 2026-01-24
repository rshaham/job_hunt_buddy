import { useState, useEffect } from 'react';
import { Loader2, Sparkles, ChevronLeft, ChevronRight, Star, RefreshCw } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractStoryMetadata, extractStarFromText, type StarExtractionResult } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import { StarEditor } from './StarEditor';
import { ThemeSelector } from './ThemeSelector';
import { StrengthRating } from './StrengthRating';
import type { SavedStory, StoryTheme } from '../../types';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStory?: SavedStory | null;
}

// Phases of the story entry flow
type Phase = 'raw' | 'star' | 'classify' | 'simple';

export function AddStoryModal({ isOpen, onClose, editingStory }: AddStoryModalProps): JSX.Element | null {
  const { addSavedStory, updateSavedStory } = useAppStore();

  // Phase state - always start in 'simple' when editing
  const [phase, setPhase] = useState<Phase>(editingStory ? 'simple' : 'raw');

  // Raw input phase
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isReassessing, setIsReassessing] = useState(false);

  // STAR phase
  const [situation, setSituation] = useState('');
  const [task, setTask] = useState('');
  const [action, setAction] = useState('');
  const [result, setResult] = useState('');
  const [starGaps, setStarGaps] = useState<StarExtractionResult['gaps']>([]);

  // Classification phase
  const [themes, setThemes] = useState<StoryTheme[]>([]);
  const [strengthRank, setStrengthRank] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Simple form fields (existing flow)
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [outcome, setOutcome] = useState('');
  const [skillsInput, setSkillsInput] = useState('');

  // Track if story has STAR content
  const hasStarContent = situation || task || action || result;

  // Initialize form when editing
  useEffect(() => {
    if (editingStory) {
      setQuestion(editingStory.question || '');
      setAnswer(editingStory.answer || '');
      setCompany(editingStory.company || '');
      setRole(editingStory.role || '');
      setTimeframe(editingStory.timeframe || '');
      setOutcome(editingStory.outcome || '');
      setSkillsInput(editingStory.skills?.join(', ') || '');

      // STAR fields
      setSituation(editingStory.situation || '');
      setTask(editingStory.task || '');
      setAction(editingStory.action || '');
      setResult(editingStory.result || '');

      // Classification
      setThemes(editingStory.themes || []);
      setStrengthRank(editingStory.strengthRank);
      setSuggestedQuestions(editingStory.suggestedQuestions || []);

      // Always start in simple view when editing (Issue 3 fix)
      setPhase('simple');
    }
  }, [editingStory]);

  function resetForm(): void {
    setPhase(editingStory ? 'simple' : 'raw');
    setRawText('');
    setIsExtracting(false);
    setIsReassessing(false);
    setSituation('');
    setTask('');
    setAction('');
    setResult('');
    setStarGaps([]);
    setThemes([]);
    setStrengthRank(undefined);
    setSuggestedQuestions([]);
    setQuestion('');
    setAnswer('');
    setCompany('');
    setRole('');
    setTimeframe('');
    setOutcome('');
    setSkillsInput('');
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  // Extract STAR from raw text
  async function handleExtractStar(): Promise<void> {
    if (!rawText.trim()) return;

    setIsExtracting(true);
    try {
      const extracted = await extractStarFromText(rawText);

      // Populate STAR fields
      setSituation(extracted.situation || '');
      setTask(extracted.task || '');
      setAction(extracted.action || '');
      setResult(extracted.result || '');
      setStarGaps(extracted.gaps || []);

      // Populate classification
      setThemes(extracted.themes || []);
      setSuggestedQuestions(extracted.suggestedQuestions || []);

      // Also populate simple fields from extraction
      setQuestion(extracted.question || '');
      setAnswer(extracted.answer || rawText);

      setPhase('star');
    } catch (error) {
      console.error('Failed to extract STAR:', error);
      showToast('Failed to extract STAR format. You can fill in the form manually.', 'error');
      // Fall back to simple extraction
      handleExtractSimple();
    } finally {
      setIsExtracting(false);
    }
  }

  // Simple extraction (existing behavior) - skip STAR
  async function handleExtractSimple(): Promise<void> {
    if (!rawText.trim()) return;

    setIsExtracting(true);
    try {
      const extracted = await extractStoryMetadata(rawText);
      setQuestion(extracted.question || '');
      setAnswer(extracted.answer || rawText);
      setCompany(extracted.company || '');
      setRole(extracted.role || '');
      setTimeframe(extracted.timeframe || '');
      setOutcome(extracted.outcome || '');
      setSkillsInput(extracted.skills?.join(', ') || '');
      setPhase('simple');
    } catch (error) {
      console.error('Failed to extract story metadata:', error);
      showToast('Failed to extract metadata. You can fill in the form manually.', 'error');
      setAnswer(rawText);
      setPhase('simple');
    } finally {
      setIsExtracting(false);
    }
  }

  // Re-assess STAR content with AI (Issue 1 fix)
  async function handleReassessStar(): Promise<void> {
    // Build the current STAR content into text for re-assessment
    const currentContent = [
      situation && `Situation: ${situation}`,
      task && `Task: ${task}`,
      action && `Action: ${action}`,
      result && `Result: ${result}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!currentContent.trim()) {
      showToast('Add some content to STAR sections first', 'error');
      return;
    }

    setIsReassessing(true);
    try {
      const extracted = await extractStarFromText(currentContent);

      // Update gaps based on new content
      setStarGaps(extracted.gaps || []);

      // Update themes and suggestions if AI found better ones
      if (extracted.themes && extracted.themes.length > 0) {
        setThemes(extracted.themes);
      }
      if (extracted.suggestedQuestions && extracted.suggestedQuestions.length > 0) {
        setSuggestedQuestions(extracted.suggestedQuestions);
      }

      if (extracted.gaps && extracted.gaps.length > 0) {
        showToast(`Found ${extracted.gaps.length} area(s) that could be improved`, 'info');
      } else {
        showToast('Your STAR story looks complete!', 'success');
      }
    } catch (error) {
      console.error('Failed to re-assess STAR:', error);
      showToast('Failed to re-assess. Please try again.', 'error');
    } finally {
      setIsReassessing(false);
    }
  }

  // Navigate from STAR to classification
  function handleStarNext(): void {
    // Build answer from STAR if not already set
    if (!answer && hasStarContent) {
      const parts = [];
      if (situation) parts.push(`**Situation:** ${situation}`);
      if (task) parts.push(`**Task:** ${task}`);
      if (action) parts.push(`**Action:** ${action}`);
      if (result) parts.push(`**Result:** ${result}`);
      setAnswer(parts.join('\n\n'));
    }
    setPhase('classify');
  }

  // Switch from simple to STAR editing (also used for "View/Edit STAR" button)
  function handleEnhanceWithStar(): void {
    // If already has STAR content, just switch to STAR view
    if (hasStarContent) {
      setPhase('star');
      return;
    }

    // Pre-populate STAR if possible
    if (answer) {
      setIsExtracting(true);
      extractStarFromText(answer)
        .then((extracted) => {
          setSituation(extracted.situation || '');
          setTask(extracted.task || '');
          setAction(extracted.action || '');
          setResult(extracted.result || '');
          setStarGaps(extracted.gaps || []);
          setThemes(extracted.themes || themes);
          setSuggestedQuestions(extracted.suggestedQuestions || suggestedQuestions);
          setPhase('star');
        })
        .catch(() => {
          // Just switch to STAR view without pre-population
          setPhase('star');
        })
        .finally(() => {
          setIsExtracting(false);
        });
    } else {
      setPhase('star');
    }
  }

  async function handleSave(): Promise<void> {
    if (!question.trim() || !answer.trim()) {
      showToast('Question and answer are required', 'error');
      return;
    }

    const skills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const storyData = {
      question: question.trim(),
      answer: answer.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
      timeframe: timeframe.trim() || undefined,
      outcome: outcome.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
      source: 'manual' as const,

      // STAR fields (only if populated)
      situation: situation.trim() || undefined,
      task: task.trim() || undefined,
      action: action.trim() || undefined,
      result: result.trim() || undefined,

      // Classification
      themes: themes.length > 0 ? themes : undefined,
      strengthRank: strengthRank,
      suggestedQuestions: suggestedQuestions.length > 0 ? suggestedQuestions : undefined,
    };

    try {
      if (editingStory) {
        await updateSavedStory(editingStory.id, {
          ...storyData,
          updatedAt: new Date(),
        });
        showToast('Story updated', 'success');
      } else {
        await addSavedStory(storyData as Omit<SavedStory, 'id' | 'createdAt'>);
        showToast('Story added to your bank', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save story:', error);
      showToast('Failed to save story', 'error');
    }
  }

  if (!isOpen) return null;

  const modalTitle = editingStory
    ? 'Edit Story'
    : phase === 'raw'
    ? 'Add Story'
    : phase === 'star'
    ? 'Structure with STAR'
    : phase === 'classify'
    ? 'Classify Story'
    : 'Add Story';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <div className="p-4 space-y-4">
        {/* Phase 1: Raw Input */}
        {phase === 'raw' && (
          <>
            <p className="text-sm text-foreground-muted">
              Paste or type your experience below. You can structure it as a STAR story for behavioral interviews, or keep it simple.
            </p>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Describe an experience, achievement, or story you'd like to save...

Example: At my previous company, we were struggling with slow deployments. As the tech lead, I was responsible for improving our CI/CD pipeline. I analyzed the bottlenecks, proposed a containerized solution, and led the migration over 3 months. We reduced deployment time from 2 hours to 12 minutes."
              rows={8}
              className="font-body"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleExtractSimple}
                disabled={!rawText.trim() || isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Skip STAR
              </Button>
              <Button onClick={handleExtractStar} disabled={!rawText.trim() || isExtracting}>
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Extract STAR
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Phase 2: STAR Breakdown */}
        {phase === 'star' && (
          <>
            <p className="text-sm text-foreground-muted">
              Structure your story using the STAR method for behavioral interviews. Click each section to expand/collapse. Edit the content, then re-assess to check for gaps.
            </p>

            <StarEditor
              situation={situation}
              task={task}
              action={action}
              result={result}
              gaps={starGaps}
              onSituationChange={setSituation}
              onTaskChange={setTask}
              onActionChange={setAction}
              onResultChange={setResult}
            />

            {/* Re-assess button (Issue 1 fix) */}
            {hasStarContent && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  onClick={handleReassessStar}
                  disabled={isReassessing}
                  className="gap-2"
                >
                  {isReassessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Re-assessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Re-assess with AI
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="secondary"
                onClick={() => setPhase(editingStory ? 'simple' : 'raw')}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button onClick={handleStarNext}>
                Next: Classify
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* Phase 3: Classification */}
        {phase === 'classify' && (
          <>
            <div className="space-y-4">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Question this story answers *
                </label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Tell me about a time you led a technical project"
                />
                {suggestedQuestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-foreground-muted mb-1">Suggested questions:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestedQuestions.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setQuestion(q)}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Themes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Themes (select all that apply)
                </label>
                <ThemeSelector value={themes} onChange={setThemes} />
              </div>

              {/* Strength Rating */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Story Strength (how confident are you in this story?)
                </label>
                <StrengthRating value={strengthRank} onChange={setStrengthRank} />
              </div>

              {/* Context fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Tech Lead"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Timeframe
                  </label>
                  <Input
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    placeholder="2022-2023"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setPhase('star')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to STAR
              </Button>
              <Button onClick={handleSave}>
                {editingStory ? 'Save Changes' : 'Save Story'}
              </Button>
            </div>
          </>
        )}

        {/* Simple form (existing flow, also for editing) */}
        {phase === 'simple' && (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Question/Topic *
                </label>
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What behavioral question does this answer?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Your Story *
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Your experience in detail..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company
                  </label>
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <Input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Senior Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Timeframe
                  </label>
                  <Input
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    placeholder="Q2 2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Skills (comma-separated)
                  </label>
                  <Input
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    placeholder="leadership, technical"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Outcome
                </label>
                <Input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="What was the result or impact?"
                />
              </div>

              {/* Themes and Strength (optional enhancement) */}
              <div className="pt-3 border-t border-border space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Themes (optional)
                  </label>
                  <ThemeSelector value={themes} onChange={setThemes} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Story Strength (optional)
                  </label>
                  <StrengthRating value={strengthRank} onChange={setStrengthRank} />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => (editingStory ? handleClose() : setPhase('raw'))}
                >
                  {editingStory ? 'Cancel' : 'Back'}
                </Button>
                {/* Show different button based on whether story has STAR content */}
                {hasStarContent ? (
                  <Button
                    variant="secondary"
                    onClick={handleEnhanceWithStar}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    View/Edit STAR
                  </Button>
                ) : answer && (
                  <Button
                    variant="secondary"
                    onClick={handleEnhanceWithStar}
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Star className="w-4 h-4 mr-1" />
                    )}
                    Enhance with STAR
                  </Button>
                )}
              </div>
              <Button onClick={handleSave}>
                {editingStory ? 'Save Changes' : 'Add Story'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
