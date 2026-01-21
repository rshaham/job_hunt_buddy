export function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span
            className="w-2 h-2 bg-foreground-subtle rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-foreground-subtle rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-foreground-subtle rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}
