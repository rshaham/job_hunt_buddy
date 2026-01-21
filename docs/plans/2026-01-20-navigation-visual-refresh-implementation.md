# Navigation & Visual Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Job Hunt Buddy from a modal-heavy app into a sidebar-driven layout with a calm/confident visual refresh (sage/teal colors, humanist typography, smooth animations).

**Architecture:** Add a persistent left sidebar (64px collapsed, 200px expanded) for navigation. Replace full-screen modals with slide-over panels from the right. Update CSS custom properties for new color palette and typography. Job Detail becomes a slide-over panel instead of full-screen overlay.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Zustand, Google Fonts (Switzer, Source Sans 3)

---

## Phase 1: Foundation (Colors, Typography, Animation Tokens)

### Task 1.1: Update CSS Custom Properties for New Color Palette

**Files:**
- Modify: `src/index.css:1-32`

**Step 1: Replace color variables in index.css**

Replace the `:root` and `.dark` blocks with the new warm sage/teal palette:

```css
/* CSS Custom Properties for automatic dark mode */
:root {
  /* Primary (Sage/Teal) */
  --color-primary: 74 158 143;           /* #4A9E8F */
  --color-primary-hover: 61 133 119;     /* #3D8577 */
  --color-primary-subtle: 232 245 242;   /* #E8F5F2 */

  /* Text colors (Warm) */
  --color-foreground: 44 44 42;          /* #2C2C2A */
  --color-foreground-muted: 107 107 102; /* #6B6B66 */
  --color-foreground-subtle: 156 156 150; /* #9C9C96 */

  /* Background colors (Warm white) */
  --color-background: 250 250 248;       /* #FAFAF8 */
  --color-surface: 255 255 255;          /* #FFFFFF */
  --color-surface-raised: 245 245 243;   /* #F5F5F3 */

  /* Border colors (Warm) */
  --color-border: 229 228 225;           /* #E5E4E1 */
  --color-border-muted: 203 213 225;     /* slate-300 for compatibility */
}

.dark {
  /* Primary (Sage/Teal - lighter for dark mode) */
  --color-primary: 93 184 167;           /* #5DB8A7 */
  --color-primary-hover: 111 196 181;    /* #6FC4B5 */
  --color-primary-subtle: 26 47 43;      /* #1A2F2B */

  /* Text colors */
  --color-foreground: 245 245 243;       /* #F5F5F3 */
  --color-foreground-muted: 163 163 158; /* #A3A39E */
  --color-foreground-subtle: 107 107 102; /* #6B6B66 */

  /* Background colors (Dark warm) */
  --color-background: 28 28 26;          /* #1C1C1A */
  --color-surface: 37 37 35;             /* #252523 */
  --color-surface-raised: 46 46 43;      /* #2E2E2B */

  /* Border colors */
  --color-border: 58 58 54;              /* #3A3A36 */
  --color-border-muted: 71 85 105;       /* slate-600 for compatibility */
}
```

**Step 2: Run dev server to verify no build errors**

Run: `npm run dev`
Expected: Server starts without CSS errors

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: update color palette to warm sage/teal theme"
```

---

### Task 1.2: Add Typography (Google Fonts)

**Files:**
- Modify: `index.html` (add font links)
- Modify: `tailwind.config.js` (add font families)

**Step 1: Add Google Fonts to index.html**

Add before `</head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
```

Note: Switzer is not on Google Fonts. We'll use DM Sans as an alternative (similar humanist warmth):

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600&family=Source+Sans+3:wght@400;500;600&display=swap" rel="stylesheet">
```

**Step 2: Update tailwind.config.js with font families**

Add to `theme.extend`:

```javascript
fontFamily: {
  display: ['DM Sans', 'system-ui', 'sans-serif'],
  body: ['Source Sans 3', 'system-ui', 'sans-serif'],
},
```

**Step 3: Verify fonts load**

Run: `npm run dev`
Open browser dev tools > Network > filter "font"
Expected: DM Sans and Source Sans 3 fonts loading

**Step 4: Commit**

```bash
git add index.html tailwind.config.js
git commit -m "feat: add DM Sans and Source Sans 3 typography"
```

