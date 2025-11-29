import { useToastStore } from '../../stores/toastStore';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, hideToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
}
