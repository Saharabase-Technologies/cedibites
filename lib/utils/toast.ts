/**
 * Simple toast notification utility
 * Can be replaced with a library like react-hot-toast or sonner
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-center' | 'top-left' | 'bottom-right' | 'bottom-center' | 'bottom-left';
}

class ToastManager {
  private container: HTMLDivElement | null = null;

  private getContainer(): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private show(message: string, type: ToastType, options: ToastOptions = {}) {
    const { duration = 3000 } = options;
    const container = this.getContainer();

    const toast = document.createElement('div');
    toast.className = `
      px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium
      transform transition-all duration-300 ease-in-out
      translate-x-0 opacity-100
      ${type === 'success' ? 'bg-green-600' : ''}
      ${type === 'error' ? 'bg-red-600' : ''}
      ${type === 'info' ? 'bg-blue-600' : ''}
      ${type === 'warning' ? 'bg-yellow-600' : ''}
      max-w-sm
    `;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);

    // Remove after duration
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        container.removeChild(toast);
        if (container.children.length === 0) {
          document.body.removeChild(container);
          this.container = null;
        }
      }, 300);
    }, duration);
  }

  success(message: string, options?: ToastOptions) {
    this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions) {
    this.show(message, 'error', options);
  }

  info(message: string, options?: ToastOptions) {
    this.show(message, 'info', options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show(message, 'warning', options);
  }
}

export const toast = new ToastManager();