---

### Task 1.3: Update Tailwind Config with Full Design Tokens

**Files:**
- Modify: `tailwind.config.js`

**Step 1: Replace tailwind.config.js with complete design tokens**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic colors using CSS variables (auto dark mode)
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          subtle: 'rgb(var(--color-primary-subtle) / <alpha-value>)',
        },
        foreground: {
          DEFAULT: 'rgb(var(--color-foreground) / <alpha-value>)',
          muted: 'rgb(var(--color-foreground-muted) / <alpha-value>)',
          subtle: 'rgb(var(--color-foreground-subtle) / <alpha-value>)',
        },
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border) / <alpha-value>)',
          muted: 'rgb(var(--color-border-muted) / <alpha-value>)',
        },
        // Status colors (muted for calm aesthetic)
        status: {
          interested: '#8B7EC8',
          applied: '#5B93D4',
          screening: '#06b6d4',
          interviewing: '#D4A056',
          offer: '#5BAD7A',
          rejected: '#8C8C88',
          withdrawn: '#9ca3af',
        },
        // Legacy support
        success: '#5BAD7A',
        warning: '#D4A056',
        danger: '#ef4444',
      },
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-lg': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        'sidebar-collapsed': '64px',
        'sidebar-expanded': '200px',
      },
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'slide-in-right': 'slideInRight 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-out-right': 'slideOutRight 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 150ms ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        'panel': '-4px 0 24px -4px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
```

**Step 2: Run build to verify config**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add complete design tokens (colors, typography, animations)"
```

---

### Task 1.4: Update Button Component with New Styles

**Files:**
- Modify: `src/components/ui/Button.tsx`

**Step 1: Update Button with new design**

```typescript
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium font-body rounded-lg',
          'transition-all duration-fast ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
          'disabled:opacity-50 disabled:pointer-events-none',
          // Hover/active micro-interactions
          'hover:scale-[1.02] active:scale-[0.98]',
          {
            // Variants
            'bg-primary text-white hover:bg-primary-hover': variant === 'primary',
            'bg-transparent text-primary border border-primary hover:bg-primary-subtle':
              variant === 'secondary',
            'bg-transparent text-foreground-muted hover:bg-surface-raised hover:text-foreground':
              variant === 'ghost',
            'bg-danger text-white hover:bg-red-600': variant === 'danger',
            // Sizes (updated padding)
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-5 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Step 2: Verify button renders correctly**

Run: `npm run dev`
Check: Buttons should have rounded corners, new colors, hover scale effect

**Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat: update Button with new design tokens and micro-interactions"
```

---

## Phase 2: New Navigation Components

### Task 2.1: Create SlideOverPanel Component

**Files:**
- Create: `src/components/ui/SlideOverPanel.tsx`
- Modify: `src/components/ui/index.ts` (add export)

**Step 1: Create SlideOverPanel component**

```typescript
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface SlideOverPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SlideOverPanel({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = 'md',
}: SlideOverPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop - dims but doesn't blur */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-normal"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative bg-surface shadow-panel h-full flex flex-col',
          'animate-slide-in-right',
          {
            'w-full max-w-sm': size === 'sm',
            'w-full max-w-md': size === 'md',
            'w-full max-w-lg': size === 'lg',
            'w-[60%] max-w-4xl': size === 'xl',
          },
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
            <h2 className="font-display text-heading-lg text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
```

**Step 2: Add export to ui/index.ts**

Add to `src/components/ui/index.ts`:

```typescript
export { SlideOverPanel } from './SlideOverPanel';
```

**Step 3: Verify component compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/ui/SlideOverPanel.tsx src/components/ui/index.ts
git commit -m "feat: add SlideOverPanel component for new navigation pattern"
```

---

### Task 2.2: Create Sidebar Component

**Files:**
- Create: `src/components/Sidebar/Sidebar.tsx`
- Create: `src/components/Sidebar/index.ts`

**Step 1: Create Sidebar component**

```typescript
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
```

**Step 2: Create index.ts**

```typescript
export { Sidebar } from './Sidebar';
```

**Step 3: Verify component compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/Sidebar/
git commit -m "feat: add Sidebar navigation component"
```

