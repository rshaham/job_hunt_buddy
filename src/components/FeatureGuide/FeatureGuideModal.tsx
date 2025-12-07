import { useState } from 'react';
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
  MapPin,
  Target,
  BarChart3,
  Kanban,
  ArrowUpDown,
  GripVertical,
  Columns,
  Pencil,
  Zap,
  Moon,
  Command,
} from 'lucide-react';
import { Modal } from '../ui';
import { useAppStore } from '../../stores/appStore';

type TabId = 'new' | 'board' | 'job-detail' | 'ai' | 'profile';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: { icon: React.ReactNode; label: string; text: string }[];
  location: string;
  color: string;
  isNew?: boolean;
}

function FeatureCard({ icon, title, description, items, location, color, isNew }: FeatureCardProps) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
    slate: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
    gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
    lime: 'bg-lime-50 dark:bg-lime-900/20 border-lime-200 dark:border-lime-800',
  };

  return (
    <section className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.slate}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        {isNew && (
          <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded">
            NEW
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{description}</p>
      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
            <span>
              <strong>{item.label}:</strong> {item.text}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <MapPin className="w-3.5 h-3.5" />
        <span>{location}</span>
      </div>
    </section>
  );
}

export function FeatureGuideModal() {
  const { isFeatureGuideModalOpen, closeFeatureGuideModal } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('new');

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'new', label: "What's New", icon: <Zap className="w-4 h-4" /> },
    { id: 'board', label: 'Board', icon: <Kanban className="w-4 h-4" /> },
    { id: 'job-detail', label: 'Job Detail', icon: <FileText className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Features', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile & Data', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isFeatureGuideModalOpen}
      onClose={closeFeatureGuideModal}
      title="Feature Guide"
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap
                ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'new' && <WhatsNewTab />}
          {activeTab === 'board' && <BoardTab />}
          {activeTab === 'job-detail' && <JobDetailTab />}
          {activeTab === 'ai' && <AIFeaturesTab />}
          {activeTab === 'profile' && <ProfileDataTab />}
        </div>
      </div>
    </Modal>
  );
}

