import { useState } from 'react';
import { FileText, BookOpen, Paperclip, User, Target, FlaskConical, X } from 'lucide-react';
import { SlideOverPanel } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';

type ProfileSection = 'resume' | 'stories' | 'documents' | 'about' | 'skills' | 'quiz';

interface NavItem {
  id: ProfileSection;
  icon: React.ElementType;
  label: string;
}

const contentSections: NavItem[] = [
  { id: 'resume', icon: FileText, label: 'Resume' },
  { id: 'stories', icon: BookOpen, label: 'Stories' },
  { id: 'documents', icon: Paperclip, label: 'Documents' },
  { id: 'about', icon: User, label: 'About Me' },
];

const insightSections: NavItem[] = [
  { id: 'skills', icon: Target, label: 'Skills' },
  { id: 'quiz', icon: FlaskConical, label: 'AI Quiz' },
];

export function ProfileHub(): JSX.Element | null {
  const { isProfileHubOpen, closeProfileHub } = useAppStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>('resume');

  return (
    <SlideOverPanel isOpen={isProfileHubOpen} onClose={closeProfileHub} size="full">
      <div className="flex h-full">
        {/* Internal Sidebar */}
        <nav className="w-[180px] bg-surface-raised border-r border-border flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h2 className="font-display text-heading text-foreground">My Profile</h2>
          </div>

          {/* Content Sections */}
          <div className="flex-1 py-2">
            {contentSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body',
                  'transition-colors duration-fast relative',
                  activeSection === item.id
                    ? 'bg-surface text-foreground'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
                )}
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}

            {/* Divider */}
            <div className="mx-4 my-3 border-t border-border" />

            {/* Insight Sections */}
            {insightSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body',
                  'transition-colors duration-fast relative',
                  activeSection === item.id
                    ? 'bg-surface text-foreground'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                {activeSection === item.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r" />
                )}
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header with close button */}
          <div className="flex items-center justify-end px-6 py-4 border-b border-border">
            <button
              onClick={closeProfileHub}
              className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'resume' && <div>Resume Section (TODO)</div>}
            {activeSection === 'stories' && <div>Stories Section (TODO)</div>}
            {activeSection === 'documents' && <div>Documents Section (TODO)</div>}
            {activeSection === 'about' && <div>About Me Section (TODO)</div>}
            {activeSection === 'skills' && <div>Skills Section (TODO)</div>}
            {activeSection === 'quiz' && <div>AI Quiz Section (TODO)</div>}
          </div>
        </div>
      </div>
    </SlideOverPanel>
  );
}
