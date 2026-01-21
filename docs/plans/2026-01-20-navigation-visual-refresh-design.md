# Navigation & Visual Refresh Design

**Date:** 2026-01-20
**Status:** Approved

## Overview

This design addresses two major improvements to Job Hunt Buddy:

1. **Navigation overhaul** — Replace modal-heavy UX with a persistent sidebar and slide-over panels
2. **Visual refresh** — New typography, color palette, and animations for a calm/confident aesthetic

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Navigation pattern | Left sidebar (ultra-minimal, 4-5 icons) |
| Mood | Calm & confident foundation with energy for key moments |
| Typography | Humanist & warm (Switzer headings, Source Sans 3 body) |
| Colors | Sage/teal primary with warm neutrals |
| Animations | Subtle & smooth, pronounced feedback for key moments |

---

## Section 1: Sidebar Navigation Structure

### Layout

The app shifts from modal-heavy to a persistent left sidebar. The sidebar is a narrow rail (64px collapsed) that can expand on hover or click to show labels (200px expanded).

### Sidebar items (top to bottom)

| Icon | Label | Behavior |
|------|-------|----------|
| Grid/Board icon | Jobs | Shows Kanban board (default view) |
| Search/Compass icon | Find Jobs | Expands to panel with Job Finder + Batch Scanner tabs |
| Message/Sparkle icon | Coach | Opens Career Coach as slide-over panel from right |
| Gear icon | Settings | Opens Settings as slide-over panel from right |

### Bottom of sidebar

- Theme toggle (sun/moon icon)
- Help menu (?) that contains: Getting Started, Feature Guide, Privacy, Keyboard Shortcuts

### Behavior

- Collapsed by default to maximize board space
- Hovering expands to show labels (with slight delay to avoid flickering)
- Active item highlighted with sage/teal accent
- On mobile: sidebar becomes bottom tab bar with same 4 items

### Job Detail view

- When a job is selected, it slides in as a panel from the right (60-70% width)
- Board remains visible but dimmed on the left
- This replaces the current full-screen takeover

---

## Section 2: Color System

### Primary palette (Sage/Teal)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | `#4A9E8F` (muted teal) | `#5DB8A7` | Buttons, active states, links |
| `primary-hover` | `#3D8577` | `#6FC4B5` | Button hover states |
| `primary-subtle` | `#E8F5F2` | `#1A2F2B` | Selected backgrounds, badges |

### Neutral palette (Warm grays)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `#FAFAF8` (warm white) | `#1C1C1A` | Page background |
| `surface` | `#FFFFFF` | `#252523` | Cards, panels, modals |
| `surface-raised` | `#F5F5F3` | `#2E2E2B` | Sidebar, elevated elements |
| `border` | `#E5E4E1` | `#3A3A36` | Dividers, card borders |
| `text-primary` | `#2C2C2A` | `#F5F5F3` | Headings, important text |
| `text-secondary` | `#6B6B66` | `#A3A39E` | Body text, descriptions |
| `text-muted` | `#9C9C96` | `#6B6B66` | Placeholders, hints |

### Status colors (slightly muted to fit calm aesthetic)

| Status | Color | Usage |
|--------|-------|-------|
| Interested | `#8B7EC8` (soft purple) | Column header, badges |
| Applied | `#5B93D4` (calm blue) | Column header, badges |
| Interviewing | `#D4A056` (warm amber) | Column header, badges |
| Offer | `#5BAD7A` (soft green) | Column header, badges |
| Rejected | `#8C8C88` (neutral gray) | Column header, badges |

### Accent for energy moments

- Success actions: `#5BAD7A` with subtle pulse animation
- Celebrations: Warm gold `#D4A056` for milestone moments

---

## Section 3: Typography System

### Font pairing

| Role | Font | Weight | Fallback |
|------|------|--------|----------|
| Headings | **Switzer** | 600 (semibold), 500 (medium) | system-ui, sans-serif |
| Body | **Source Sans 3** | 400 (regular), 500 (medium) | system-ui, sans-serif |

*Switzer is a free humanist sans-serif with subtle warmth. Source Sans 3 is highly legible and pairs naturally.*

### Type scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `display` | 28px | Switzer 600 | 1.2 | Page titles ("Your Jobs") |
| `heading-lg` | 20px | Switzer 600 | 1.3 | Job titles in detail view |
| `heading` | 16px | Switzer 500 | 1.4 | Section headers, card titles |
| `heading-sm` | 14px | Switzer 500 | 1.4 | Tab labels, sidebar items |
| `body` | 14px | Source Sans 400 | 1.5 | Descriptions, paragraphs |
| `body-sm` | 13px | Source Sans 400 | 1.5 | Secondary info, metadata |
| `caption` | 12px | Source Sans 500 | 1.4 | Badges, labels, timestamps |

### Hierarchy principles

- Company names: `heading-lg` in teal for emphasis
- Job titles: `heading` in primary text color
- Metadata (salary, location, date): `body-sm` in muted text
- Section labels: `caption` uppercase with letter-spacing

### Special treatments

- Job card company name: Switzer 500, slightly larger than title, creates scannable hierarchy
- Grade badges: Source Sans 500, all-caps, tight letter-spacing

---