---

### Task 2.3: Add Sidebar to App Layout

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and add Sidebar**

Add import:
```typescript
import { Sidebar } from './components/Sidebar';
```

Update return JSX to include Sidebar and adjust layout:

```typescript
return (
  <div className="flex">
    <Sidebar />
    <main className="flex-1 ml-sidebar-collapsed">
      <BoardView />
      {selectedJob && <JobDetailView job={selectedJob} />}
    </main>
    <AddJobModal />
    <SettingsModal />
    <GettingStartedModal />
    <PrivacyModal />
    <FeatureGuideModal />
    <CareerCoachModal />
    <JobFinderModal />
    <BatchScannerModal />
    <CommandBar />
    <ToastContainer />
    <Analytics />
  </div>
);
```

**Step 2: Verify sidebar appears**

Run: `npm run dev`
Expected: Sidebar visible on left, expands on hover

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate Sidebar into App layout"
```

---

## Phase 3: Update BoardView Header

### Task 3.1: Simplify BoardView Header (Move Items to Sidebar)

**Files:**
- Modify: `src/components/Board/BoardView.tsx`

**Step 1: Remove navigation items that moved to sidebar**

Remove these items from the header:
- Getting Started button
- Feature Guide button
- Career Coach button
- Privacy button
- Settings button
- Find Jobs button (keep in header as quick action)

Keep in header:
- Logo + Title (simplified)
- Add Job button
- Batch Scan button
- AI Agent button
- Model indicator

Update the header section (around lines 161-226):

```typescript
{/* Header */}
<header className="flex items-center justify-between px-6 py-4 bg-surface border-b border-border">
  <div className="flex items-center gap-3">
    <h1 className="font-display text-display text-foreground">
      Your Jobs
    </h1>
    <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
      beta
    </span>
  </div>

  <div className="flex items-center gap-2">
    <Button onClick={openAddJobModal} size="sm">
      <Plus className="w-4 h-4 mr-1" />
      Add Job
    </Button>
    <Button onClick={openBatchScannerModal} size="sm" variant="secondary" title="Scan multiple career pages">
      <ListChecks className="w-4 h-4 mr-1" />
      Batch Scan
    </Button>
    <button
      type="button"
      onClick={() => useCommandBarStore.getState().open()}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground-muted
        hover:bg-surface-raised rounded-lg transition-colors duration-fast"
      title="Open AI Agent (Ctrl+K)"
    >
      <Sparkles className="w-4 h-4" />
      <span>AI Agent</span>
      <kbd className="px-1.5 py-0.5 text-xs bg-surface-raised rounded font-mono">
        Ctrl+K
      </kbd>
    </button>
    {/* Active AI Model Indicator */}
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-foreground-muted
        bg-surface-raised rounded-lg border border-border"
      title={`Active AI: ${settings.providers[settings.activeProvider]?.model || 'Not configured'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
      <span className="font-medium font-body">{settings.providers[settings.activeProvider]?.model || 'No model'}</span>
    </div>
    <EmbeddingStatus />
  </div>
</header>
```

**Step 2: Remove unused imports**

Remove from imports:
```typescript
// Remove: Settings, HelpCircle, Shield, BookOpen, GraduationCap, Search (if not used elsewhere)
```

Remove from destructured store functions:
```typescript
// Remove: openSettingsModal, openGettingStartedModal, openPrivacyModal, openFeatureGuideModal, openCareerCoachModal
```

**Step 3: Update background color**

Change line 159 from:
```typescript
<div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900">
```
to:
```typescript
<div className="flex flex-col h-screen bg-background">
```

**Step 4: Verify header is simplified**

Run: `npm run dev`
Expected: Header shows only essential items, navigation in sidebar

**Step 5: Commit**

```bash
git add src/components/Board/BoardView.tsx
git commit -m "refactor: simplify BoardView header, move nav to sidebar"
```

---

## Phase 4: Convert Job Detail to Slide-Over

### Task 4.1: Update JobDetailView to Use SlideOverPanel

**Files:**
- Modify: `src/components/JobDetail/JobDetailView.tsx`

**Step 1: Convert JobDetailView to slide-over pattern**

Replace the component:

```typescript
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, ConfirmModal, SlideOverPanel } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { OverviewTab } from './OverviewTab';
import { ResumeFitTab } from './ResumeFitTab';
import { CoverLetterTab } from './CoverLetterTab';
import { EmailsTab } from './EmailsTab';
import { PrepTab } from './PrepTab';
import { NotesTab } from './NotesTab';
import { ContactsEventsTab } from './ContactsEventsTab';
import { LearningTasksTab } from './LearningTasksTab';
import type { Job } from '../../types';

interface JobDetailViewProps {
  job: Job;
}

export function JobDetailView({ job }: JobDetailViewProps) {
  const { selectJob, updateJob, deleteJob, settings } = useAppStore();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    await updateJob(job.id, { status: newStatus });
  };

  const handleDelete = async () => {
    await deleteJob(job.id);
  };

  const handleClose = () => selectJob(null);

  const currentStatus = settings.statuses.find((s) => s.name === job.status);

  return (
    <>
      <SlideOverPanel
        isOpen={true}
        onClose={handleClose}
        size="xl"
      >
        {/* Custom Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-surface sticky top-0 z-10">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-heading-lg text-primary truncate">
              {job.company}
            </h1>
            <p className="font-body text-sm text-foreground-muted truncate">{job.title}</p>
          </div>

          {/* Status Dropdown */}
          <select
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-foreground font-body focus:outline-none focus:ring-2 focus:ring-primary"
            style={currentStatus ? { borderColor: currentStatus.color } : undefined}
          >
            {settings.statuses.map((status) => (
              <option key={status.id} value={status.name}>
                {status.name}
              </option>
            ))}
          </select>

          <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="text-danger">
            <Trash2 className="w-4 h-4" />
          </Button>

          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-foreground-muted hover:bg-surface-raised hover:text-foreground transition-colors duration-fast"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="px-6 pt-4 border-b border-border">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="resume">Resume Fit</TabsTrigger>
                <TabsTrigger value="cover">Cover Letter</TabsTrigger>
                <TabsTrigger value="emails">Emails</TabsTrigger>
                <TabsTrigger value="prep">Prep & Q&A</TabsTrigger>
                <TabsTrigger value="learning">Learning</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="contacts">Contacts & Events</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="overview">
                <OverviewTab job={job} />
              </TabsContent>
              <TabsContent value="resume">
                <ResumeFitTab job={job} />
              </TabsContent>
              <TabsContent value="cover">
                <CoverLetterTab job={job} />
              </TabsContent>
              <TabsContent value="emails">
                <EmailsTab job={job} />
              </TabsContent>
              <TabsContent value="prep">
                <PrepTab job={job} />
              </TabsContent>
              <TabsContent value="learning">
                <LearningTasksTab job={job} />
              </TabsContent>
              <TabsContent value="notes">
                <NotesTab job={job} />
              </TabsContent>
              <TabsContent value="contacts">
                <ContactsEventsTab job={job} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SlideOverPanel>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Delete "${job.title}" at ${job.company}? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </>
  );
}
```

**Step 2: Verify job detail slides in from right**

Run: `npm run dev`
Click on a job card
Expected: Job detail slides in from right, board visible (dimmed) behind

**Step 3: Commit**

```bash
git add src/components/JobDetail/JobDetailView.tsx
git commit -m "feat: convert JobDetailView to slide-over panel"
```

---

## Phase 5: Update JobCard with New Styles

### Task 5.1: Refresh JobCard Component

**Files:**
- Modify: `src/components/Board/JobCard.tsx`

**Step 1: Update JobCard with new design**

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { Job } from '../../types';
import { Badge } from '../ui';
import { formatTimeAgo, getJobTypeIcon, getGradeColor } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

interface JobCardProps {
  job: Job;
  onClick: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const jobType = job.summary?.jobType || 'unknown';
  const grade = job.resumeAnalysis?.grade;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative bg-surface rounded-card border border-border p-4',
        'hover:shadow-card-hover hover:border-primary/30',
        'transition-all duration-fast ease-out cursor-pointer group',
        isDragging && 'opacity-50 rotate-2 shadow-lg'
      )}
      onClick={onClick}
    >
      {/* Header: Company (teal) + Job Type */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-heading text-primary truncate">
          {job.company}
        </span>
        <div className="flex items-center gap-1 text-foreground-subtle">
          <span className="text-xs">{getJobTypeIcon(jobType)}</span>
          <span className="text-xs font-body capitalize">{jobType}</span>
        </div>
      </div>

      {/* Title */}
      <p className="font-body text-sm text-foreground truncate mb-3">
        {job.title}
      </p>

      {/* Divider */}
      <div className="border-t border-border mb-3" />

      {/* Footer: Grade, Time, Salary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {grade && (
            <Badge className={cn(getGradeColor(grade), 'font-body text-xs font-medium uppercase tracking-tight')}>
              {grade}
            </Badge>
          )}
          <span className="font-body text-xs text-foreground-subtle">
            {formatTimeAgo(new Date(job.dateAdded))}
          </span>
        </div>
        {job.summary?.salary && (
          <span className="font-body text-xs text-foreground-muted truncate max-w-[80px]">
            {job.summary.salary}
          </span>
        )}
      </div>

      {/* Drag Handle - 6 dots pattern, left edge */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 p-1',
          'opacity-0 group-hover:opacity-100 transition-opacity duration-fast',
          'cursor-grab active:cursor-grabbing'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4 text-foreground-subtle" />
      </div>
    </div>
  );
}
```

**Step 2: Verify card styling**

Run: `npm run dev`
Expected: Cards have 12px radius, company in teal, drag handle on left

**Step 3: Commit**

```bash
git add src/components/Board/JobCard.tsx
git commit -m "feat: update JobCard with new visual design"
```

---

## Phase 6: Final Polish

### Task 6.1: Update Global Typography Classes

**Files:**
- Modify: `src/index.css`

**Step 1: Add typography utility classes**

Add after the existing `@layer components`:

```css
@layer components {
  /* Text utility classes (shorthand aliases) */
  .text-muted {
    @apply text-foreground-muted;
  }

  .text-tertiary {
    @apply text-foreground-subtle;
  }

  .text-label {
    @apply text-foreground-muted text-xs font-medium uppercase tracking-wide;
  }

  /* Typography presets */
  .font-display {
    font-family: 'DM Sans', system-ui, sans-serif;
  }

  .font-body {
    font-family: 'Source Sans 3', system-ui, sans-serif;
  }
}
```

**Step 2: Update scrollbar colors**

Update scrollbar CSS to use warm grays:

```css
::-webkit-scrollbar-thumb {
  background: #E5E4E1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9C9C96;
}

