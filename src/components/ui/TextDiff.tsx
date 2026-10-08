import { useMemo } from 'react';
import * as Diff from 'diff';

interface TextDiffProps {
  original: string;
  updated: string;
}

// Word-level diff with additions in green and removals struck through in red
export function TextDiff({ original, updated }: TextDiffProps): JSX.Element {
  const diffParts = useMemo(() => Diff.diffWords(original, updated), [original, updated]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
      {diffParts.map((part, index) => (
        <span
          key={index}
          className={
            part.added
              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
              : part.removed
              ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through'
              : ''
          }
        >
          {part.value}
        </span>
      ))}
    </div>
  );
}