## Section 4: Animations & Micro-interactions

### Base timing & easing

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `instant` | 100ms | ease-out | Hover states, button presses |
| `fast` | 150ms | ease-out | Tooltips, small reveals |
| `normal` | 250ms | cubic-bezier(0.4, 0, 0.2, 1) | Panels, modals, dropdowns |
| `slow` | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | Page transitions, large reveals |

### Navigation animations

| Element | Animation |
|---------|-----------|
| Sidebar expand | Width grows from 64px to 200px over `normal`, items fade in labels |
| Slide-over panels | Slide in from right with subtle fade, backdrop dims to 40% opacity |
| Job detail open | Slides in from right (60% width), board content shifts left slightly |
| Tab switching | Content crossfades over `fast`, no jarring cuts |

### Interaction feedback

| Action | Feedback |
|--------|----------|
| Button hover | Background lightens, subtle scale(1.02) |
| Button press | scale(0.98) for tactile feel |
| Card hover | Soft shadow elevation, border tint with primary |
| Card drag | Slight rotation (2deg), shadow grows, opacity 0.9 |
| Card drop | Gentle bounce settle (scale 1.02 to 1.0) |
| Save/Success | Checkmark fades in with subtle pulse glow on primary color |

### Energy moments (slightly more pronounced)

| Moment | Animation |
|--------|-----------|
| Job moved to "Offer" | Card briefly glows gold, subtle confetti (3-5 particles) |
| Resume grade received | Grade badge scales in with bounce, color pulses once |
| AI response complete | Soft shimmer across the response container |

### Loading states

- Skeleton loaders with subtle shimmer (warm gray, not cold)
- AI thinking: gentle pulsing dot animation in teal

---

## Section 5: Component Updates

### New components to create

| Component | Purpose |
|-----------|---------|
| `Sidebar.tsx` | Collapsible nav rail with 4 items + help menu |
| `SlideOverPanel.tsx` | Reusable slide-in panel (replaces modals for Settings, Coach, Job Detail) |
| `BottomTabBar.tsx` | Mobile navigation (same 4 items as sidebar) |

### Sidebar (new component)

- Collapsed: 64px wide, dark surface (`surface-raised`), icons centered vertically
- Icons: 24px, `text-secondary` default, `primary` when active
- Active indicator: 3px rounded vertical bar on left edge in `primary`
- Hover: icon shifts to `text-primary`, background pill appears
- Expanded: labels fade in to right of icons, Switzer 500

### Job cards (refreshed)

- Corners: 12px radius (warmer than current sharp corners)
- Border: 1px `border` color, subtle shadow on hover
- Padding: 16px
- Layout: Company name top (teal, `heading`), job title below (`body`, `text-primary`)
- Metadata row: Location + salary in `body-sm` muted, separated by dot
- Grade badge: top-right corner, soft rounded rectangle, status color background
- Drag handle: 6 dots pattern, only visible on hover, left edge

### Slide-over panels (new pattern)

- Width: 480px for Settings/Coach, 60% for Job Detail
- Header: sticky, `surface` background, title + close button (X)
- Shadow: large soft shadow on left edge for depth
- Backdrop: board dims to 60% opacity, not blurred (keeps context visible)

### Buttons (refreshed)

- Primary: `primary` background, white text, 8px radius, 500 weight
- Secondary: transparent with `primary` text and 1px border
- Ghost: transparent, `text-secondary`, no border
- All: 10px vertical / 16px horizontal padding, smooth hover transitions

### Input fields

- 8px radius, `surface` background, 1px `border`
- Focus: border becomes `primary`, subtle glow ring
- Labels: `caption` style, `text-secondary`, above field

---

## Section 6: Implementation Scope

### Components to update

| Component | Changes |
|-----------|---------|
| `App.tsx` | New layout with sidebar, remove modal rendering for Settings/Coach |
| `BoardView.tsx` | Remove header nav items that move to sidebar, adjust width for sidebar |
| `JobDetailView.tsx` | Convert from full-screen overlay to slide-over panel |
| `JobCard.tsx` | New styling, typography, hover states, drag handle visibility |
| `Button.tsx` | Updated colors, radius, padding, hover animations |
| `Modal.tsx` | Keep for confirmations/dialogs, but most uses migrate to SlideOverPanel |
| `SettingsModal.tsx` | Rename to `SettingsPanel.tsx`, adapt to slide-over layout |
| `CareerCoachModal.tsx` | Rename to `CoachPanel.tsx`, adapt to slide-over layout |

### CSS/styling changes

| File | Changes |
|------|---------|
| `tailwind.config.js` | New color tokens, font families, animation utilities |
| `index.css` | CSS custom properties for semantic colors, font imports |

### Assets to add

- Switzer font (self-hosted or Google Fonts alternative)
- Source Sans 3 (Google Fonts)
- Updated icon set if needed (current icons may work)

### Files to consolidate/remove

- `GettingStartedModal.tsx` → moves into Settings panel as "Help" section
- `FeatureGuideModal.tsx` → moves into help menu dropdown
- `PrivacyModal.tsx` → moves into help menu or Settings
- `JobFinderModal.tsx` + `BatchScannerModal.tsx` → combine into "Find Jobs" panel with tabs
