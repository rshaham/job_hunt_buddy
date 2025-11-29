import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/helpers';
import type { ToastVariant } from '../../stores/toastStore';

interface ToastProps {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
}

const variantStyles: Record<ToastVariant, { bg: string; icon: typeof CheckCircle; iconColor: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-500',
  },
};

export function Toast({ message, variant, onClose }: ToastProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
        'animate-in slide-in-from-right-full duration-300',
        styles.bg
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', styles.iconColor)} />
      <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
