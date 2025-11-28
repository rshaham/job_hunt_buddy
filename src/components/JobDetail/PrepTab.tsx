import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { Button, Textarea } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { chatAboutJob, generateInterviewPrep } from '../../services/ai';
import { decodeApiKey } from '../../utils/helpers';
import { format } from 'date-fns';
import type { Job } from '../../types';

interface PrepTabProps {
  job: Job;
}

export function PrepTab({ job }: PrepTabProps) {
  const { settings, updateJob } = useAppStore();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [error, setError] = useState('');
  const [prepMaterial, setPrepMaterial] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const apiKey = decodeApiKey(settings.apiKey);
  const resumeText = job.resumeText || settings.defaultResumeText;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [job.qaHistory]);

  const handleSend = async () => {
    if (!question.trim()) return;

    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newEntry = await chatAboutJob(
        job.jdText,
        resumeText,
        job.qaHistory,
        question.trim()
      );

      await updateJob(job.id, {
        qaHistory: [...job.qaHistory, newEntry],
      });
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all chat history for this job?')) {
      await updateJob(job.id, { qaHistory: [] });
    }
  };

  const handleGeneratePrep = async () => {
    if (!apiKey) {
      setError('Please configure your Claude API key in Settings');
      return;
    }

    setIsGeneratingPrep(true);
    setError('');

    try {
      const prep = await generateInterviewPrep(job.jdText, resumeText);
      setPrepMaterial(prep);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prep materials');
    } finally {
      setIsGeneratingPrep(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    'What are the most important skills for this role?',
    'How should I prepare for the interview?',
    'What questions should I ask the interviewer?',
    'What are potential red flags I should address?',
    'Help me craft a response about my experience with...',
  ];

  return (
    <div className="flex flex-col h-[500px]">
      {/* Generate Prep Button */}
      <div className="flex gap-2 mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGeneratePrep}
          disabled={isGeneratingPrep || !apiKey}
        >
          {isGeneratingPrep ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate Interview Prep
            </>
          )}
        </Button>
        {job.qaHistory.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearHistory}>
            <Trash2 className="w-4 h-4 mr-1" />
            Clear Chat
          </Button>
        )}
      </div>

      {/* Prep Material */}
      {prepMaterial && (
        <div className="mb-3 p-3 bg-primary/5 rounded-lg max-h-48 overflow-y-auto">
          <h4 className="text-xs font-medium text-primary uppercase mb-2">Interview Prep</h4>
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {prepMaterial}
          </div>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        {job.qaHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm text-slate-500 mb-4">
              Ask questions about this job, get interview coaching, or practice responses.
            </p>
            <div className="space-y-2 w-full max-w-md">
              <p className="text-xs text-slate-400 uppercase">Suggested questions:</p>
              {suggestedQuestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left text-sm p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {job.qaHistory.map((entry) => (
              <div key={entry.id} className="space-y-2">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-2 bg-primary text-white rounded-lg rounded-br-none">
                    <p className="text-sm">{entry.question}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(entry.timestamp), 'h:mm a')}
                    </p>
                  </div>
                </div>
                {/* Answer */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] p-2 bg-white dark:bg-slate-800 rounded-lg rounded-bl-none border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {entry.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger mb-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the job, interview prep, or get coaching..."
          rows={2}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={isLoading || !question.trim()}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
