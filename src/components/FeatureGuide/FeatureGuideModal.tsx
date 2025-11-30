import {
  BookmarkCheck,
  UserCircle,
  FileEdit,
  MessageSquare,
  GraduationCap,
  FileText,
  StickyNote,
  Database,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  GitCompare,
  Save,
  Copy,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
  Mail,
  FolderOpen,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';

export function FeatureGuideModal() {
  const { isFeatureGuideModalOpen, closeFeatureGuideModal } = useAppStore();

  return (
    <Modal
      isOpen={isFeatureGuideModalOpen}
      onClose={closeFeatureGuideModal}
      title="Feature Guide"
      size="full"
    >
      <div className="p-6 space-y-6 overflow-y-auto">
        <p className="text-slate-600 dark:text-slate-400">
          A complete guide to Job Hunt Buddy's features to help you get the most out of your job search.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Saved Stories / Memories */}
          <section className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <BookmarkCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Saved Stories / Memories
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Build a reusable profile of your best interview answers and experiences.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Save className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span><strong>Save from Prep chats:</strong> When you craft a great answer in the Q&A chat, click "Save to Profile" to keep it</span>
              </li>
              <li className="flex gap-2">
                <RefreshCw className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span><strong>Reuse across jobs:</strong> Your saved stories are available when preparing for any job</span>
              </li>
              <li className="flex gap-2">
                <UserCircle className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Settings → Profile → Saved Stories</span>
              </li>
            </ul>
          </section>

          {/* Additional Context */}
          <section className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Additional Context
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Tell the AI about yourself beyond what's on your resume.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><strong>What to include:</strong> Skills you're learning, career goals, projects not on resume, personal achievements</span>
              </li>
              <li className="flex gap-2">
                <FileEdit className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><strong>How it's used:</strong> AI includes this when grading resumes, tailoring content, and generating cover letters</span>
              </li>
              <li className="flex gap-2">
                <UserCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Settings → Profile → Additional Context</span>
              </li>
            </ul>
          </section>

          {/* Resume Tailoring */}
          <section className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <FileEdit className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Resume Tailoring
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Customize your resume for each job application with AI assistance.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Auto-Tailor:</strong> One-click AI optimization that rewrites your resume to match job requirements</span>
              </li>
              <li className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Chat refinement:</strong> Tell the AI exactly what to change ("make my Python experience more prominent")</span>
              </li>
              <li className="flex gap-2">
                <GitCompare className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Diff view:</strong> See exactly what changed with side-by-side or word-level comparison</span>
              </li>
              <li className="flex gap-2">
                <Save className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Save:</strong> Keep the tailored version as your resume for this specific job</span>
              </li>
            </ul>
          </section>

          {/* Interview Prep */}
          <section className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Interview Prep (Q&A)
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Practice and prepare for interviews with AI coaching.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span><strong>Ask anything:</strong> "What questions might they ask about my experience with React?"</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span><strong>Generate prep:</strong> Click "Generate Interview Prep" for a structured preparation guide</span>
              </li>
              <li className="flex gap-2">
                <BookmarkCheck className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span><strong>Save answers:</strong> Great responses can be saved to your profile for future use</span>
              </li>
            </ul>
          </section>

          {/* Resume Fit / Grading */}
          <section className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Resume Fit / Grading
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              See how well your resume matches the job requirements.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <GraduationCap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span><strong>Letter grade:</strong> Get an A-F grade based on how well your experience matches requirements</span>
              </li>
              <li className="flex gap-2">
                <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span><strong>Detailed analysis:</strong> See your strengths, gaps, and specific suggestions for improvement</span>
              </li>
              <li className="flex gap-2">
                <RefreshCw className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span><strong>Per-job resumes:</strong> Upload a different resume for each job, or use your default</span>
              </li>
            </ul>
          </section>

          {/* Cover Letter */}
          <section className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Cover Letter
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Generate and refine tailored cover letters.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span><strong>Generate:</strong> Create a cover letter based on the job description and your resume</span>
              </li>
              <li className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span><strong>Refine:</strong> Chat to make changes ("make it more enthusiastic" or "emphasize my leadership")</span>
              </li>
              <li className="flex gap-2">
                <Copy className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span><strong>Export:</strong> Copy to clipboard or download when you're happy with it</span>
              </li>
            </ul>
          </section>

          {/* Notes, Contacts & Timeline */}
          <section className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Notes, Contacts & Timeline
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Keep track of everything related to each job application.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span><strong>Notes:</strong> Research about the company, interview prep notes, follow-up reminders</span>
              </li>
              <li className="flex gap-2">
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span><strong>Contacts:</strong> Save recruiter and hiring manager info (name, email, LinkedIn)</span>
              </li>
              <li className="flex gap-2">
                <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span><strong>Timeline:</strong> Track key dates (applied, phone screen, interviews, offer)</span>
              </li>
            </ul>
          </section>

          {/* Data & Privacy */}
          <section className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Data & Privacy
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Your data stays on your computer.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Database className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <span><strong>Local storage:</strong> All jobs, resumes, and notes are stored in your browser's database</span>
              </li>
              <li className="flex gap-2">
                <Download className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <span><strong>Backup:</strong> Export your data as JSON anytime from Settings → Export Data</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <span><strong>AI provider:</strong> Your API key is only sent to your chosen provider (Anthropic, Google, or Ollama)</span>
              </li>
            </ul>
          </section>

          {/* Keyword Matcher */}
          <section className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Keyword Matcher
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              See how your resume keywords match the job description.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span><strong>Matched:</strong> Green badges show keywords from the JD that appear in your resume</span>
              </li>
              <li className="flex gap-2">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span><strong>Missing:</strong> Red badges highlight keywords you should consider adding</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                <span><strong>Quick action:</strong> Click any missing keyword to jump to Resume Tailoring</span>
              </li>
            </ul>
          </section>

          {/* CSV Export */}
          <section className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                CSV Export
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Export your job data to a spreadsheet format.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Download className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span><strong>One-click export:</strong> Download all jobs as a CSV file</span>
              </li>
              <li className="flex gap-2">
                <FileText className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span><strong>Includes:</strong> Company, Title, Status, Date, Match %, Grade, JD Link</span>
              </li>
              <li className="flex gap-2">
                <Users className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Settings → Data Backup → Export CSV</span>
              </li>
            </ul>
          </section>

          {/* Interviewer Intel */}
          <section className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Interviewer Intel
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Get AI-powered insights about your interviewers.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Users className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>LinkedIn bio:</strong> Paste an interviewer's bio to get personalized insights</span>
              </li>
              <li className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Get insights:</strong> Communication style, what they value, talking points</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Notes tab → Contacts → Generate Intel</span>
              </li>
            </ul>
          </section>

          {/* Emails Tab */}
          <section className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Emails Tab
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Generate professional job search emails with AI.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <Mail className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                <span><strong>Email types:</strong> Thank You, Follow Up, Withdraw, Negotiate</span>
              </li>
              <li className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                <span><strong>Refine:</strong> Chat with AI to adjust tone, length, or content</span>
              </li>
              <li className="flex gap-2">
                <Copy className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Job detail → Emails tab</span>
              </li>
            </ul>
          </section>

          {/* Context Documents */}
          <section className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Context Documents
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Upload PDFs to give AI more context about you.
            </p>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex gap-2">
                <FileText className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <span><strong>Upload:</strong> Portfolio, project docs, certifications, recommendations</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <span><strong>Auto-summarize:</strong> AI condenses large docs to save context window</span>
              </li>
              <li className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <span><strong>Access:</strong> Settings → Profile → Context Documents</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Modal>
  );
}
