import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { cn } from '../../utils/helpers';

type ConfirmVariant = 'danger' | 'warning' | 'default';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: typeof Trash2; iconBg: string; iconColor: string; buttonVariant: 'primary' | 'danger' }> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    buttonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    buttonVariant: 'primary',
  },
  default: {
    icon: HelpCircle,
    iconBg: 'bg-slate-100 dark:bg-slate-700',
    iconColor: 'text-slate-600 dark:text-slate-400',
    buttonVariant: 'primary',
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex flex-col items-center text-center">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-4', config.iconBg)}>
            <Icon className={cn('w-6 h-6', config.iconColor)} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-foreground-muted mb-6">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            className="flex-1"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
