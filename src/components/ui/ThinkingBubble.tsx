export function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          />
          <span
            className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          />
        </div>
      </div>
    </div>
  );
}
