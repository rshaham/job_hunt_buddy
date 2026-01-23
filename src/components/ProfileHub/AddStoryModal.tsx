import { useState, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Modal, Button, Input, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { extractStoryMetadata } from '../../services/ai';
import { showToast } from '../../stores/toastStore';
import type { SavedStory } from '../../types';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingStory?: SavedStory | null;
}

export function AddStoryModal({ isOpen, onClose, editingStory }: AddStoryModalProps): JSX.Element | null {
  const { addSavedStory, updateSavedStory } = useAppStore();

  // Form state
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showForm, setShowForm] = useState(!!editingStory);

  // Extracted/edited fields
  const [question, setQuestion] = useState(editingStory?.question || '');
  const [answer, setAnswer] = useState(editingStory?.answer || '');
  const [company, setCompany] = useState(editingStory?.company || '');
  const [role, setRole] = useState(editingStory?.role || '');
  const [timeframe, setTimeframe] = useState(editingStory?.timeframe || '');
  const [outcome, setOutcome] = useState(editingStory?.outcome || '');
  const [skillsInput, setSkillsInput] = useState(editingStory?.skills?.join(', ') || '');

  // Sync editingStory prop to form state when story changes
  useEffect(() => {
    if (editingStory) {
      setQuestion(editingStory.question);
      setAnswer(editingStory.answer);
      setCompany(editingStory.company || '');
      setRole(editingStory.role || '');
      setTimeframe(editingStory.timeframe || '');
      setOutcome(editingStory.outcome || '');
      setSkillsInput(editingStory.skills?.join(', ') || '');
      setShowForm(true);
    }
  }, [editingStory]);

  function resetForm(): void {
    setRawText('');
    setShowForm(false);
    setQuestion('');
    setAnswer('');
    setCompany('');
    setRole('');
    setTimeframe('');
    setOutcome('');
    setSkillsInput('');
    setIsExtracting(false);
  }

  function handleClose(): void {
    resetForm();
    onClose();
  }

  async function handleExtract(): Promise<void> {
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
      setShowForm(true);
    } catch (error) {
      console.error('Failed to extract story metadata:', error);
      showToast('Failed to extract metadata. You can fill in the form manually.', 'error');
      setShowForm(true);
    } finally {
      setIsExtracting(false);
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
    };

    try {
      if (editingStory) {
        await updateSavedStory(editingStory.id, {
          ...storyData,
          updatedAt: new Date(),
        });
        showToast('Story updated', 'success');
      } else {
        await addSavedStory(storyData);
        showToast('Story added to your bank', 'success');
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save story:', error);
      showToast('Failed to save story', 'error');
    }
  }

  function handleRawTextChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setRawText(e.target.value);
  }

  function handleQuestionChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setQuestion(e.target.value);
  }

  function handleAnswerChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setAnswer(e.target.value);
  }

  function handleCompanyChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setCompany(e.target.value);
  }

  function handleRoleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setRole(e.target.value);
  }

  function handleTimeframeChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setTimeframe(e.target.value);
  }

  function handleSkillsInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSkillsInput(e.target.value);
  }

  function handleOutcomeChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setOutcome(e.target.value);
  }

  function handleBackClick(): void {
    if (editingStory) {
      handleClose();
    } else {
      setShowForm(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={editingStory ? 'Edit Story' : 'Add Story'} size="xl">
      <div className="p-4 space-y-4">
        {!showForm ? (
          <>
            <p className="text-sm text-foreground-muted">
              Paste your experience or story below. AI will extract the key details.
            </p>
            <Textarea
              value={rawText}
              onChange={handleRawTextChange}
              placeholder="Describe an experience, achievement, or story you'd like to save..."
              rows={8}
              className="font-body"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExtract} disabled={!rawText.trim() || isExtracting}>
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Extract with AI
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Question/Topic *
                </label>
                <Input
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="What behavioral question does this answer?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Your Story *
                </label>
                <Textarea
                  value={answer}
                  onChange={handleAnswerChange}
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
                    onChange={handleCompanyChange}
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <Input
                    value={role}
                    onChange={handleRoleChange}
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
                    onChange={handleTimeframeChange}
                    placeholder="Q2 2023"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Skills (comma-separated)
                  </label>
                  <Input
                    value={skillsInput}
                    onChange={handleSkillsInputChange}
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
                  onChange={handleOutcomeChange}
                  placeholder="What was the result or impact?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={handleBackClick}>
                {editingStory ? 'Cancel' : 'Back'}
              </Button>
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
