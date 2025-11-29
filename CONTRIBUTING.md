# Contributing to Job Hunt Buddy

Thank you for your interest in contributing to Job Hunt Buddy! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Claude API key from [Anthropic](https://console.anthropic.com/) (for testing AI features)

### Development Setup

1. Fork the repository on GitHub

2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/job_hunt_buddy.git
   cd job_hunt_buddy
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

6. Add your Claude API key in Settings to test AI features

## Code Style

### TypeScript

- We use TypeScript with strict mode enabled
- All new code should be properly typed (no `any` types)
- Use interfaces for object shapes, defined in `src/types/index.ts`

### React Components

- Functional components with hooks
- Keep components focused and single-responsibility
- Reusable UI components go in `src/components/ui/`
- Feature components go in their own folders under `src/components/`

### Styling

- We use Tailwind CSS for all styling
- Follow existing patterns for dark mode support (`dark:` prefix)
- Use the existing color scheme (see `CLAUDE.md` for details)

### File Organization

```
src/
├── components/     # React components
├── services/       # API and database logic
├── stores/         # Zustand state management
├── types/          # TypeScript interfaces
└── utils/          # Helper functions and prompts
```

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- Be descriptive but brief
- Reference issues when applicable (`Fix #123`)

### Pull Requests

1. Create a new branch from `main`
2. Make your changes
3. Run the linter: `npm run lint`
4. Run the build: `npm run build`
5. Push to your fork
6. Open a Pull Request with:
   - Clear description of changes
   - Screenshots for UI changes
   - Reference to any related issues

## Feature Ideas

Check out [docs/FUTURE_ENHANCEMENTS.md](docs/FUTURE_ENHANCEMENTS.md) for a list of planned features and ideas. Feel free to:

- Pick up an existing idea and implement it
- Propose new features by opening an issue first
- Improve existing features

### High-Priority Areas

- Browser extension for one-click job capture
- Analytics dashboard for application tracking
- Additional AI provider support (OpenAI, etc.)
- Calendar integration

## Reporting Issues

When reporting bugs, please include:

- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

## Questions?

Feel free to open an issue for any questions about contributing. We're happy to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
