import { useState } from 'react';
import {
  FlaskConical,
  Brain,
  Search,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button, Textarea, AILoadingIndicator } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { showToast } from '../../stores/toastStore';
import { cn } from '../../utils/helpers';
import { useAIOperation } from '../../hooks/useAIOperation';
import {
  answerConfidenceQuestion,
  analyzeStoryGaps,
  type ConfidenceCheckResult,
  type StoryGapAnalysis,
  type CategoryCoverage,
} from '../../services/ai';

type QuizMode = 'confidence' | 'gaps';

interface ConfidenceQuestion {
  id: string;
  question: string;
  aiAnswer: string;
  sources: string[];
  confidence: number;
  missingInfo: string | null;
  rating?: 'correct' | 'partial' | 'wrong';
  correction?: string;
  correctionSaved?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "What's my experience with React?",
  'Have I managed teams before?',
  'What projects have I led?',
  'What do I know about system design?',
  'What are my leadership experiences?',
];

export function QuizSection(): JSX.Element {
  const { settings, addSavedStory } = useAppStore();
  const stories = settings.savedStories || [];
  const [mode, setMode] = useState<QuizMode>('confidence');

  // Confidence Check state
  const [confidenceQuestions, setConfidenceQuestions] = useState<ConfidenceQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const askOp = useAIOperation<ConfidenceCheckResult>('confidence-check');
  const [expandedCorrection, setExpandedCorrection] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');

  // Gap Finder state
  const [gapAnalysis, setGapAnalysis] = useState<StoryGapAnalysis | null>(null);
  const analyzeOp = useAIOperation<StoryGapAnalysis>('gap-analysis');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  function handleModeChange(newMode: QuizMode): void {
    setMode(newMode);
  }

  // ========== Confidence Check Functions ==========

  async function handleAskQuestion(): Promise<void> {
    if (!currentQuestion.trim() || askOp.isLoading) return;

    const result = await askOp.execute(async () => {
      return await answerConfidenceQuestion(currentQuestion);
    });

    if (result) {
      const newQuestion: ConfidenceQuestion = {
        id: `q_${Date.now()}`,
        question: currentQuestion,
        aiAnswer: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        missingInfo: result.missingInfo,
      };

      setConfidenceQuestions((prev) => [newQuestion, ...prev]);
      setCurrentQuestion('');
    } else if (askOp.error) {
      showToast('Failed to get AI response. Please try again.', 'error');
    }
  }

  function handleRating(questionId: string, rating: 'correct' | 'partial' | 'wrong'): void {
    setConfidenceQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, rating } : q))
    );

    if (rating === 'partial' || rating === 'wrong') {
      setExpandedCorrection(questionId);
      setCorrectionText('');
    } else {
      setExpandedCorrection(null);
    }
  }

  async function handleSaveCorrection(questionId: string, saveType: 'story' | 'aboutMe'): Promise<void> {
    const question = confidenceQuestions.find((q) => q.id === questionId);
    if (!question || !correctionText.trim()) return;

    if (saveType === 'story') {
      // Save as a new story
      addSavedStory({
        question: question.question,
        answer: correctionText.trim(),
        source: 'manual',
        skills: [],
      });
      showToast('Saved as a new story in your Story Bank', 'success');
    } else {
      // Append to About Me
      const currentAboutMe = settings.additionalContext || '';
      const separator = currentAboutMe.trim() ? '\n\n' : '';
      const newAboutMe = `${currentAboutMe}${separator}${question.question}\n${correctionText.trim()}`;
      useAppStore.getState().updateSettings({ additionalContext: newAboutMe });
      showToast('Added to your About Me section', 'success');
    }

    // Mark correction as saved
    setConfidenceQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, correction: correctionText, correctionSaved: true } : q
      )
    );
    setExpandedCorrection(null);
    setCorrectionText('');
  }

  function handleExampleQuestion(question: string): void {
    setCurrentQuestion(question);
  }

  // ========== Gap Finder Functions ==========

  async function handleAnalyzeGaps(): Promise<void> {
    if (analyzeOp.isLoading) return;

    const storiesForAnalysis = stories.map((s) => ({
      id: s.id,
      question: s.question,
      answer: s.answer,
      company: s.company,
      skills: s.skills,
    }));

    const result = await analyzeOp.execute(async () => {
      return await analyzeStoryGaps(storiesForAnalysis);
    });

    if (result) {
      setGapAnalysis(result);
    } else if (analyzeOp.error) {
      showToast('Failed to analyze stories. Please try again.', 'error');
    }
  }

  function getCoveredCategories(): CategoryCoverage[] {
    return gapAnalysis?.categories.filter((c) => c.covered) || [];
  }

  function getUncoveredCategories(): CategoryCoverage[] {
    return gapAnalysis?.categories.filter((c) => !c.covered) || [];
  }

  function getStoryById(id: string): { question: string; answer: string } | undefined {
    return stories.find((s) => s.id === id);
  }

  // ========== Render ==========

  if (stories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center mb-4">
          <FlaskConical className="w-8 h-8 text-foreground-subtle" />
        </div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">Add stories first</h3>
        <p className="text-foreground-muted max-w-md">
          You need at least a few stories in your bank before you can quiz the AI.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-heading-lg text-foreground mb-2">AI Quiz</h3>
        <p className="text-sm text-foreground-muted">
          Test how well the AI knows your stories and find gaps in your coverage.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-surface-raised rounded-lg w-fit">
        <button
          onClick={() => handleModeChange('confidence')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'confidence'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Brain className="w-4 h-4" />
          Confidence Check
        </button>
        <button
          onClick={() => handleModeChange('gaps')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            mode === 'gaps'
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Search className="w-4 h-4" />
          Gap Finder
        </button>
      </div>

      {/* Content */}
      {mode === 'confidence' ? (
        <ConfidenceCheckUI
          questions={confidenceQuestions}
          currentQuestion={currentQuestion}
          setCurrentQuestion={setCurrentQuestion}
          isAsking={askOp.isLoading}
          onAskQuestion={handleAskQuestion}
          onRating={handleRating}
          expandedCorrection={expandedCorrection}
          setExpandedCorrection={setExpandedCorrection}
          correctionText={correctionText}
          setCorrectionText={setCorrectionText}
          onSaveCorrection={handleSaveCorrection}
          onExampleQuestion={handleExampleQuestion}
        />
      ) : (
        <GapFinderUI
          gapAnalysis={gapAnalysis}
          isAnalyzing={analyzeOp.isLoading}
          onAnalyze={handleAnalyzeGaps}
          expandedCategory={expandedCategory}
          setExpandedCategory={setExpandedCategory}
          getCoveredCategories={getCoveredCategories}
          getUncoveredCategories={getUncoveredCategories}
          getStoryById={getStoryById}
          storiesCount={stories.length}
        />
      )}
    </div>
  );
}

// ========== Confidence Check UI Component ==========

interface ConfidenceCheckUIProps {
  questions: ConfidenceQuestion[];
  currentQuestion: string;
  setCurrentQuestion: (q: string) => void;
  isAsking: boolean;
  onAskQuestion: () => void;
  onRating: (id: string, rating: 'correct' | 'partial' | 'wrong') => void;
  expandedCorrection: string | null;
  setExpandedCorrection: (id: string | null) => void;
  correctionText: string;
  setCorrectionText: (text: string) => void;
  onSaveCorrection: (id: string, type: 'story' | 'aboutMe') => void;
  onExampleQuestion: (q: string) => void;
}

function ConfidenceCheckUI({
  questions,
  currentQuestion,
  setCurrentQuestion,
  isAsking,
  onAskQuestion,
  onRating,
  expandedCorrection,
  setExpandedCorrection,
  correctionText,
  setCorrectionText,
  onSaveCorrection,
  onExampleQuestion,
}: ConfidenceCheckUIProps): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-surface-raised rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-1">Test AI Knowledge</h4>
            <p className="text-sm text-foreground-muted">
              Ask questions about your experience to see if the AI can accurately answer using your
              resume, stories, and documents. Rate the responses to identify gaps in your profile.
            </p>
          </div>
        </div>
      </div>

      {/* Question Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onAskQuestion();
              }
            }}
            placeholder="Ask about your experience..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isAsking}
          />
          <Button onClick={onAskQuestion} disabled={!currentQuestion.trim() || isAsking}>
            {isAsking ? <AILoadingIndicator isLoading label="Asking..." /> : 'Ask'}
          </Button>
        </div>

        {/* Example Questions */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-foreground-muted">Try:</span>
          {EXAMPLE_QUESTIONS.slice(0, 3).map((q) => (
            <button
              key={q}
              onClick={() => onExampleQuestion(q)}
              className="text-xs px-2 py-1 bg-surface-raised hover:bg-surface rounded text-foreground-muted hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Question/Answer Cards */}
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="bg-surface-raised rounded-lg border border-border overflow-hidden">
            {/* Question */}
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium text-foreground">{q.question}</p>
            </div>

            {/* AI Answer */}
            <div className="px-4 py-3">
              <div className="text-foreground-muted text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>
                  {q.aiAnswer}
                </ReactMarkdown>
              </div>

              {/* Sources */}
              {q.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {q.sources.map((source, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 bg-primary-subtle text-primary rounded"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              )}

              {/* Confidence indicator */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-foreground-muted">AI Confidence:</span>
                <div className="flex-1 max-w-32 h-1.5 bg-surface rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      q.confidence >= 80
                        ? 'bg-green-500'
                        : q.confidence >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    )}
                    style={{ width: `${q.confidence}%` }}
                  />
                </div>
                <span className="text-xs text-foreground-muted">{q.confidence}%</span>
              </div>

              {/* Missing info hint */}
              {q.missingInfo && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {q.missingInfo}
                  </p>
                </div>
              )}
            </div>

            {/* Rating Buttons */}
            <div className="px-4 py-3 border-t border-border bg-surface/50">
              {!q.rating ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground-muted">Was this accurate?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRating(q.id, 'correct')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Check className="w-4 h-4" /> Yes
                    </button>
                    <button
                      onClick={() => onRating(q.id, 'partial')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      ~ Partial
                    </button>
                    <button
                      onClick={() => onRating(q.id, 'wrong')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <X className="w-4 h-4" /> No
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm px-2 py-0.5 rounded',
                      q.rating === 'correct' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                      q.rating === 'partial' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
                      q.rating === 'wrong' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    )}
                  >
                    {q.rating === 'correct' ? 'Correct' : q.rating === 'partial' ? 'Partial' : 'Wrong'}
                  </span>
                  {q.correctionSaved && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3 inline" /> Correction saved
                    </span>
                  )}
                </div>
              )}

              {/* Correction UI */}
              {expandedCorrection === q.id && !q.correctionSaved && (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-foreground-muted">What was wrong or missing?</p>
                  <Textarea
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder="Describe what was incorrect or add the missing information..."
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSaveCorrection(q.id, 'story')}
                      disabled={!correctionText.trim()}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Save as Story
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSaveCorrection(q.id, 'aboutMe')}
                      disabled={!correctionText.trim()}
                    >
                      Update About Me
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpandedCorrection(null);
                        setCorrectionText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="text-center py-8 text-foreground-muted">
          <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Ask a question to test the AI's knowledge of your experience</p>
        </div>
      )}
    </div>
  );
}

// ========== Gap Finder UI Component ==========

interface GapFinderUIProps {
  gapAnalysis: StoryGapAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  expandedCategory: string | null;
  setExpandedCategory: (id: string | null) => void;
  getCoveredCategories: () => CategoryCoverage[];
  getUncoveredCategories: () => CategoryCoverage[];
  getStoryById: (id: string) => { question: string; answer: string } | undefined;
  storiesCount: number;
}

function GapFinderUI({
  gapAnalysis,
  isAnalyzing,
  onAnalyze,
  expandedCategory,
  setExpandedCategory,
  getCoveredCategories,
  getUncoveredCategories,
  getStoryById,
  storiesCount,
}: GapFinderUIProps): JSX.Element {
  const covered = getCoveredCategories();
  const uncovered = getUncoveredCategories();

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-surface-raised rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <Search className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-1">Find Story Gaps</h4>
            <p className="text-sm text-foreground-muted">
              Analyze your stories against common behavioral interview categories to identify gaps
              in your coverage. Well-rounded candidates have stories for each category.
            </p>
          </div>
        </div>
      </div>

      {/* Analyze Button */}
      <div className="flex items-center gap-4">
        <Button onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <AILoadingIndicator isLoading label={`Analyzing ${storiesCount} stories...`} />
          ) : gapAnalysis ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-analyze Stories
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Analyze My Stories
            </>
          )}
        </Button>
        {gapAnalysis && (
          <span className="text-sm text-foreground-muted">
            Coverage: {covered.length}/{gapAnalysis.categories.length} categories
          </span>
        )}
      </div>

      {/* Results */}
      {gapAnalysis && (
        <div className="space-y-4">
          {/* Overall Coverage */}
          <div className="bg-surface-raised rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-foreground">Overall Coverage</span>
              <span className="text-lg font-bold text-foreground">
                {gapAnalysis.overallCoverage}%
              </span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  gapAnalysis.overallCoverage >= 80
                    ? 'bg-green-500'
                    : gapAnalysis.overallCoverage >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${gapAnalysis.overallCoverage}%` }}
              />
            </div>
          </div>

          {/* Covered Categories */}
          {covered.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Covered ({covered.length})
              </h4>
              <div className="space-y-1">
                {covered.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    isExpanded={expandedCategory === cat.id}
                    onToggle={() =>
                      setExpandedCategory(expandedCategory === cat.id ? null : cat.id)
                    }
                    getStoryById={getStoryById}
                    variant="covered"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Uncovered Categories */}
          {uncovered.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                Gaps ({uncovered.length})
              </h4>
              <div className="space-y-1">
                {uncovered.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    isExpanded={expandedCategory === cat.id}
                    onToggle={() =>
                      setExpandedCategory(expandedCategory === cat.id ? null : cat.id)
                    }
                    getStoryById={getStoryById}
                    variant="uncovered"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {gapAnalysis.suggestions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Suggestions
              </h4>
              <ul className="space-y-1">
                {gapAnalysis.suggestions.map((suggestion, i) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-400">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!gapAnalysis && !isAnalyzing && (
        <div className="text-center py-8 text-foreground-muted">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Click "Analyze My Stories" to find gaps in your behavioral interview coverage</p>
        </div>
      )}
    </div>
  );
}

// ========== Category Item Component ==========

interface CategoryItemProps {
  category: CategoryCoverage;
  isExpanded: boolean;
  onToggle: () => void;
  getStoryById: (id: string) => { question: string; answer: string } | undefined;
  variant: 'covered' | 'uncovered';
}

function CategoryItem({
  category,
  isExpanded,
  onToggle,
  getStoryById,
  variant,
}: CategoryItemProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        variant === 'covered'
          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          {variant === 'covered' ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span className="font-medium text-foreground">{category.label}</span>
          {category.storyCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-surface rounded text-foreground-muted">
              {category.storyCount} {category.storyCount === 1 ? 'story' : 'stories'}
            </span>
          )}
        </div>
        {category.storyIds.length > 0 &&
          (isExpanded ? (
            <ChevronUp className="w-4 h-4 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-foreground-muted" />
          ))}
      </button>

      {/* Expanded Story List */}
      {isExpanded && category.storyIds.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {category.storyIds.map((storyId) => {
            const story = getStoryById(storyId);
            if (!story) return null;
            return (
              <div
                key={storyId}
                className="p-2 bg-surface rounded border border-border text-sm"
              >
                <p className="font-medium text-foreground">{story.question}</p>
                <p className="text-foreground-muted line-clamp-2 mt-1">{story.answer}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
