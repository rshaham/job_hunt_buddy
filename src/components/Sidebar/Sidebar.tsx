import { useState } from 'react';
import { LayoutGrid, Compass, Sparkles, Settings, Sun, Moon, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useAppStore } from '../../stores/appStore';

interface SidebarItem {
  id: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const {
    settings,
    updateSettings,
    openJobFinderModal,
    openCareerCoachModal,
    openSettingsModal,
    openGettingStartedModal,
    openFeatureGuideModal,
    openPrivacyModal,
  } = useAppStore();

  const mainItems: SidebarItem[] = [
    { id: 'board', icon: LayoutGrid, label: 'Jobs', onClick: () => {} },
    { id: 'find', icon: Compass, label: 'Find Jobs', onClick: openJobFinderModal },
    { id: 'coach', icon: Sparkles, label: 'Coach', onClick: openCareerCoachModal },
    { id: 'settings', icon: Settings, label: 'Settings', onClick: openSettingsModal },
  ];

  const helpItems = [
    { label: 'Getting Started', onClick: openGettingStartedModal },
    { label: 'Feature Guide', onClick: openFeatureGuideModal },
    { label: 'Privacy & Terms', onClick: openPrivacyModal },
  ];

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-surface-raised border-r border-border z-30',
        'flex flex-col transition-all duration-normal ease-smooth',
        isExpanded ? 'w-sidebar-expanded' : 'w-sidebar-collapsed'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setIsHelpOpen(false);
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <img src="/logo.png" alt="Job Hunt Buddy" className="w-8 h-8 rounded-lg flex-shrink-0" />
        <span
          className={cn(
            'ml-3 font-display font-semibold text-foreground whitespace-nowrap',
            'transition-opacity duration-fast',
            isExpanded ? 'opacity-100' : 'opacity-0'
          )}
        >
          Job Hunt Buddy
        </span>
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 py-4">
        {mainItems.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center px-4 py-3 text-foreground-muted',
              'hover:bg-surface hover:text-foreground transition-colors duration-fast',
              'relative group'
            )}
          >
            {/* Active indicator */}
            {item.id === 'board' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r" />
            )}
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span
              className={cn(
                'ml-3 font-body text-sm whitespace-nowrap',
                'transition-opacity duration-fast',
                isExpanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="py-4 border-t border-border">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-4 py-3 text-foreground-muted hover:bg-surface hover:text-foreground transition-colors duration-fast"
        >
          {settings.theme === 'dark' ? (
            <Sun className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Moon className="w-5 h-5 flex-shrink-0" />
          )}
          <span
            className={cn(
              'ml-3 font-body text-sm whitespace-nowrap',
              'transition-opacity duration-fast',
              isExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            {settings.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        {/* Help Menu */}
        <div className="relative">
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="w-full flex items-center px-4 py-3 text-foreground-muted hover:bg-surface hover:text-foreground transition-colors duration-fast"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            <span
              className={cn(
                'ml-3 font-body text-sm whitespace-nowrap',
                'transition-opacity duration-fast',
                isExpanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              Help
            </span>
          </button>

          {/* Help Dropdown */}
          {isHelpOpen && isExpanded && (
            <div className="absolute bottom-full left-0 w-full bg-surface border border-border rounded-lg shadow-lg mb-1 py-1 animate-fade-in">
              {helpItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full text-left px-4 py-2 text-sm text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