.dark ::-webkit-scrollbar-thumb {
  background: #3A3A36;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #6B6B66;
}
```

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add typography utilities and update scrollbar colors"
```

---

### Task 6.2: Run Full Build and Lint

**Files:**
- None (verification only)

**Step 1: Run TypeScript check**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No lint errors (fix any that appear)

**Step 3: Manual visual QA**

Run: `npm run dev`
Check:
- [ ] Sidebar appears on left, expands on hover
- [ ] Board shows with simplified header
- [ ] Job cards have new styling (teal company name, rounded corners)
- [ ] Clicking card opens slide-over from right
- [ ] Dark mode toggle works (in sidebar)
- [ ] All buttons have new hover/active animations

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: navigation and visual refresh complete"
```

---

## Summary

| Phase | Tasks | Key Deliverables |
|-------|-------|------------------|
| 1. Foundation | 1.1-1.4 | Color tokens, fonts, Tailwind config, Button update |
| 2. Navigation | 2.1-2.3 | SlideOverPanel, Sidebar, App layout integration |
| 3. Board | 3.1 | Simplified header |
| 4. Job Detail | 4.1 | Slide-over conversion |
| 5. Cards | 5.1 | JobCard visual refresh |
| 6. Polish | 6.1-6.2 | Typography utils, final QA |

**Total tasks:** 10 discrete tasks across 6 phases
