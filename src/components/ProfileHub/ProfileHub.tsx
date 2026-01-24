import { useState } from 'react';
import { FileText, BookOpen, Paperclip, User, Target, FlaskConical, ArrowLeft, Mic } from 'lucide-react';
import { SlideOverPanel } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../utils/helpers';
import { StoriesSection } from './StoriesSection';
import { AddStoryModal } from './AddStoryModal';
import { ResumeSection } from './ResumeSection';
import { DocumentsSection } from './DocumentsSection';
import { AboutMeSection } from './AboutMeSection';
import { SkillsSection } from './SkillsSection';
import { QuizSection } from './QuizSection';
import { MyPitchPage } from './MyPitchPage';
import type { SavedStory } from '../../types';

type ProfileSection = 'resume' | 'stories' | 'pitch' | 'documents' | 'about' | 'skills' | 'quiz';

interface NavItem {
  id: ProfileSection;
  icon: React.ElementType;
  label: string;
}

const contentSections: NavItem[] = [
  { id: 'resume', icon: FileText, label: 'Resume' },
  { id: 'stories', icon: BookOpen, label: 'Stories' },
  { id: 'pitch', icon: Mic, label: 'My Pitch' },
  { id: 'documents', icon: Paperclip, label: 'Documents' },
  { id: 'about', icon: User, label: 'About Me' },
];

const insightSections: NavItem[] = [
  { id: 'skills', icon: Target, label: 'Skills' },
  { id: 'quiz', icon: FlaskConical, label: 'AI Quiz' },
];

export function ProfileHub(): JSX.Element | null {
  const { isProfileHubOpen, closeProfileHub, settings } = useAppStore();
  const [activeSection, setActiveSection] = useState<ProfileSection>('resume');
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<SavedStory | null>(null);

  const handleAddStory = () => {
    setEditingStory(null);
    setIsAddStoryModalOpen(true);
  };

  const handleEditStory = (storyId: string) => {
    const story = settings.savedStories?.find((s) => s.id === storyId);
    if (story) {
      setEditingStory(story);
      setIsAddStoryModalOpen(true);
    }
  };

  return (
    <SlideOverPanel isOpen={isProfileHubOpen} onClose={closeProfileHub} size="full">
      <div className="flex flex-col h-full">
        {/* Full-width Header */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
          <button
            onClick={closeProfileHub}
            className="p-2 -ml-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast group"
            aria-label="Close profile"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
          <User className="w-6 h-6 text-primary" />
          <h1 className="font-display text-heading-lg text-foreground">My Profile</h1>
        </header>

        {/* Sidebar + Content Row */}
        <div className="flex flex-1 overflow-hidden">
          {/* Internal Sidebar */}
          <nav className="w-[180px] bg-surface-raised border-r border-border flex flex-col">
            {/* Navigation Sections */}
            <div className="flex-1 py-4">
            {contentSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-[calc(100%-16px)] mx-2 flex items-center gap-3 px-3 py-2.5 text-sm font-body rounded-lg',
                  'transition-all duration-fast',
                  activeSection === item.id
                    ? 'bg-primary-subtle text-primary font-medium'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4 transition-colors duration-fast',
                  activeSection === item.id ? 'text-primary' : 'text-foreground-subtle'
                )} />
                {item.label}
              </button>
            ))}

            {/* Insights Section Label */}
            <div className="mx-4 mt-5 mb-2">
              <span className="text-[10px] font-medium tracking-wider text-foreground-subtle uppercase">
                Insights
              </span>
            </div>

            {/* Insight Sections */}
            {insightSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-[calc(100%-16px)] mx-2 flex items-center gap-3 px-3 py-2.5 text-sm font-body rounded-lg',
                  'transition-all duration-fast',
                  activeSection === item.id
                    ? 'bg-primary-subtle text-primary font-medium'
                    : 'text-foreground-muted hover:bg-surface hover:text-foreground'
                )}
              >
                <item.icon className={cn(
                  'w-4 h-4 transition-colors duration-fast',
                  activeSection === item.id ? 'text-primary' : 'text-foreground-subtle'
                )} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === 'resume' && <ResumeSection />}
            {activeSection === 'stories' && (
              <StoriesSection
                onAddStory={handleAddStory}
                onEditStory={handleEditStory}
              />
            )}
            {activeSection === 'pitch' && <MyPitchPage />}
            {activeSection === 'documents' && <DocumentsSection />}
            {activeSection === 'about' && <AboutMeSection />}
            {activeSection === 'skills' && <SkillsSection />}
            {activeSection === 'quiz' && <QuizSection />}
          </div>
        </div>
        </div>
      </div>
      <AddStoryModal
        isOpen={isAddStoryModalOpen}
        onClose={() => {
          setIsAddStoryModalOpen(false);
          setEditingStory(null);
        }}
        editingStory={editingStory}
      />
    </SlideOverPanel>
  );
}