function WhatsNewTab() {
  return (
    <div className="space-y-6">
      <div className="text-center pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">What's New</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Recent additions and improvements to Job Hunt Buddy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<ArrowUpDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          title="Board Sorting & Filtering"
          description="Quickly find and organize jobs in your pipeline."
          items={[
            { icon: <Search className="w-4 h-4 text-indigo-500" />, label: 'Search', text: 'Filter by company, title, or description' },
            { icon: <ArrowUpDown className="w-4 h-4 text-indigo-500" />, label: 'Sort', text: 'By date added, resume fit, company, or title' },
          ]}
          location="Toolbar below header"
          color="indigo"
          isNew
        />

        <FeatureCard
          icon={<Pencil className="w-5 h-5 text-green-600 dark:text-green-400" />}
          title="Edit Job Details"
          description="Fix company names, titles, or links after adding a job."
          items={[
            { icon: <Pencil className="w-4 h-4 text-green-500" />, label: 'Edit', text: 'Click the Edit button in the Overview tab' },
            { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Save', text: 'Press Enter or click Save when done' },
          ]}
          location="Job detail → Overview tab → Edit"
          color="green"
          isNew
        />

        <FeatureCard
          icon={<Command className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          title="AI Agent (Ctrl+K)"
          description="Natural language interface for job search and questions."
          items={[
            { icon: <Search className="w-4 h-4 text-violet-500" />, label: 'Search jobs', text: '"Find remote React jobs in Seattle"' },
            { icon: <MessageSquare className="w-4 h-4 text-violet-500" />, label: 'Ask questions', text: '"What skills does the Google job require?"' },
          ]}
          location="Header → AI Agent or press Ctrl+K"
          color="violet"
          isNew
        />

        <FeatureCard
          icon={<Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          title="Find Jobs"
          description="Search external job boards without leaving the app."
          items={[
            { icon: <Search className="w-4 h-4 text-cyan-500" />, label: 'Search', text: 'Query Google Jobs via SerApi' },
            { icon: <ArrowRight className="w-4 h-4 text-cyan-500" />, label: 'Import', text: 'Add jobs directly to your board' },
          ]}
          location="Header → Find Jobs button"
          color="cyan"
          isNew
        />
      </div>
    </div>
  );
}

function BoardTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-600 dark:text-slate-400">
        Features for managing your job pipeline on the main board view.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<ArrowUpDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          title="Sorting & Filtering"
          description="Quickly find and organize jobs in your pipeline."
          items={[
            { icon: <Search className="w-4 h-4 text-indigo-500" />, label: 'Search', text: 'Filter by company, title, or description' },
            { icon: <ArrowUpDown className="w-4 h-4 text-indigo-500" />, label: 'Sort', text: 'By date added, resume fit, company, or title' },
            { icon: <XCircle className="w-4 h-4 text-indigo-500" />, label: 'Clear', text: 'Reset filters with one click' },
          ]}
          location="Toolbar below header"
          color="indigo"
        />

        <FeatureCard
          icon={<GripVertical className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          title="Drag & Drop"
          description="Move jobs through your pipeline with ease."
          items={[
            { icon: <GripVertical className="w-4 h-4 text-blue-500" />, label: 'Drag', text: 'Click and drag any job card' },
            { icon: <ArrowRight className="w-4 h-4 text-blue-500" />, label: 'Drop', text: 'Release onto a different status column' },
          ]}
          location="Main board view"
          color="blue"
        />

        <FeatureCard
          icon={<Columns className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          title="Custom Status Columns"
          description="Customize your pipeline stages."
          items={[
            { icon: <Columns className="w-4 h-4 text-purple-500" />, label: 'Add/Remove', text: 'Create stages that match your workflow' },
            { icon: <RefreshCw className="w-4 h-4 text-purple-500" />, label: 'Reorder', text: 'Drag to rearrange column order' },
          ]}
          location="Settings → Status Columns"
          color="purple"
        />

        <FeatureCard
          icon={<Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          title="Dark Mode"
          description="Easy on the eyes for late-night job hunting."
          items={[
            { icon: <Moon className="w-4 h-4 text-slate-500" />, label: 'Toggle', text: 'Switch between light and dark themes' },
            { icon: <RefreshCw className="w-4 h-4 text-slate-500" />, label: 'System', text: 'Automatically match your OS preference' },
          ]}
          location="Settings → Appearance"
          color="slate"
        />
      </div>
    </div>
  );
}

function JobDetailTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-600 dark:text-slate-400">
        Features available when viewing a specific job's details.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<Pencil className="w-5 h-5 text-green-600 dark:text-green-400" />}
          title="Edit Job Details"
          description="Update company, title, or link after adding."
          items={[
            { icon: <Pencil className="w-4 h-4 text-green-500" />, label: 'Edit', text: 'Click Edit button to modify fields' },
            { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Keyboard', text: 'Enter to save, Escape to cancel' },
          ]}
          location="Job detail → Overview tab"
          color="green"
        />

        <FeatureCard
          icon={<GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          title="Resume Fit / Grading"
          description="See how well your resume matches requirements."
          items={[
            { icon: <GraduationCap className="w-4 h-4 text-amber-500" />, label: 'Grade', text: 'Get an A-F grade based on fit' },
            { icon: <FileText className="w-4 h-4 text-amber-500" />, label: 'Analysis', text: 'Strengths, gaps, and suggestions' },
            { icon: <RefreshCw className="w-4 h-4 text-amber-500" />, label: 'Per-job', text: 'Use different resumes per job' },
          ]}
          location="Job detail → Resume tab"
          color="amber"
        />

        <FeatureCard
          icon={<FileEdit className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          title="Resume Tailoring"
          description="Customize your resume for each application."
          items={[
            { icon: <Sparkles className="w-4 h-4 text-teal-500" />, label: 'Auto-Tailor', text: 'One-click AI optimization' },
            { icon: <MessageSquare className="w-4 h-4 text-teal-500" />, label: 'Chat', text: 'Tell AI exactly what to change' },
            { icon: <GitCompare className="w-4 h-4 text-teal-500" />, label: 'Diff view', text: 'See what changed side-by-side' },
          ]}
          location="Job detail → Resume tab → Tailor"
          color="teal"
        />

        <FeatureCard
          icon={<Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          title="Keyword Matcher"
          description="See how your resume keywords match the JD."
          items={[
            { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Matched', text: 'Green badges for found keywords' },
            { icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Missing', text: 'Red badges to add' },
          ]}
          location="Job detail → Resume tab"
          color="cyan"
        />

        <FeatureCard
          icon={<FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
          title="Cover Letter"
          description="Generate and refine tailored cover letters."
          items={[
            { icon: <Sparkles className="w-4 h-4 text-rose-500" />, label: 'Generate', text: 'Based on JD and resume' },
            { icon: <MessageSquare className="w-4 h-4 text-rose-500" />, label: 'Refine', text: 'Chat to make changes' },
            { icon: <Copy className="w-4 h-4 text-rose-500" />, label: 'Export', text: 'Copy or download' },
          ]}
          location="Job detail → Cover Letter tab"
          color="rose"
        />

        <FeatureCard
          icon={<Mail className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
          title="Emails"
          description="Generate professional job search emails."
          items={[
            { icon: <Mail className="w-4 h-4 text-pink-500" />, label: 'Types', text: 'Thank You, Follow Up, Withdraw, Negotiate' },
            { icon: <MessageSquare className="w-4 h-4 text-pink-500" />, label: 'Refine', text: 'Adjust tone or content via chat' },
          ]}
          location="Job detail → Emails tab"
          color="pink"
        />

        <FeatureCard
          icon={<MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          title="Interview Prep (Q&A)"
          description="Practice and prepare with AI coaching."
          items={[
            { icon: <MessageSquare className="w-4 h-4 text-indigo-500" />, label: 'Ask', text: '"What questions might they ask?"' },
            { icon: <Sparkles className="w-4 h-4 text-indigo-500" />, label: 'Generate', text: 'Structured preparation guide' },
            { icon: <BookmarkCheck className="w-4 h-4 text-indigo-500" />, label: 'Save', text: 'Keep great answers for reuse' },
          ]}
          location="Job detail → Prep tab"
          color="indigo"
        />

        <FeatureCard
          icon={<StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          title="Notes, Contacts & Timeline"
          description="Track everything about each application."
          items={[
            { icon: <StickyNote className="w-4 h-4 text-amber-500" />, label: 'Notes', text: 'Research, prep notes, reminders' },
            { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Contacts', text: 'Recruiters and hiring managers' },
            { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Timeline', text: 'Key dates and events' },
          ]}
          location="Job detail → Notes tab"
          color="amber"
        />
      </div>
    </div>
  );
}

function AIFeaturesTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-600 dark:text-slate-400">
        AI-powered features to supercharge your job search.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<Command className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          title="AI Agent (Ctrl+K)"
          description="Natural language interface for your job search."
          items={[
            { icon: <Search className="w-4 h-4 text-violet-500" />, label: 'Search', text: '"Find remote React jobs in Seattle"' },
            { icon: <MessageSquare className="w-4 h-4 text-violet-500" />, label: 'Questions', text: 'Ask about any job in your board' },
            { icon: <ArrowRight className="w-4 h-4 text-violet-500" />, label: 'Import', text: 'Preview and add jobs directly' },
          ]}
          location="Header → AI Agent or Ctrl+K"
          color="violet"
        />

        <FeatureCard
          icon={<Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
          title="Find Jobs"
          description="Search Google Jobs without leaving the app."
          items={[
            { icon: <Search className="w-4 h-4 text-cyan-500" />, label: 'Search', text: 'Query by title, company, location' },
            { icon: <Sparkles className="w-4 h-4 text-cyan-500" />, label: 'AI Mode', text: 'Generate queries from descriptions' },
            { icon: <ArrowRight className="w-4 h-4 text-cyan-500" />, label: 'Import', text: 'Add to board with one click' },
          ]}
          location="Header → Find Jobs"
          color="cyan"
        />

        <FeatureCard
          icon={<Target className="w-5 h-5 text-lime-600 dark:text-lime-400" />}
          title="Career Coach"
          description="AI-powered career guidance."
          items={[
            { icon: <BarChart3 className="w-4 h-4 text-lime-500" />, label: 'Analysis', text: 'Patterns from your applications' },
            { icon: <MessageSquare className="w-4 h-4 text-lime-500" />, label: 'Chat', text: 'Discuss goals and strategy' },
            { icon: <Sparkles className="w-4 h-4 text-lime-500" />, label: 'Skills', text: 'Track and develop your skills' },
          ]}
          location="Header → 🎓 button"
          color="lime"
        />

        <FeatureCard
          icon={<UserCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          title="Interviewer Intel"
          description="Get insights about your interviewers."
          items={[
            { icon: <Users className="w-4 h-4 text-orange-500" />, label: 'Bio', text: "Paste interviewer's LinkedIn bio" },
            { icon: <MessageSquare className="w-4 h-4 text-orange-500" />, label: 'Insights', text: 'Style, values, talking points' },
          ]}
          location="Notes tab → Contacts → Generate Intel"
          color="orange"
        />
      </div>
    </div>
  );
}

function ProfileDataTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-600 dark:text-slate-400">
        Manage your profile, documents, and data.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureCard
          icon={<BookmarkCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          title="Saved Stories / Memories"
          description="Build a reusable profile of your best answers."
          items={[
            { icon: <Save className="w-4 h-4 text-purple-500" />, label: 'Save', text: 'Keep great answers from Q&A chats' },
            { icon: <RefreshCw className="w-4 h-4 text-purple-500" />, label: 'Reuse', text: 'Available when prepping any job' },
          ]}
          location="Settings → Profile → Saved Stories"
          color="purple"
        />

        <FeatureCard
          icon={<UserCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          title="Additional Context"
          description="Tell AI about yourself beyond your resume."
          items={[
            { icon: <Sparkles className="w-4 h-4 text-blue-500" />, label: 'Include', text: 'Skills, goals, projects, achievements' },
            { icon: <FileEdit className="w-4 h-4 text-blue-500" />, label: 'Used for', text: 'Grading, cover letters, prep' },
          ]}
          location="Settings → Profile → Additional Context"
          color="blue"
        />

        <FeatureCard
          icon={<FolderOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
          title="Context Documents"
          description="Upload PDFs for more AI context."
          items={[
            { icon: <FileText className="w-4 h-4 text-violet-500" />, label: 'Upload', text: 'Portfolio, certs, recommendations' },
            { icon: <Sparkles className="w-4 h-4 text-violet-500" />, label: 'Summarize', text: 'AI condenses large docs' },
          ]}
          location="Settings → Profile → Context Documents"
          color="violet"
        />

        <FeatureCard
          icon={<Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          title="Data & Privacy"
          description="Your data stays on your computer."
          items={[
            { icon: <Database className="w-4 h-4 text-slate-500" />, label: 'Local', text: "Stored in your browser's database" },
            { icon: <Download className="w-4 h-4 text-slate-500" />, label: 'Backup', text: 'Export as JSON anytime' },
            { icon: <Sparkles className="w-4 h-4 text-slate-500" />, label: 'API', text: 'Key only sent to your provider' },
          ]}
          location="Settings → Data Backup"
          color="slate"
        />

        <FeatureCard
          icon={<Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
          title="CSV Export"
          description="Export jobs to spreadsheet format."
          items={[
            { icon: <Download className="w-4 h-4 text-gray-500" />, label: 'Export', text: 'One-click download' },
            { icon: <FileText className="w-4 h-4 text-gray-500" />, label: 'Fields', text: 'Company, Title, Status, Match %, etc.' },
          ]}
          location="Settings → Data Backup → Export CSV"
          color="gray"
        />
      </div>
    </div>
  );
}
