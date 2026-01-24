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
  Book,
  Mic,
  Video,
  CalendarCheck,
  Presentation,
  Star,
  ListChecks,
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
  gradient: string;
  isNew?: boolean;
}

function FeatureCard({ icon, title, description, items, location, gradient, isNew }: FeatureCardProps) {
  return (
    <div className="group relative p-6 rounded-2xl bg-surface border border-border hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5">
      {/* Gradient overlay on hover */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />

      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {isNew && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-white rounded-full">
                  New
                </span>
              )}
            </div>
            <p className="text-sm text-foreground-muted">{description}</p>
          </div>
        </div>

        <ul className="space-y-3 mb-5">
          {items.map((item, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-surface-raised flex items-center justify-center">
                {item.icon}
              </span>
              <span className="text-foreground-muted">
                <strong className="text-foreground">{item.label}:</strong> {item.text}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 pt-4 border-t border-border text-xs text-foreground-subtle">
          <MapPin className="w-3.5 h-3.5" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
}

export function FeatureGuideModal() {
  const { isFeatureGuideModalOpen, closeFeatureGuideModal } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('new');

  const tabs: { id: TabId; label: string; icon: React.ReactNode; gradient: string }[] = [
    { id: 'new', label: "What's New", icon: <Zap className="w-4 h-4" />, gradient: 'from-amber-500 to-orange-600' },
    { id: 'board', label: 'Board', icon: <Kanban className="w-4 h-4" />, gradient: 'from-blue-500 to-cyan-600' },
    { id: 'job-detail', label: 'Job Detail', icon: <FileText className="w-4 h-4" />, gradient: 'from-purple-500 to-pink-600' },
    { id: 'ai', label: 'AI Features', icon: <Sparkles className="w-4 h-4" />, gradient: 'from-violet-500 to-purple-600' },
    { id: 'profile', label: 'Profile & Data', icon: <Database className="w-4 h-4" />, gradient: 'from-slate-500 to-slate-600' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <Modal
      isOpen={isFeatureGuideModalOpen}
      onClose={closeFeatureGuideModal}
      title=""
      size="full"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border bg-gradient-to-b from-surface-raised to-surface">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
              <Book className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
                Feature Guide
              </h1>
              <p className="text-sm text-foreground-muted">
                Everything Job Hunt Buddy can do for you
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'text-foreground-muted hover:bg-surface-raised hover:text-foreground'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {/* Tab Title */}
            {activeTabData && (
              <div className="flex items-center gap-3 mb-8">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeTabData.gradient} flex items-center justify-center`}>
                  {activeTabData.icon}
                </div>
                <h2 className="text-xl font-semibold text-foreground">{activeTabData.label}</h2>
              </div>
            )}

            {activeTab === 'new' && <WhatsNewTab />}
            {activeTab === 'board' && <BoardTab />}
            {activeTab === 'job-detail' && <JobDetailTab />}
            {activeTab === 'ai' && <AIFeaturesTab />}
            {activeTab === 'profile' && <ProfileDataTab />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function WhatsNewTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Teleprompter */}
      <FeatureCard
        icon={<Presentation className="w-6 h-6 text-white" />}
        title="Interview Teleprompter"
        description="Your live interview buddy with real-time AI assistance."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-violet-500" />, label: 'Keywords', text: 'AI suggests talking points as you practice' },
          { icon: <BookmarkCheck className="w-4 h-4 text-violet-500" />, label: 'Stories', text: 'Access your STAR stories during practice' },
          { icon: <Mic className="w-4 h-4 text-violet-500" />, label: 'Pitch', text: 'Your "Tell Me About Yourself" at a glance' },
        ]}
        location="Job → Interviews tab → Teleprompter"
        gradient="from-violet-500 to-purple-600"
        isNew
      />

      {/* My Profile Hub */}
      <FeatureCard
        icon={<UserCircle className="w-6 h-6 text-white" />}
        title="My Profile Hub"
        description="Centralized professional profile management."
        items={[
          { icon: <FileText className="w-4 h-4 text-blue-500" />, label: 'Resume', text: 'Upload and manage your resume' },
          { icon: <BookmarkCheck className="w-4 h-4 text-blue-500" />, label: 'Stories', text: 'STAR format interview stories with themes' },
          { icon: <Mic className="w-4 h-4 text-blue-500" />, label: 'Pitches', text: 'Multiple "Tell Me About Yourself" scripts' },
        ]}
        location="Sidebar → My Profile"
        gradient="from-blue-500 to-cyan-600"
        isNew
      />

      {/* Interviews Tab */}
      <FeatureCard
        icon={<Video className="w-6 h-6 text-white" />}
        title="Interviews Tab"
        description="Track and prepare for every interview round."
        items={[
          { icon: <CalendarCheck className="w-4 h-4 text-emerald-500" />, label: 'Schedule', text: 'Add rounds with date, time, and type' },
          { icon: <Users className="w-4 h-4 text-emerald-500" />, label: 'Interviewers', text: 'Assign contacts to each round' },
          { icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, label: 'Prep', text: 'Round-specific AI coaching' },
        ]}
        location="Job detail → Interviews tab"
        gradient="from-emerald-500 to-green-600"
        isNew
      />

      {/* My Pitch */}
      <FeatureCard
        icon={<Mic className="w-6 h-6 text-white" />}
        title="My Pitch Generator"
        description="Create polished 'Tell Me About Yourself' responses."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-amber-500" />, label: 'Generate', text: 'AI crafts pitch from your profile' },
          { icon: <RefreshCw className="w-4 h-4 text-amber-500" />, label: 'Refine', text: 'Iterate with AI suggestions' },
          { icon: <Target className="w-4 h-4 text-amber-500" />, label: 'Multiple', text: 'Different pitches for different roles' },
        ]}
        location="My Profile → My Pitch"
        gradient="from-amber-500 to-orange-600"
        isNew
      />
    </div>
  );
}

function BoardTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FeatureCard
        icon={<ArrowUpDown className="w-6 h-6 text-white" />}
        title="Sorting & Filtering"
        description="Quickly find and organize jobs in your pipeline."
        items={[
          { icon: <Search className="w-4 h-4 text-indigo-500" />, label: 'Search', text: 'Filter by company, title, or description' },
          { icon: <ArrowUpDown className="w-4 h-4 text-indigo-500" />, label: 'Sort', text: 'By date added, resume fit, company, or title' },
          { icon: <XCircle className="w-4 h-4 text-indigo-500" />, label: 'Clear', text: 'Reset filters with one click' },
        ]}
        location="Toolbar below header"
        gradient="from-indigo-500 to-purple-600"
      />

      <FeatureCard
        icon={<GripVertical className="w-6 h-6 text-white" />}
        title="Drag & Drop"
        description="Move jobs through your pipeline with ease."
        items={[
          { icon: <GripVertical className="w-4 h-4 text-blue-500" />, label: 'Drag', text: 'Click and drag any job card' },
          { icon: <ArrowRight className="w-4 h-4 text-blue-500" />, label: 'Drop', text: 'Release onto a different status column' },
        ]}
        location="Main board view"
        gradient="from-blue-500 to-cyan-600"
      />

      <FeatureCard
        icon={<Columns className="w-6 h-6 text-white" />}
        title="Custom Status Columns"
        description="Customize your pipeline stages."
        items={[
          { icon: <Columns className="w-4 h-4 text-purple-500" />, label: 'Add/Remove', text: 'Create stages that match your workflow' },
          { icon: <RefreshCw className="w-4 h-4 text-purple-500" />, label: 'Reorder', text: 'Drag to rearrange column order' },
        ]}
        location="Settings → Status Columns"
        gradient="from-purple-500 to-pink-600"
      />

      <FeatureCard
        icon={<Moon className="w-6 h-6 text-white" />}
        title="Dark Mode"
        description="Easy on the eyes for late-night job hunting."
        items={[
          { icon: <Moon className="w-4 h-4 text-slate-500" />, label: 'Toggle', text: 'Switch between light and dark themes' },
          { icon: <RefreshCw className="w-4 h-4 text-slate-500" />, label: 'System', text: 'Automatically match your OS preference' },
        ]}
        location="Settings → Appearance"
        gradient="from-slate-500 to-slate-700"
      />
    </div>
  );
}

function JobDetailTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FeatureCard
        icon={<Pencil className="w-6 h-6 text-white" />}
        title="Edit Job Details"
        description="Update company, title, or link after adding."
        items={[
          { icon: <Pencil className="w-4 h-4 text-green-500" />, label: 'Edit', text: 'Click Edit button to modify fields' },
          { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Keyboard', text: 'Enter to save, Escape to cancel' },
        ]}
        location="Job detail → Overview tab"
        gradient="from-green-500 to-emerald-600"
      />

      <FeatureCard
        icon={<GraduationCap className="w-6 h-6 text-white" />}
        title="Resume Fit / Grading"
        description="See how well your resume matches requirements."
        items={[
          { icon: <GraduationCap className="w-4 h-4 text-amber-500" />, label: 'Grade', text: 'Get an A-F grade based on fit' },
          { icon: <FileText className="w-4 h-4 text-amber-500" />, label: 'Analysis', text: 'Strengths, gaps, and suggestions' },
          { icon: <RefreshCw className="w-4 h-4 text-amber-500" />, label: 'Per-job', text: 'Use different resumes per job' },
        ]}
        location="Job detail → Resume tab"
        gradient="from-amber-500 to-orange-600"
      />

      <FeatureCard
        icon={<FileEdit className="w-6 h-6 text-white" />}
        title="Resume Tailoring"
        description="Customize your resume for each application."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-teal-500" />, label: 'Auto-Tailor', text: 'One-click AI optimization' },
          { icon: <MessageSquare className="w-4 h-4 text-teal-500" />, label: 'Chat', text: 'Tell AI exactly what to change' },
          { icon: <GitCompare className="w-4 h-4 text-teal-500" />, label: 'Diff view', text: 'See what changed side-by-side' },
        ]}
        location="Job detail → Resume tab → Tailor"
        gradient="from-teal-500 to-cyan-600"
      />

      <FeatureCard
        icon={<Search className="w-6 h-6 text-white" />}
        title="Keyword Matcher"
        description="See how your resume keywords match the JD."
        items={[
          { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Matched', text: 'Green badges for found keywords' },
          { icon: <XCircle className="w-4 h-4 text-red-500" />, label: 'Missing', text: 'Red badges to add' },
        ]}
        location="Job detail → Resume tab"
        gradient="from-cyan-500 to-blue-600"
      />

      <FeatureCard
        icon={<FileText className="w-6 h-6 text-white" />}
        title="Cover Letter"
        description="Generate and refine tailored cover letters."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-rose-500" />, label: 'Generate', text: 'Based on JD and resume' },
          { icon: <MessageSquare className="w-4 h-4 text-rose-500" />, label: 'Refine', text: 'Chat to make changes' },
          { icon: <Copy className="w-4 h-4 text-rose-500" />, label: 'Export', text: 'Copy or download' },
        ]}
        location="Job detail → Cover Letter tab"
        gradient="from-rose-500 to-pink-600"
      />

      <FeatureCard
        icon={<Mail className="w-6 h-6 text-white" />}
        title="Emails"
        description="Generate professional job search emails."
        items={[
          { icon: <Mail className="w-4 h-4 text-pink-500" />, label: 'Types', text: 'Thank You, Follow Up, Withdraw, Negotiate' },
          { icon: <MessageSquare className="w-4 h-4 text-pink-500" />, label: 'Refine', text: 'Adjust tone or content via chat' },
        ]}
        location="Job detail → Emails tab"
        gradient="from-pink-500 to-rose-600"
      />

      <FeatureCard
        icon={<MessageSquare className="w-6 h-6 text-white" />}
        title="Interview Prep (Q&A)"
        description="Practice and prepare with AI coaching."
        items={[
          { icon: <MessageSquare className="w-4 h-4 text-indigo-500" />, label: 'Ask', text: '"What questions might they ask?"' },
          { icon: <Sparkles className="w-4 h-4 text-indigo-500" />, label: 'Generate', text: 'Structured preparation guide' },
          { icon: <BookmarkCheck className="w-4 h-4 text-indigo-500" />, label: 'Save', text: 'Keep great answers for reuse' },
        ]}
        location="Job detail → Prep tab"
        gradient="from-indigo-500 to-purple-600"
      />

      <FeatureCard
        icon={<StickyNote className="w-6 h-6 text-white" />}
        title="Notes, Contacts & Timeline"
        description="Track everything about each application."
        items={[
          { icon: <StickyNote className="w-4 h-4 text-amber-500" />, label: 'Notes', text: 'Research, prep notes, reminders' },
          { icon: <Users className="w-4 h-4 text-blue-500" />, label: 'Contacts', text: 'Recruiters and hiring managers' },
          { icon: <Calendar className="w-4 h-4 text-purple-500" />, label: 'Timeline', text: 'Key dates and events' },
        ]}
        location="Job detail → Notes tab"
        gradient="from-amber-500 to-orange-600"
      />

      <FeatureCard
        icon={<Video className="w-6 h-6 text-white" />}
        title="Interviews"
        description="Track interview rounds and prepare for each one."
        items={[
          { icon: <CalendarCheck className="w-4 h-4 text-emerald-500" />, label: 'Schedule', text: 'Add rounds with type, date, duration' },
          { icon: <Users className="w-4 h-4 text-emerald-500" />, label: 'Interviewers', text: 'Link contacts to track who you meet' },
          { icon: <Presentation className="w-4 h-4 text-emerald-500" />, label: 'Teleprompter', text: 'Your live interview buddy and helper' },
          { icon: <MessageSquare className="w-4 h-4 text-emerald-500" />, label: 'Prep', text: 'AI coaching specific to each round' },
        ]}
        location="Job detail → Interviews tab"
        gradient="from-emerald-500 to-green-600"
      />
    </div>
  );
}

function AIFeaturesTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FeatureCard
        icon={<Command className="w-6 h-6 text-white" />}
        title="AI Agent (Ctrl+K)"
        description="Natural language interface for your job search."
        items={[
          { icon: <Search className="w-4 h-4 text-violet-500" />, label: 'Search', text: '"Find remote React jobs in Seattle"' },
          { icon: <MessageSquare className="w-4 h-4 text-violet-500" />, label: 'Questions', text: 'Ask about any job in your board' },
          { icon: <ArrowRight className="w-4 h-4 text-violet-500" />, label: 'Import', text: 'Preview and add jobs directly' },
        ]}
        location="Header → AI Agent or Ctrl+K"
        gradient="from-violet-500 to-purple-600"
      />

      <FeatureCard
        icon={<Search className="w-6 h-6 text-white" />}
        title="Find Jobs"
        description="Search Google Jobs without leaving the app."
        items={[
          { icon: <Search className="w-4 h-4 text-cyan-500" />, label: 'Search', text: 'Query by title, company, location' },
          { icon: <Sparkles className="w-4 h-4 text-cyan-500" />, label: 'AI Mode', text: 'Generate queries from descriptions' },
          { icon: <ArrowRight className="w-4 h-4 text-cyan-500" />, label: 'Import', text: 'Add to board with one click' },
        ]}
        location="Sidebar → Find Jobs"
        gradient="from-cyan-500 to-blue-600"
      />

      <FeatureCard
        icon={<Target className="w-6 h-6 text-white" />}
        title="Career Coach"
        description="AI-powered career guidance."
        items={[
          { icon: <BarChart3 className="w-4 h-4 text-lime-500" />, label: 'Analysis', text: 'Patterns from your applications' },
          { icon: <MessageSquare className="w-4 h-4 text-lime-500" />, label: 'Chat', text: 'Discuss goals and strategy' },
          { icon: <Sparkles className="w-4 h-4 text-lime-500" />, label: 'Skills', text: 'Track and develop your skills' },
        ]}
        location="Sidebar → Career Coach"
        gradient="from-lime-500 to-green-600"
      />

      <FeatureCard
        icon={<UserCheck className="w-6 h-6 text-white" />}
        title="Interviewer Intel"
        description="Get insights about your interviewers."
        items={[
          { icon: <Users className="w-4 h-4 text-orange-500" />, label: 'Bio', text: "Paste interviewer's LinkedIn bio" },
          { icon: <MessageSquare className="w-4 h-4 text-orange-500" />, label: 'Insights', text: 'Style, values, talking points' },
        ]}
        location="Notes tab → Contacts → Generate Intel"
        gradient="from-orange-500 to-amber-600"
      />

      <FeatureCard
        icon={<Presentation className="w-6 h-6 text-white" />}
        title="Interview Teleprompter"
        description="Your AI-powered interview companion."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-violet-500" />, label: 'Keywords', text: 'AI suggests talking points in real-time' },
          { icon: <BookmarkCheck className="w-4 h-4 text-violet-500" />, label: 'Stories', text: 'Browse your STAR stories during practice' },
          { icon: <Mic className="w-4 h-4 text-violet-500" />, label: 'Pitch', text: 'Quick access to your elevator pitch' },
          { icon: <Users className="w-4 h-4 text-violet-500" />, label: 'Intel', text: 'Interviewer insights in context panel' },
        ]}
        location="Job → Interviews → Teleprompter"
        gradient="from-violet-500 to-purple-600"
      />
    </div>
  );
}

function ProfileDataTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <FeatureCard
        icon={<BookmarkCheck className="w-6 h-6 text-white" />}
        title="Interview Stories"
        description="STAR format stories for behavioral interviews."
        items={[
          { icon: <ListChecks className="w-4 h-4 text-purple-500" />, label: 'STAR', text: 'Situation, Task, Action, Result format' },
          { icon: <Target className="w-4 h-4 text-purple-500" />, label: 'Themes', text: 'Tag by Leadership, Technical, Teamwork, etc.' },
          { icon: <Star className="w-4 h-4 text-purple-500" />, label: 'Strength', text: 'Rate stories 1-5 for quick reference' },
        ]}
        location="My Profile → Stories"
        gradient="from-purple-500 to-pink-600"
      />

      <FeatureCard
        icon={<Mic className="w-6 h-6 text-white" />}
        title="My Pitch"
        description="Elevator pitches for 'Tell Me About Yourself'."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-amber-500" />, label: 'Generate', text: 'AI creates from your profile' },
          { icon: <RefreshCw className="w-4 h-4 text-amber-500" />, label: 'Refine', text: 'Iterate to perfect your pitch' },
          { icon: <CheckCircle2 className="w-4 h-4 text-amber-500" />, label: 'Active', text: 'Set which pitch appears in Teleprompter' },
        ]}
        location="My Profile → My Pitch"
        gradient="from-amber-500 to-orange-600"
      />

      <FeatureCard
        icon={<UserCircle className="w-6 h-6 text-white" />}
        title="Additional Context"
        description="Tell AI about yourself beyond your resume."
        items={[
          { icon: <Sparkles className="w-4 h-4 text-blue-500" />, label: 'Include', text: 'Skills, goals, projects, achievements' },
          { icon: <FileEdit className="w-4 h-4 text-blue-500" />, label: 'Used for', text: 'Grading, cover letters, prep' },
        ]}
        location="My Profile → About Me"
        gradient="from-blue-500 to-cyan-600"
      />

      <FeatureCard
        icon={<FolderOpen className="w-6 h-6 text-white" />}
        title="Context Documents"
        description="Upload PDFs for more AI context."
        items={[
          { icon: <FileText className="w-4 h-4 text-violet-500" />, label: 'Upload', text: 'Portfolio, certs, recommendations' },
          { icon: <Sparkles className="w-4 h-4 text-violet-500" />, label: 'Summarize', text: 'AI condenses large docs' },
        ]}
        location="My Profile → Documents"
        gradient="from-violet-500 to-purple-600"
      />

      <FeatureCard
        icon={<Database className="w-6 h-6 text-white" />}
        title="Data & Privacy"
        description="Your data stays on your computer."
        items={[
          { icon: <Database className="w-4 h-4 text-slate-500" />, label: 'Local', text: "Stored in your browser's database" },
          { icon: <Download className="w-4 h-4 text-slate-500" />, label: 'Backup', text: 'Export as JSON anytime' },
          { icon: <Sparkles className="w-4 h-4 text-slate-500" />, label: 'API', text: 'Key only sent to your provider' },
        ]}
        location="Sidebar → Settings → Data Backup"
        gradient="from-slate-500 to-slate-700"
      />

      <FeatureCard
        icon={<Download className="w-6 h-6 text-white" />}
        title="CSV Export"
        description="Export jobs to spreadsheet format."
        items={[
          { icon: <Download className="w-4 h-4 text-gray-500" />, label: 'Export', text: 'One-click download' },
          { icon: <FileText className="w-4 h-4 text-gray-500" />, label: 'Fields', text: 'Company, Title, Status, Match %, etc.' },
        ]}
        location="Sidebar → Settings → Export CSV"
        gradient="from-gray-500 to-gray-700"
      />
    </div>
  );
}
