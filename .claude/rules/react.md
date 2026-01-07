---
paths: src/components/**/*.tsx
---

# React Component Rules

## Component Structure

- Prefer functional components with hooks
- Use explicit TypeScript interfaces for props
- Export named functions (not default exports) for consistency
- Keep components small and focused (single responsibility)

## Styling

- Use Tailwind CSS exclusively (no CSS modules or inline styles objects)
- Support dark mode with `dark:` prefix on color classes
- Use `clsx()` for conditional class combinations
- Accept `className` prop for external customization

## State Management

- Use Zustand store for global state (`useAppStore`)
- Use local `useState` for component-specific UI state
- Access store outside React with `useAppStore.getState()`

## Patterns

```typescript
// Good: Explicit props interface
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

// Good: Dark mode support
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">

// Good: Conditional classes
<button className={clsx(
  'px-4 py-2 rounded',
  variant === 'primary' && 'bg-primary text-white',
  variant === 'secondary' && 'bg-gray-200 dark:bg-gray-700'
)}>
```

## Avoid

- `any` type - use proper TypeScript types
- Inline arrow functions in JSX for callbacks (extract to useCallback)
- Deep component nesting - extract to separate files
- Direct DOM manipulation - use React patterns
