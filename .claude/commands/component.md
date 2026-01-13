---
argument-hint: [ComponentName]
description: Generate a new React component following project patterns
---

Create a new React component named `$ARGUMENTS` following these project patterns:

## Location
- UI primitives: `src/components/ui/$ARGUMENTS.tsx`
- Feature components: `src/components/$ARGUMENTS.tsx` or appropriate subdirectory

## Requirements
- Use TypeScript with explicit prop interfaces (`interface ${ARGUMENTS}Props`)
- Use Tailwind CSS for styling with dark mode support (`dark:` prefix)
- Use `clsx()` for conditional classes
- Support `className` prop for customization
- Include JSDoc comment describing the component's purpose

## Example Pattern (from existing components)

```typescript
import { clsx } from 'clsx';

interface ${ARGUMENTS}Props {
  className?: string;
  children?: React.ReactNode;
}

export function $ARGUMENTS({ className, children }: ${ARGUMENTS}Props) {
  return (
    <div className={clsx('base-classes dark:dark-classes', className)}>
      {children}
    </div>
  );
}
```

Review existing components in `src/components/ui/` for reference patterns.
