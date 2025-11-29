# Future Enhancements

This document tracks planned features and improvements for Job Hunt Buddy. Use this to prioritize development and track ideas.

## High Priority

### Calendar Integration
- Sync interviews to Google Calendar / Outlook
- Set reminders for follow-ups
- Track interview schedules within the app

### Email Templates
- Generate follow-up emails after interviews
- Thank you note templates
- Withdrawal/acceptance templates
- Customizable with job context

## Medium Priority

### Interviewer Profile Analysis
- User pastes interviewer's LinkedIn profile info (manually copied)
- AI analyzes their background, experience, and interests
- Generates likely interview questions based on interviewer's expertise
- User can add more context or search for additional info
- Avoids legal/TOS issues by not scraping

### Analytics Dashboard
- Track applications over time
- Success rate by company/role type
- Time-to-response metrics
- Funnel visualization (Applied -> Offer)

### Multiple Resume Profiles
- Different resumes for different job types
- Quick switch between profiles
- Track which resume used for each application

### Job Comparison View
- Side-by-side comparison of multiple jobs
- Compare requirements, salary, benefits
- Decision matrix with weighted criteria

### Enhanced Notes
- Rich text editor (markdown support)
- Attach files/images
- Link notes to timeline events
- Search across all notes

## Low Priority / Nice to Have

### LinkedIn Integration
- Import job postings directly
- Sync connections as contacts
- Track recruiter messages

### Salary Research
- Integrate salary data from external APIs (Glassdoor, Levels.fyi)
- Compare offer to market rates
- Negotiation suggestions

### Collaborative Features
- Share job boards with others
- Get feedback from mentors
- Team job hunting support

### Mobile App
- React Native version
- Sync with desktop
- Push notifications for updates

### AI Improvements
- Mock interview practice with voice
- Video interview tips
- Company culture analysis
- Interview question prediction based on role

## Completed

- [x] Browser Extension (one-click JD capture from LinkedIn, Indeed, Greenhouse, Lever)
- [x] Cover Letter Chat (iterative refinement with AI)
- [x] More Responsive AI Chat (optimistic UI + ThinkingBubble animation)
- [x] Interactive Resume Tailoring (split-pane chat + preview, auto-tailor, re-grading)
- [x] Kanban drag & drop between swim lanes (cross-column movement)
- [x] Replace browser prompts with styled modals (ConfirmModal + Toast notifications)
- [x] Basic Kanban board with drag & drop
- [x] AI-powered JD analysis
- [x] Resume grading with match score
- [x] Cover letter generation
- [x] Q&A chat for interview prep
- [x] Contacts and notes tracking
- [x] Timeline events
- [x] Dark mode
- [x] Export/Import data
- [x] Model selection in settings
- [x] PDF resume parsing

## Technical Debt

- [ ] Add unit tests for utility functions
- [ ] Add integration tests for AI service
- [ ] Add E2E tests for critical flows
- [ ] Improve error handling and user feedback
- [ ] Add loading skeletons for better UX
- [ ] Optimize bundle size
- [ ] Add PWA support for offline access
- [ ] Consider server component for API key security

## Contributing

To propose a new feature:
1. Add it to the appropriate priority section
2. Include a brief description
3. Note any dependencies or blockers
4. Move to "Completed" when done
